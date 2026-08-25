using Nooks.Core.Dtos;

namespace Nooks.Core.Abstractions;

/// <summary>
/// Tout ce qui tourne autour d'un membre : sa page publique, ses favoris,
/// et la liste des comptes pour l'administration.
/// </summary>
public interface IProfileRepository
{
    Task<MemberProfileDto?> GetProfileAsync(Guid userId, bool includePrivate, CancellationToken cancellationToken);

    /// <summary>Bascule le favori et renvoie son nouvel état.</summary>
    Task<bool> ToggleFavoriteAsync(Guid userId, Guid placeId, CancellationToken cancellationToken);

    Task<bool> IsFavoriteAsync(Guid userId, Guid placeId, CancellationToken cancellationToken);

    Task<IReadOnlyList<PlaceSummaryDto>> ListFavoritesAsync(Guid userId, CancellationToken cancellationToken);

    Task UpdateProfileAsync(Guid userId, string displayName, string? bio, CancellationToken cancellationToken);

    Task SetAvatarAsync(Guid userId, string fileName, CancellationToken cancellationToken);

    Task<IReadOnlyList<AdminMemberDto>> ListMembersAsync(CancellationToken cancellationToken);
}
