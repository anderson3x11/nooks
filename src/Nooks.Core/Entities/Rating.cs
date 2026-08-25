using Nooks.Core.Common;

namespace Nooks.Core.Entities;

public sealed class Rating
{
    public const int MinStars = 1;
    public const int MaxStars = 5;
    public const int MaxCommentLength = 1000;

    private Rating() { }

    public Guid Id { get; private set; }
    public Guid PlaceId { get; private set; }
    public Guid UserId { get; private set; }
    public int Stars { get; private set; }
    public string? Comment { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public static Rating Create(Guid placeId, Guid userId, int stars, string? comment)
    {
        var now = DateTimeOffset.UtcNow;
        var rating = new Rating
        {
            Id = Guid.NewGuid(),
            PlaceId = placeId,
            UserId = userId,
            CreatedAt = now,
            UpdatedAt = now
        };
        rating.Update(stars, comment);
        return rating;
    }

    public void Update(int stars, string? comment)
    {
        if (stars is < MinStars or > MaxStars)
        {
            throw new DomainException($"La note doit être comprise entre {MinStars} et {MaxStars} étoiles.");
        }

        comment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();
        if (comment is { Length: > MaxCommentLength })
        {
            throw new DomainException($"Le commentaire ne peut pas dépasser {MaxCommentLength} caractères.");
        }

        Stars = stars;
        Comment = comment;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
