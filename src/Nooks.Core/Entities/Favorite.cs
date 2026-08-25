namespace Nooks.Core.Entities;

/// <summary>
/// Un lieu mis de côté par un membre. Volontairement hors de l'agrégat Place :
/// c'est une relation entre une personne et un lieu, pas une propriété du lieu.
/// </summary>
public sealed class Favorite
{
    private Favorite() { }

    public Guid UserId { get; private set; }
    public Guid PlaceId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public static Favorite Create(Guid userId, Guid placeId) => new()
    {
        UserId = userId,
        PlaceId = placeId,
        CreatedAt = DateTimeOffset.UtcNow,
    };
}
