using Nooks.Core.Common;
using Nooks.Core.Entities;

namespace Nooks.Core.Dtos;

/// <summary>Critères de recherche envoyés par la carte.</summary>
public sealed record PlaceSearchQuery(
    GeoBounds Bounds,
    IReadOnlyCollection<PlaceCategory> Categories,
    double? MinRating,
    string? Text)
{
    /// <summary>Garde-fou : au-delà, on ne renvoie rien de plus, la carte n'en affichera pas autant.</summary>
    public const int MaxResults = 500;
}

/// <summary>Version allégée, celle qui alimente les marqueurs de la carte.</summary>
public sealed record PlaceSummaryDto(
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
    string? CoverThumbnailUrl);

public sealed record PlaceDetailDto(
    Guid Id,
    string Name,
    string Description,
    PlaceCategory Category,
    double Latitude,
    double Longitude,
    string? Address,
    string City,
    string Country,
    PlaceStatus Status,
    double AverageRating,
    int RatingCount,
    DateTimeOffset CreatedAt,
    string CreatedByDisplayName,
    IReadOnlyList<PlacePhotoDto> Photos,
    IReadOnlyList<PlaceRatingDto> Ratings);

public sealed record PlacePhotoDto(Guid Id, string Url, string ThumbnailUrl, bool IsCover);

public sealed record PlaceRatingDto(
    Guid Id,
    Guid UserId,
    string UserDisplayName,
    int Stars,
    string? Comment,
    DateTimeOffset UpdatedAt);
