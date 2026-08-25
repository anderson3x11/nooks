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

    Task AddAsync(Place place, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
