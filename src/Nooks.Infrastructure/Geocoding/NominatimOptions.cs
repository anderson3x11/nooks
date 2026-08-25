namespace Nooks.Infrastructure.Geocoding;

public sealed class NominatimOptions
{
    public const string SectionName = "Nominatim";

    public string BaseUrl { get; set; } = "https://nominatim.openstreetmap.org/";

    /// <summary>Nominatim exige un User-Agent identifiable, sinon il bloque les appels.</summary>
    public string UserAgent { get; set; } = "Nooks/0.1 (contact@example.com)";

    public int CacheHours { get; set; } = 24;

    public int MaxResults { get; set; } = 5;
}
