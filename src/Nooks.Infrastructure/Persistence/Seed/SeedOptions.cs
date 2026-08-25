namespace Nooks.Infrastructure.Persistence.Seed;

public sealed class SeedOptions
{
    public const string SectionName = "Seed";

    /// <summary>
    /// Va chercher la photo de chaque lieu sur Wikipédia au premier démarrage.
    /// Désactivé dans les tests : cela ajouterait une dépendance réseau et
    /// rendrait la suite lente et instable.
    /// </summary>
    public bool FetchPhotos { get; set; } = true;

    /// <summary>Identité annoncée à Wikimedia, comme leur politique d'usage l'exige.</summary>
    public string UserAgent { get; set; } = "Nooks/0.1 (https://github.com/local/nooks)";
}
