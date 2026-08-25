namespace Nooks.Infrastructure.Storage;

public sealed class PhotoStorageOptions
{
    public const string SectionName = "PhotoStorage";

    /// <summary>Dossier racine servi en statique. Renseigné au démarrage avec le wwwroot de l'API.</summary>
    public string RootPath { get; set; } = "wwwroot";

    public long MaxSizeInBytes { get; set; } = 5 * 1024 * 1024;

    public int MaxDimension { get; set; } = 1600;

    public int ThumbnailDimension { get; set; } = 400;

    public int Quality { get; set; } = 80;
}
