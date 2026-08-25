using Nooks.Core.Common;
using NetTopologySuite.Geometries;

namespace Nooks.Core.Entities;

public sealed class Place
{
    public const int MaxNameLength = 120;
    public const int MaxDescriptionLength = 2000;


    private readonly List<PlacePhoto> _photos = [];
    private readonly List<Rating> _ratings = [];

    private Place() { }

    public Guid Id { get; private set; }
    public string Name { get; private set; } = null!;
    public string Description { get; private set; } = null!;
    public PlaceCategory Category { get; private set; }

    /// <summary>Position au format WGS84 (SRID 4326), X = longitude, Y = latitude.</summary>
    public Point Location { get; private set; } = null!;

    public string? Address { get; private set; }
    public string City { get; private set; } = null!;
    public string Country { get; private set; } = null!;
    public PlaceStatus Status { get; private set; }
    public Guid CreatedByUserId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? ReviewedAt { get; private set; }

    /// <summary>Moyenne dénormalisée, recalculée par <see cref="RecalculateRating"/>.</summary>
    public double AverageRating { get; private set; }
    public int RatingCount { get; private set; }

    public IReadOnlyCollection<PlacePhoto> Photos => _photos;
    public IReadOnlyCollection<Rating> Ratings => _ratings;

    public double Latitude => Location.Y;
    public double Longitude => Location.X;

    public static Place Create(
        string name,
        string description,
        PlaceCategory category,
        double latitude,
        double longitude,
        string? address,
        string city,
        string country,
        Guid createdByUserId,
        PlaceStatus status)
    {
        name = Require(name, nameof(name), MaxNameLength, "Le nom");
        description = Require(description, nameof(description), MaxDescriptionLength, "La description");
        city = Require(city, nameof(city), 100, "La ville");
        country = Require(country, nameof(country), 100, "Le pays");

        if (latitude is < -90 or > 90)
        {
            throw new DomainException("La latitude doit être comprise entre -90 et 90.");
        }

        if (longitude is < -180 or > 180)
        {
            throw new DomainException("La longitude doit être comprise entre -180 et 180.");
        }

        if (!Enum.IsDefined(category))
        {
            throw new DomainException("Catégorie inconnue.");
        }

        return new Place
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = description,
            Category = category,
            Location = new Point(longitude, latitude) { SRID = GeoConstants.WgsSrid },
            Address = string.IsNullOrWhiteSpace(address) ? null : address.Trim(),
            City = city,
            Country = country,
            Status = status,
            CreatedByUserId = createdByUserId,
            CreatedAt = DateTimeOffset.UtcNow,
            ReviewedAt = status == PlaceStatus.Approved ? DateTimeOffset.UtcNow : null
        };
    }

    public void Approve()
    {
        Status = PlaceStatus.Approved;
        ReviewedAt = DateTimeOffset.UtcNow;
    }

    public void Reject()
    {
        Status = PlaceStatus.Rejected;
        ReviewedAt = DateTimeOffset.UtcNow;
    }

    /// <summary>Ajoute la note de l'utilisateur, ou remplace la sienne s'il en avait déjà une.</summary>
    public Rating AddOrUpdateRating(Guid userId, int stars, string? comment)
    {
        var existing = _ratings.SingleOrDefault(r => r.UserId == userId);
        if (existing is null)
        {
            existing = Rating.Create(Id, userId, stars, comment);
            _ratings.Add(existing);
        }
        else
        {
            existing.Update(stars, comment);
        }

        RecalculateRating();
        return existing;
    }

    public PlacePhoto AddPhoto(string fileName, string thumbnailFileName, Guid uploadedByUserId)
    {
        var isCover = _photos.Count == 0;
        var photo = PlacePhoto.Create(Id, fileName, thumbnailFileName, uploadedByUserId, isCover);
        _photos.Add(photo);
        return photo;
    }

    /// <summary>Remet la moyenne et le compteur en phase avec les notes chargées.</summary>
    public void RecalculateRating()
    {
        RatingCount = _ratings.Count;
        AverageRating = RatingCount == 0
            ? 0
            : Math.Round(_ratings.Average(r => (double)r.Stars), 2, MidpointRounding.AwayFromZero);
    }

    private static string Require(string value, string parameterName, int maxLength, string label)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new DomainException($"{label} est obligatoire.");
        }

        value = value.Trim();
        return value.Length > maxLength
            ? throw new DomainException($"{label} ne peut pas dépasser {maxLength} caractères.")
            : value;
    }
}
