using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;

namespace Nooks.Infrastructure.Persistence.Seed;

/// <summary>Photo trouvée pour un lieu, avec ce qu'il faut pour la créditer.</summary>
public sealed record SourcedPhoto(byte[] Content, string Attribution, string SourceUrl);

/// <summary>
/// Récupère l'illustration d'un lieu à partir de son article Wikipédia.
/// On passe par l'article plutôt que par une recherche libre sur Commons : l'image
/// principale d'un article porte bien sur le sujet, là où une recherche par mots-clés
/// ramène régulièrement une photo sans rapport.
/// Sans article ou sans image, l'appelant retombe sur l'illustration générée.
/// </summary>
public sealed class WikimediaPhotoSource(HttpClient httpClient, ILogger<WikimediaPhotoSource> logger)
{
    public const string HttpClientName = "wikimedia";

    private const string WikipediaApi = "https://fr.wikipedia.org/w/api.php";
    private const string CommonsApi = "https://commons.wikimedia.org/w/api.php";

    /// <summary>Largeur demandée : suffisante pour la fiche, sans télécharger un original de 20 Mo.</summary>
    private const int RequestedWidth = 1400;

    private static readonly TimeSpan MinimumDelay = TimeSpan.FromMilliseconds(250);

    private static readonly SemaphoreSlim Throttle = new(1, 1);
    private static DateTimeOffset _lastCall = DateTimeOffset.MinValue;

    /// <summary>
    /// Un lieu à la fois, espacés d'un quart de seconde. Enchaîner cent trente appels
    /// d'affilée fait tomber une partie des réponses et laisse des lieux sans photo.
    /// </summary>
    public async Task<SourcedPhoto?> TryFetchAsync(string articleTitle, CancellationToken cancellationToken)
    {
        await Throttle.WaitAsync(cancellationToken);
        try
        {
            var since = DateTimeOffset.UtcNow - _lastCall;
            if (since < MinimumDelay)
            {
                await Task.Delay(MinimumDelay - since, cancellationToken);
            }

            var fileName = await FindLeadImageAsync(articleTitle, cancellationToken);
            if (fileName is null)
            {
                return null;
            }

            var info = await FindImageInfoAsync(fileName, cancellationToken);
            if (info is null)
            {
                return null;
            }

            var content = await httpClient.GetByteArrayAsync(info.Value.Url, cancellationToken);
            return new SourcedPhoto(content, info.Value.Attribution, info.Value.DescriptionUrl);
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
        {
            logger.LogInformation("Pas de photo Wikipédia pour « {Article} » : {Reason}", articleTitle, exception.Message);
            return null;
        }
        finally
        {
            _lastCall = DateTimeOffset.UtcNow;
            Throttle.Release();
        }
    }

    private async Task<string?> FindLeadImageAsync(string articleTitle, CancellationToken cancellationToken)
    {
        var url = $"{WikipediaApi}?action=query&prop=pageimages&piprop=name&format=json&formatversion=2&redirects=1"
                  + $"&titles={Uri.EscapeDataString(articleTitle)}";

        var response = await httpClient.GetFromJsonAsync<QueryResponse>(url, cancellationToken);
        var page = response?.Query?.Pages?.FirstOrDefault();

        return page?.Missing == true ? null : page?.PageImage;
    }

    private async Task<(string Url, string Attribution, string DescriptionUrl)?> FindImageInfoAsync(
        string fileName,
        CancellationToken cancellationToken)
    {
        var url = $"{CommonsApi}?action=query&prop=imageinfo&format=json&formatversion=2"
                  + $"&iiprop=url|extmetadata&iiurlwidth={RequestedWidth}"
                  + $"&titles={Uri.EscapeDataString("File:" + fileName)}";

        var response = await httpClient.GetFromJsonAsync<QueryResponse>(url, cancellationToken);
        var image = response?.Query?.Pages?.FirstOrDefault()?.ImageInfo?.FirstOrDefault();

        if (image?.ThumbUrl is null && image?.Url is null)
        {
            return null;
        }

        var author = Clean(image.ExtMetadata?.Artist?.Value) ?? "Auteur non précisé";
        var licence = Clean(image.ExtMetadata?.LicenseShortName?.Value) ?? "voir Wikimedia Commons";

        return (image.ThumbUrl ?? image.Url!, $"{author} · {licence}", image.DescriptionUrl ?? string.Empty);
    }

    /// <summary>Les métadonnées de Commons arrivent en HTML : on n'en garde que le texte.</summary>
    private static string? Clean(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var text = System.Text.RegularExpressions.Regex.Replace(value, "<.*?>", " ");
        text = System.Net.WebUtility.HtmlDecode(text);
        text = System.Text.RegularExpressions.Regex.Replace(text, @"\s+", " ").Trim();

        return text.Length switch
        {
            0 => null,
            > 160 => text[..160].TrimEnd() + "…",
            _ => text,
        };
    }

    private sealed class QueryResponse
    {
        [JsonPropertyName("query")] public QueryBlock? Query { get; set; }
    }

    private sealed class QueryBlock
    {
        [JsonPropertyName("pages")] public List<PageBlock>? Pages { get; set; }
    }

    private sealed class PageBlock
    {
        [JsonPropertyName("missing")] public bool? Missing { get; set; }
        [JsonPropertyName("pageimage")] public string? PageImage { get; set; }
        [JsonPropertyName("imageinfo")] public List<ImageInfoBlock>? ImageInfo { get; set; }
    }

    private sealed class ImageInfoBlock
    {
        [JsonPropertyName("url")] public string? Url { get; set; }
        [JsonPropertyName("thumburl")] public string? ThumbUrl { get; set; }
        [JsonPropertyName("descriptionurl")] public string? DescriptionUrl { get; set; }
        [JsonPropertyName("extmetadata")] public ExtMetadata? ExtMetadata { get; set; }
    }

    private sealed class ExtMetadata
    {
        [JsonPropertyName("Artist")] public MetadataValue? Artist { get; set; }
        [JsonPropertyName("LicenseShortName")] public MetadataValue? LicenseShortName { get; set; }
    }

    private sealed class MetadataValue
    {
        [JsonPropertyName("value")] public string? Value { get; set; }
    }
}
