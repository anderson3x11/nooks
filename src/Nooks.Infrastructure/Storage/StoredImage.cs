namespace Nooks.Infrastructure.Storage;

/// <summary>
/// Une image rangée dans la base plutôt que sur un disque. Le déploiement se réduit
/// ainsi à une application et une base : pas de volume à monter, et les photos
/// survivent aux redéploiements sans stockage supplémentaire.
/// </summary>
public sealed class StoredImage
{
    private StoredImage() { }

    /// <summary>Chemin public de l'image, par exemple uploads/places/{id}/{nom}.webp.</summary>
    public string Path { get; private set; } = null!;

    public byte[] Content { get; private set; } = null!;

    public DateTimeOffset CreatedAt { get; private set; }

    public static StoredImage Create(string path, byte[] content)
        => new() { Path = path, Content = content, CreatedAt = DateTimeOffset.UtcNow };
}
