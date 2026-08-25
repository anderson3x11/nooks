namespace Nooks.Core.Dtos;

/// <summary>Ce qu'affiche la page d'accueil : quelques chiffres et les derniers lieux publiés.</summary>
public sealed record HomeSummaryDto(
    int PlaceCount,
    int CityCount,
    int MemberCount,
    int ReviewCount,
    IReadOnlyList<PlaceSummaryDto> Latest,
    IReadOnlyList<CategoryCountDto> Categories);

public sealed record CategoryCountDto(string Category, int Count);
