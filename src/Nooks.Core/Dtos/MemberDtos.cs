namespace Nooks.Core.Dtos;

/// <summary>Profil public d'un membre, tel qu'affiché sur sa page.</summary>
public sealed record MemberProfileDto(
    Guid Id,
    string DisplayName,
    string? Bio,
    string? AvatarUrl,
    DateTimeOffset JoinedAt,
    int ReviewCount,
    int PlaceCount,
    int FavoriteCount,
    IReadOnlyList<PlaceSummaryDto> Places,
    /// <summary>Renseigné uniquement quand on consulte son propre profil.</summary>
    IReadOnlyList<PlaceSummaryDto> Favorites,
    IReadOnlyList<MemberReviewDto> Reviews);

/// <summary>Un avis écrit par le membre, avec le lieu auquel il se rapporte.</summary>
public sealed record MemberReviewDto(
    Guid Id,
    Guid PlaceId,
    string PlaceName,
    string PlaceCity,
    int Stars,
    string? Comment,
    DateTimeOffset UpdatedAt,
    bool IsEdited,
    bool IsRemoved);

/// <summary>Ligne de la liste des membres dans l'espace d'administration.</summary>
public sealed record AdminMemberDto(
    Guid Id,
    string DisplayName,
    string Email,
    string? AvatarUrl,
    DateTimeOffset JoinedAt,
    bool IsAdmin,
    int ReviewCount,
    int PlaceCount);

/// <summary>Un avis vu depuis la modération : on veut savoir sur quel lieu il porte.</summary>
public sealed record AdminRatingDto(
    Guid Id,
    Guid PlaceId,
    string PlaceName,
    Guid UserId,
    string UserDisplayName,
    int Stars,
    string? Comment,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    bool IsEdited,
    bool IsRemoved);
