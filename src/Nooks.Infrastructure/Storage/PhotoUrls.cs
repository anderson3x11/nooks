namespace Nooks.Infrastructure.Storage;

/// <summary>Chemin public des photos, servi en statique par l'API depuis wwwroot.</summary>
public static class PhotoUrls
{
    public const string RootFolder = "uploads/places";

    public static string For(Guid placeId, string fileName) => $"/{RootFolder}/{placeId}/{fileName}";
}
