namespace Nooks.Core.Entities;

/// <summary>
/// Une photo jointe à un avis. Contrairement à celles du lieu, elle n'a ni couverture
/// ni attribution : c'est la photo d'un membre, prise sur place.
/// </summary>
public sealed class RatingPhoto
{
    private RatingPhoto() { }

    public Guid Id { get; private set; }
    public Guid RatingId { get; private set; }
    public string FileName { get; private set; } = null!;
    public string ThumbnailFileName { get; private set; } = null!;
    public DateTimeOffset CreatedAt { get; private set; }

    internal static RatingPhoto Create(Guid ratingId, string fileName, string thumbnailFileName)
        => new()
        {
            Id = Guid.NewGuid(),
            RatingId = ratingId,
            FileName = fileName,
            ThumbnailFileName = thumbnailFileName,
            CreatedAt = DateTimeOffset.UtcNow,
        };
}
