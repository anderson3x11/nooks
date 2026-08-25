using Nooks.Core.Entities;

namespace Nooks.Infrastructure.Persistence.Seed;

/// <summary>Ligne du fichier places.json.</summary>
public sealed class SeedPlace
{
    public string Name { get; set; } = null!;
    public string Description { get; set; } = null!;
    public PlaceCategory Category { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? Address { get; set; }
    public string City { get; set; } = null!;
    public string Country { get; set; } = null!;
    public int[] Ratings { get; set; } = [];
}
