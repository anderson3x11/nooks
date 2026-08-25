namespace Nooks.Core.Abstractions;

/// <summary>Nom des fichiers écrits pour une photo : l'image redimensionnée et sa vignette.</summary>
public sealed record StoredPhoto(string FileName, string ThumbnailFileName);

public interface IPhotoStorage
{
    /// <summary>Valide, redimensionne et enregistre l'image envoyée pour un lieu.</summary>
    Task<StoredPhoto> SaveAsync(Guid placeId, Stream content, CancellationToken cancellationToken);

    /// <summary>Enregistre la photo de profil d'un membre, recadrée en carré.</summary>
    Task<string> SaveAvatarAsync(Guid userId, Stream content, CancellationToken cancellationToken);
}
