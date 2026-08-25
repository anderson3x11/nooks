using Nooks.Core.Dtos;
using Nooks.Core.Entities;

namespace Nooks.Core.Abstractions;

public interface IPlaceRepository
{
    /// <summary>Lieux approuvés contenus dans le rectangle demandé, filtres appliqués.</summary>
    Task<IReadOnlyList<PlaceSummaryDto>> SearchAsync(PlaceSearchQuery query, CancellationToken cancellationToken);

    Task<PlaceDetailDto?> GetDetailAsync(Guid id, bool includeUnapproved, CancellationToken cancellationToken);

    /// <summary>Charge l'agrégat complet (notes et photos) pour le modifier.</summary>
    Task<Place?> GetForUpdateAsync(Guid id, CancellationToken cancellationToken);

    Task<IReadOnlyList<PlaceSummaryDto>> GetByStatusAsync(PlaceStatus status, CancellationToken cancellationToken);

    /// <summary>Lieux déjà connus autour d'un point, pour repérer les redites.</summary>
    Task<IReadOnlyList<PlaceSummaryDto>> FindNearbyAsync(
        double latitude,
        double longitude,
        double radiusInMeters,
        CancellationToken cancellationToken);

    Task AddAsync(Place place, CancellationToken cancellationToken);

    /// <summary>Suppression définitive d'un lieu et de tout ce qui s'y rattache.</summary>
    Task DeleteAsync(Place place, CancellationToken cancellationToken);

    /// <summary>Avis vus depuis la modération, les plus récents d'abord.</summary>
    Task<IReadOnlyList<AdminRatingDto>> ListRatingsAsync(bool removedOnly, int limit, CancellationToken cancellationToken);

    /// <summary>Chiffres et derniers lieux, pour la page d'accueil.</summary>
    Task<HomeSummaryDto> GetHomeSummaryAsync(int latestCount, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
