using Nooks.Core.Common;

namespace Nooks.Core.Entities;

/// <summary>
/// L'avis d'un membre sur un lieu : une note, et éventuellement un commentaire.
/// Un membre n'en a qu'un seul par lieu, qu'il peut modifier ensuite.
/// </summary>
public sealed class Rating
{
    public const int MinStars = 1;
    public const int MaxStars = 5;
    public const int MaxCommentLength = 1000;

    /// <summary>Au-delà, un avis devient un album : trois photos suffisent à illustrer une visite.</summary>
    public const int MaxPhotos = 3;

    private readonly List<RatingPhoto> _photos = [];

    private Rating() { }

    public Guid Id { get; private set; }
    public Guid PlaceId { get; private set; }
    public Guid UserId { get; private set; }
    public int Stars { get; private set; }
    public string? Comment { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    /// <summary>Date de retrait par la modération. Nulle tant que l'avis est visible.</summary>
    public DateTimeOffset? RemovedAt { get; private set; }
    public Guid? RemovedByUserId { get; private set; }

    public IReadOnlyCollection<RatingPhoto> Photos => _photos;

    /// <summary>Un avis retiré disparaît de la fiche mais reste en base, restaurable.</summary>
    public bool IsRemoved => RemovedAt is not null;

    /// <summary>Vrai dès que l'avis a été retouché après sa publication.</summary>
    public bool IsEdited => UpdatedAt > CreatedAt;

    public static Rating Create(Guid placeId, Guid userId, int stars, string? comment)
    {
        var rating = new Rating
        {
            Id = Guid.NewGuid(),
            PlaceId = placeId,
            UserId = userId,
        };

        rating.Apply(stars, comment);

        // Les deux dates sont posées à partir du même instant : un avis tout juste
        // publié ne doit pas s'afficher comme « modifié ».
        var now = DateTimeOffset.UtcNow;
        rating.CreatedAt = now;
        rating.UpdatedAt = now;

        return rating;
    }

    public void Update(int stars, string? comment)
    {
        if (IsRemoved)
        {
            throw new DomainException("Votre avis a été retiré par la modération et ne peut plus être modifié.");
        }

        var normalized = Normalize(comment);

        // Renvoyer le même avis à l'identique ne le marque pas comme modifié.
        if (stars == Stars && normalized == Comment)
        {
            return;
        }

        Apply(stars, normalized);
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public RatingPhoto AddPhoto(string fileName, string thumbnailFileName)
    {
        if (IsRemoved)
        {
            throw new DomainException("Votre avis a été retiré par la modération et ne peut plus être illustré.");
        }

        if (_photos.Count >= MaxPhotos)
        {
            throw new DomainException($"Un avis ne peut pas porter plus de {MaxPhotos} photos.");
        }

        var photo = RatingPhoto.Create(Id, fileName, thumbnailFileName);
        _photos.Add(photo);
        return photo;
    }

    /// <summary>Retire l'avis de la fiche publique sans le détruire.</summary>
    public void Remove(Guid moderatorId)
    {
        RemovedAt = DateTimeOffset.UtcNow;
        RemovedByUserId = moderatorId;
    }

    public void Restore()
    {
        RemovedAt = null;
        RemovedByUserId = null;
    }

    private void Apply(int stars, string? comment)
    {
        if (stars is < MinStars or > MaxStars)
        {
            throw new DomainException($"La note doit être comprise entre {MinStars} et {MaxStars} étoiles.");
        }

        var normalized = Normalize(comment);
        if (normalized is { Length: > MaxCommentLength })
        {
            throw new DomainException($"Le commentaire ne peut pas dépasser {MaxCommentLength} caractères.");
        }

        Stars = stars;
        Comment = normalized;
    }

    private static string? Normalize(string? comment)
        => string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();
}
