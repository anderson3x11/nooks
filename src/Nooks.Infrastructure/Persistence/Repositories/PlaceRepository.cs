using Nooks.Core.Abstractions;
using Nooks.Core.Common;
using Nooks.Core.Dtos;
using Nooks.Core.Entities;
using Nooks.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;

namespace Nooks.Infrastructure.Persistence.Repositories;

public sealed class PlaceRepository(NooksDbContext context) : IPlaceRepository
{
    public async Task<IReadOnlyList<PlaceSummaryDto>> SearchAsync(PlaceSearchQuery query, CancellationToken cancellationToken)
    {
        var polygon = query.Bounds.ToPolygon();

        var places = context.Places
            .AsNoTracking()
            .Where(p => p.Status == PlaceStatus.Approved)
            .Where(p => p.Location.Intersects(polygon));

        if (query.Categories.Count > 0)
        {
            var categories = query.Categories.ToArray();
            places = places.Where(p => categories.Contains(p.Category));
        }

        if (query.MinRating is { } minRating)
        {
            places = places.Where(p => p.AverageRating >= minRating);
        }

        if (!string.IsNullOrWhiteSpace(query.Text))
        {
            var pattern = $"%{query.Text.Trim()}%";
            places = places.Where(p => EF.Functions.ILike(p.Name, pattern) || EF.Functions.ILike(p.Description, pattern));
        }

        var rows = await places
            .OrderByDescending(p => p.AverageRating)
            .ThenByDescending(p => p.RatingCount)
            .Take(PlaceSearchQuery.MaxResults)
            .Select(p => new SummaryRow(
                p.Id,
                p.Name,
                p.Category,
                p.Location.Y,
                p.Location.X,
                p.City,
                p.AverageRating,
                p.RatingCount,
                p.Status,
                p.CreatedAt,
                p.Photos.Where(photo => photo.IsCover).Select(photo => photo.ThumbnailFileName).FirstOrDefault(),
                p.SuspectedDuplicate))
            .ToListAsync(cancellationToken);

        return [.. rows.Select(ToSummary)];
    }

    public async Task<IReadOnlyList<PlaceSummaryDto>> GetByStatusAsync(PlaceStatus status, CancellationToken cancellationToken)
    {
        var rows = await context.Places
            .AsNoTracking()
            .Where(p => p.Status == status)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new SummaryRow(
                p.Id,
                p.Name,
                p.Category,
                p.Location.Y,
                p.Location.X,
                p.City,
                p.AverageRating,
                p.RatingCount,
                p.Status,
                p.CreatedAt,
                p.Photos.Where(photo => photo.IsCover).Select(photo => photo.ThumbnailFileName).FirstOrDefault(),
                p.SuspectedDuplicate))
            .ToListAsync(cancellationToken);

        return [.. rows.Select(ToSummary)];
    }

    public async Task<IReadOnlyList<PlaceSummaryDto>> FindNearbyAsync(
        double latitude,
        double longitude,
        double radiusInMeters,
        CancellationToken cancellationToken)
    {
        // Un degré de latitude vaut environ 111 320 m ; en longitude, cela se resserre
        // vers les pôles. On encadre large en degrés, puis on affine au mètre en mémoire.
        var latitudeSpan = radiusInMeters / 111_320d;
        var longitudeSpan = latitudeSpan / Math.Max(0.01, Math.Cos(latitude * Math.PI / 180));

        var envelope = new GeoBounds(
            longitude - longitudeSpan,
            latitude - latitudeSpan,
            longitude + longitudeSpan,
            latitude + latitudeSpan).ToPolygon();

        var rows = await context.Places
            .AsNoTracking()
            .Where(p => p.Status != PlaceStatus.Rejected)
            .Where(p => p.Location.Intersects(envelope))
            .Select(p => new SummaryRow(
                p.Id,
                p.Name,
                p.Category,
                p.Location.Y,
                p.Location.X,
                p.City,
                p.AverageRating,
                p.RatingCount,
                p.Status,
                p.CreatedAt,
                p.Photos.Where(photo => photo.IsCover).Select(photo => photo.ThumbnailFileName).FirstOrDefault(),
                p.SuspectedDuplicate))
            .ToListAsync(cancellationToken);

        return
        [
            .. rows
                .Where(row => PlaceMatching.DistanceInMeters(latitude, longitude, row.Latitude, row.Longitude) <= radiusInMeters)
                .Select(ToSummary),
        ];
    }

    public async Task<PlaceDetailDto?> GetDetailAsync(Guid id, bool includeUnapproved, CancellationToken cancellationToken)
    {
        var place = await context.Places
            .AsNoTracking()
            .Include(p => p.Photos)
            .Include(p => p.Ratings)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (place is null || (!includeUnapproved && place.Status != PlaceStatus.Approved))
        {
            return null;
        }

        var userIds = place.Ratings.Select(r => r.UserId).Append(place.CreatedByUserId).Distinct().ToArray();
        var displayNames = await context.Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.DisplayName, cancellationToken);

        return new PlaceDetailDto(
            place.Id,
            place.Name,
            place.Description,
            place.Category,
            place.Latitude,
            place.Longitude,
            place.Address,
            place.City,
            place.Country,
            place.Status,
            place.AverageRating,
            place.RatingCount,
            place.CreatedAt,
            Name(displayNames, place.CreatedByUserId),
            place.SuspectedDuplicate,
            [.. place.Photos
                .OrderByDescending(photo => photo.IsCover)
                .ThenBy(photo => photo.CreatedAt)
                .Select(photo => new PlacePhotoDto(
                    photo.Id,
                    PhotoUrls.For(place.Id, photo.FileName),
                    PhotoUrls.For(place.Id, photo.ThumbnailFileName),
                    photo.IsCover))],
            [.. place.Ratings
                .OrderByDescending(rating => rating.UpdatedAt)
                .Select(rating => new PlaceRatingDto(
                    rating.Id,
                    rating.UserId,
                    Name(displayNames, rating.UserId),
                    rating.Stars,
                    rating.Comment,
                    rating.CreatedAt,
                    rating.UpdatedAt,
                    rating.IsEdited))]);
    }

    public Task<Place?> GetForUpdateAsync(Guid id, CancellationToken cancellationToken)
        => context.Places
            .Include(p => p.Photos)
            .Include(p => p.Ratings)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

    public async Task AddAsync(Place place, CancellationToken cancellationToken)
        => await context.Places.AddAsync(place, cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken)
        => context.SaveChangesAsync(cancellationToken);

    private static string Name(IReadOnlyDictionary<Guid, string> displayNames, Guid userId)
        => displayNames.TryGetValue(userId, out var name) ? name : "Membre supprimé";

    private static PlaceSummaryDto ToSummary(SummaryRow row) => new(
        row.Id,
        row.Name,
        row.Category,
        row.Latitude,
        row.Longitude,
        row.City,
        row.AverageRating,
        row.RatingCount,
        row.Status,
        row.CreatedAt,
        row.CoverThumbnailFileName is null ? null : PhotoUrls.For(row.Id, row.CoverThumbnailFileName),
        row.SuspectedDuplicate);

    /// <summary>Projection intermédiaire : l'URL des photos se construit en mémoire, pas en SQL.</summary>
    private sealed record SummaryRow(
        Guid Id,
        string Name,
        PlaceCategory Category,
        double Latitude,
        double Longitude,
        string City,
        double AverageRating,
        int RatingCount,
        PlaceStatus Status,
        DateTimeOffset CreatedAt,
        string? CoverThumbnailFileName,
        bool SuspectedDuplicate);
}
