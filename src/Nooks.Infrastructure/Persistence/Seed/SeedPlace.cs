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
    /// <summary>Notes laissées sur le lieu, dans l'ordre. Les commentaires en découlent.</summary>
    public int[] Ratings { get; set; } = [];

    /// <summary>
    /// Nombre total de photos portées par le lieu. Au moins une, sinon il n'aurait pas
    /// de marqueur ; au-delà de une, les suivantes alimentent le carrousel.
    /// </summary>
    public int Photos { get; set; } = 1;

    /// <summary>
    /// Titre de l'article Wikipédia, quand il en existe un : c'est de là que vient
    /// la photo du lieu. Sans lui, on retombe sur une illustration générée.
    /// </summary>
    public string? Wikipedia { get; set; }
}
