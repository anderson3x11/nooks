using Microsoft.EntityFrameworkCore;
using Nooks.Core.Abstractions;
using Nooks.Core.Common;
using Nooks.Core.Dtos;
using Nooks.Core.Entities;
using Nooks.Infrastructure.Identity;
using Nooks.Infrastructure.Storage;

namespace Nooks.Infrastructure.Persistence.Repositories;

public sealed class ProfileRepository(NooksDbContext context) : IProfileRepository
{
    /// <summary>Nombre de lieux et d'avis affichés sur une page de profil.</summary>
    private const int PageSize = 24;

    public async Task<MemberProfileDto?> GetProfileAsync(Guid userId, bool includePrivate, CancellationToken cancellationToken)
    {
        var user = await context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
        {
            return null;
        }

        // Le tri se fait avant la projection : EF ne sait pas ordonner sur un objet projeté.
        var places = await context.Places
            .AsNoTracking()
            .Where(p => p.CreatedByUserId == userId && p.Status == PlaceStatus.Approved)
            .OrderByDescending(p => p.CreatedAt)
            .Take(PageSize)
            .Select(ProjectSummary())
            .ToListAsync(cancellationToken);

        var placeCount = await context.Places
            .CountAsync(p => p.CreatedByUserId == userId && p.Status == PlaceStatus.Approved, cancellationToken);

        var reviews = await context.Ratings
            .AsNoTracking()
            .Where(r => r.UserId == userId)
            .Where(r => includePrivate || r.RemovedAt == null)
            .OrderByDescending(r => r.UpdatedAt)
            .Take(PageSize)
            .Join(
                context.Places,
                rating => rating.PlaceId,
                place => place.Id,
                (rating, place) => new MemberReviewDto(
                    rating.Id,
                    place.Id,
                    place.Name,
                    place.City,
                    rating.Stars,
                    rating.Comment,
                    rating.UpdatedAt,
                    rating.UpdatedAt > rating.CreatedAt,
                    rating.RemovedAt != null))
            .ToListAsync(cancellationToken);

        var reviewCount = await context.Ratings.CountAsync(r => r.UserId == userId && r.RemovedAt == null, cancellationToken);
        var favoriteCount = await context.Favorites.CountAsync(f => f.UserId == userId, cancellationToken);

        // Les favoris ne sont montrés qu'à leur propriétaire : c'est une liste d'envies,
        // pas une contribution publique.
        var favorites = includePrivate
            ? await ListFavoritesAsync(userId, cancellationToken)
            : [];

        return new MemberProfileDto(
            user.Id,
            user.DisplayName,
            user.Bio,
            user.AvatarFileName is null ? null : PhotoUrls.ForAvatar(user.Id, user.AvatarFileName),
            user.CreatedAt,
            reviewCount,
            placeCount,
            favoriteCount,
            [.. places.Select(ToSummary)],
            favorites,
            reviews);
    }

    public async Task<bool> ToggleFavoriteAsync(Guid userId, Guid placeId, CancellationToken cancellationToken)
    {
        var existing = await context.Favorites.FindAsync([userId, placeId], cancellationToken);

        if (existing is not null)
        {
            context.Favorites.Remove(existing);
            await context.SaveChangesAsync(cancellationToken);
            return false;
        }

        if (!await context.Places.AnyAsync(p => p.Id == placeId, cancellationToken))
        {
            throw new DomainException("Ce lieu n'existe pas.");
        }

        await context.Favorites.AddAsync(Favorite.Create(userId, placeId), cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public Task<bool> IsFavoriteAsync(Guid userId, Guid placeId, CancellationToken cancellationToken)
        => context.Favorites.AnyAsync(f => f.UserId == userId && f.PlaceId == placeId, cancellationToken);

    public async Task<IReadOnlyList<PlaceSummaryDto>> ListFavoritesAsync(Guid userId, CancellationToken cancellationToken)
    {
        var rows = await context.Favorites
            .AsNoTracking()
            .Where(f => f.UserId == userId)
            .Join(context.Places, favorite => favorite.PlaceId, place => place.Id, (favorite, place) => new { favorite.CreatedAt, place })
            .Where(row => row.place.Status == PlaceStatus.Approved)
            .OrderByDescending(row => row.CreatedAt)
            .Select(row => row.place)
            .Select(ProjectSummary())
            .ToListAsync(cancellationToken);

        return [.. rows.Select(ToSummary)];
    }

    public async Task UpdateProfileAsync(Guid userId, string displayName, string? bio, CancellationToken cancellationToken)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
                   ?? throw new DomainException("Compte introuvable.");

        displayName = displayName.Trim();
        if (displayName.Length is 0 or > AppUser.MaxDisplayNameLength)
        {
            throw new DomainException($"Le pseudo doit faire entre 1 et {AppUser.MaxDisplayNameLength} caractères.");
        }

        bio = string.IsNullOrWhiteSpace(bio) ? null : bio.Trim();
        if (bio is { Length: > AppUser.MaxBioLength })
        {
            throw new DomainException($"La présentation ne peut pas dépasser {AppUser.MaxBioLength} caractères.");
        }

        user.DisplayName = displayName;
        user.Bio = bio;
        await context.SaveChangesAsync(cancellationToken);
    }

    public async Task SetAvatarAsync(Guid userId, string fileName, CancellationToken cancellationToken)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
                   ?? throw new DomainException("Compte introuvable.");

        user.AvatarFileName = fileName;
        await context.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AdminMemberDto>> ListMembersAsync(CancellationToken cancellationToken)
    {
        var adminRoleId = await context.Roles
            .Where(role => role.Name == AppRoles.Admin)
            .Select(role => role.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var adminIds = await context.UserRoles
            .Where(link => link.RoleId == adminRoleId)
            .Select(link => link.UserId)
            .ToListAsync(cancellationToken);

        var rows = await context.Users
            .AsNoTracking()
            .OrderBy(u => u.CreatedAt)
            .Select(u => new
            {
                u.Id,
                u.DisplayName,
                u.Email,
                u.AvatarFileName,
                u.CreatedAt,
                ReviewCount = context.Ratings.Count(r => r.UserId == u.Id && r.RemovedAt == null),
                PlaceCount = context.Places.Count(p => p.CreatedByUserId == u.Id),
            })
            .ToListAsync(cancellationToken);

        return
        [
            .. rows.Select(row => new AdminMemberDto(
                row.Id,
                row.DisplayName,
                row.Email ?? string.Empty,
                row.AvatarFileName is null ? null : PhotoUrls.ForAvatar(row.Id, row.AvatarFileName),
                row.CreatedAt,
                adminIds.Contains(row.Id),
                row.ReviewCount,
                row.PlaceCount)),
        ];
    }

    private static System.Linq.Expressions.Expression<Func<Place, SummaryRow>> ProjectSummary()
        => p => new SummaryRow(
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
            p.SuspectedDuplicate);

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
