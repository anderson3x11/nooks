namespace Nooks.Core.Dtos;

/// <summary>Résultat de recherche de ville, tel que renvoyé au front.</summary>
public sealed record GeocodeResultDto(
    string DisplayName,
    double Latitude,
    double Longitude,
    double MinLon,
    double MinLat,
    double MaxLon,
    double MaxLat);
