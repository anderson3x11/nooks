using System.Net.Http.Json;
using System.Globalization;
using System.Text.Json.Serialization;
using Nooks.Core.Abstractions;
using Nooks.Core.Dtos;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Nooks.Infrastructure.Geocoding;

/// <summary>
/// Géocodage via Nominatim (OpenStreetMap). Appelé côté serveur uniquement : le service impose
/// un User-Agent identifiable et une requête par seconde maximum, deux règles intenables depuis le navigateur.
/// </summary>
public sealed class NominatimGeocodingService(
    HttpClient httpClient,
    IMemoryCache cache,
    IOptions<NominatimOptions> options,
    ILogger<NominatimGeocodingService> logger) : IGeocodingService
{
    public const string HttpClientName = "nominatim";

    private static readonly SemaphoreSlim Throttle = new(1, 1);
    private static readonly TimeSpan MinimumDelayBetweenCalls = TimeSpan.FromSeconds(1);
    private static DateTimeOffset _lastCall = DateTimeOffset.MinValue;

    private readonly NominatimOptions _options = options.Value;

    public async Task<IReadOnlyList<GeocodeResultDto>> SearchAsync(string query, CancellationToken cancellationToken)
    {
        query = query.Trim();
        if (query.Length < 2)
        {
            return [];
        }

        var cacheKey = $"geocode:{query.ToLowerInvariant()}";
        if (cache.TryGetValue<IReadOnlyList<GeocodeResultDto>>(cacheKey, out var cached) && cached is not null)
        {
            return cached;
        }

        var results = await CallNominatimAsync(query, cancellationToken);
        cache.Set(cacheKey, results, TimeSpan.FromHours(_options.CacheHours));
        return results;
    }

    private async Task<IReadOnlyList<GeocodeResultDto>> CallNominatimAsync(string query, CancellationToken cancellationToken)
    {
        var url = $"search?format=jsonv2&limit={_options.MaxResults}&q={Uri.EscapeDataString(query)}";

        await Throttle.WaitAsync(cancellationToken);
        try
        {
            var sinceLastCall = DateTimeOffset.UtcNow - _lastCall;
            if (sinceLastCall < MinimumDelayBetweenCalls)
            {
                await Task.Delay(MinimumDelayBetweenCalls - sinceLastCall, cancellationToken);
            }

            var response = await httpClient.GetAsync(url, cancellationToken);
            _lastCall = DateTimeOffset.UtcNow;

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Nominatim a répondu {StatusCode} pour « {Query} ».", response.StatusCode, query);
                return [];
            }

            var payload = await response.Content.ReadFromJsonAsync<List<NominatimResult>>(cancellationToken)
                          ?? [];

            return [.. payload.Select(Map).OfType<GeocodeResultDto>()];
        }
        finally
        {
            Throttle.Release();
        }
    }

    private static GeocodeResultDto? Map(NominatimResult result)
    {
        if (!TryParse(result.Lat, out var latitude) || !TryParse(result.Lon, out var longitude))
        {
            return null;
        }

        // boundingbox arrive dans l'ordre : latitude sud, latitude nord, longitude ouest, longitude est.
        if (result.BoundingBox is not { Length: 4 }
            || !TryParse(result.BoundingBox[0], out var minLat)
            || !TryParse(result.BoundingBox[1], out var maxLat)
            || !TryParse(result.BoundingBox[2], out var minLon)
            || !TryParse(result.BoundingBox[3], out var maxLon))
        {
            return null;
        }

        return new GeocodeResultDto(result.DisplayName ?? string.Empty, latitude, longitude, minLon, minLat, maxLon, maxLat);
    }

    private static bool TryParse(string? value, out double parsed)
        => double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out parsed);

    private sealed class NominatimResult
    {
        [JsonPropertyName("lat")] public string? Lat { get; set; }
        [JsonPropertyName("lon")] public string? Lon { get; set; }
        [JsonPropertyName("display_name")] public string? DisplayName { get; set; }
        [JsonPropertyName("boundingbox")] public string[]? BoundingBox { get; set; }
    }
}
