using Nooks.Core.Dtos;

namespace Nooks.Core.Abstractions;

public interface IGeocodingService
{
    /// <summary>Cherche une ville ou un lieu et renvoie ses coordonnées et son cadre.</summary>
    Task<IReadOnlyList<GeocodeResultDto>> SearchAsync(string query, CancellationToken cancellationToken);
}
