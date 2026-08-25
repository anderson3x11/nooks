using Nooks.Core.Common;
using Nooks.Core.Entities;

namespace Nooks.Core.Tests;

public class PlaceTests
{
    private static Place CreatePlace() => Place.Create(
        "Temple de la Sibylle",
        "Une vue imprenable sur le nord de Paris.",
        PlaceCategory.Viewpoint,
        48.8809,
        2.3826,
        null,
        "Paris",
        "France",
        Guid.NewGuid(),
        PlaceStatus.Approved);

    [Fact]
    public void Un_lieu_sans_note_a_une_moyenne_nulle()
    {
        var place = CreatePlace();

        Assert.Equal(0, place.RatingCount);
        Assert.Equal(0, place.AverageRating);
    }

    [Fact]
    public void La_moyenne_suit_les_notes_ajoutees()
    {
        var place = CreatePlace();

        place.AddOrUpdateRating(Guid.NewGuid(), 5, null);
        place.AddOrUpdateRating(Guid.NewGuid(), 4, null);
        place.AddOrUpdateRating(Guid.NewGuid(), 3, null);

        Assert.Equal(3, place.RatingCount);
        Assert.Equal(4, place.AverageRating);
    }

    [Fact]
    public void La_moyenne_est_arrondie_a_deux_decimales()
    {
        var place = CreatePlace();

        place.AddOrUpdateRating(Guid.NewGuid(), 5, null);
        place.AddOrUpdateRating(Guid.NewGuid(), 4, null);
        place.AddOrUpdateRating(Guid.NewGuid(), 4, null);

        Assert.Equal(4.33, place.AverageRating);
    }

    [Fact]
    public void Noter_deux_fois_remplace_sa_propre_note()
    {
        var place = CreatePlace();
        var userId = Guid.NewGuid();

        place.AddOrUpdateRating(userId, 2, "Bof.");
        place.AddOrUpdateRating(userId, 5, "Finalement génial.");

        Assert.Equal(1, place.RatingCount);
        Assert.Equal(5, place.AverageRating);
        Assert.Equal("Finalement génial.", Assert.Single(place.Ratings).Comment);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    [InlineData(-1)]
    public void Une_note_hors_bornes_est_refusee(int stars)
    {
        var place = CreatePlace();

        Assert.Throws<DomainException>(() => place.AddOrUpdateRating(Guid.NewGuid(), stars, null));
    }

    [Fact]
    public void Une_latitude_impossible_est_refusee()
    {
        var exception = Assert.Throws<DomainException>(() => Place.Create(
            "Nulle part",
            "Description",
            PlaceCategory.Other,
            120,
            2.3,
            null,
            "Paris",
            "France",
            Guid.NewGuid(),
            PlaceStatus.Approved));

        Assert.Contains("latitude", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Un_nom_vide_est_refuse()
    {
        Assert.Throws<DomainException>(() => Place.Create(
            "   ",
            "Description",
            PlaceCategory.Other,
            48.8,
            2.3,
            null,
            "Paris",
            "France",
            Guid.NewGuid(),
            PlaceStatus.Approved));
    }

    [Fact]
    public void La_premiere_photo_devient_la_photo_de_couverture()
    {
        var place = CreatePlace();
        var userId = Guid.NewGuid();

        var first = place.AddPhoto("a.webp", "a_thumb.webp", userId);
        var second = place.AddPhoto("b.webp", "b_thumb.webp", userId);

        Assert.True(first.IsCover);
        Assert.False(second.IsCover);
    }

    [Fact]
    public void Le_point_est_construit_en_longitude_latitude()
    {
        var place = CreatePlace();

        Assert.Equal(48.8809, place.Latitude);
        Assert.Equal(2.3826, place.Longitude);
        Assert.Equal(GeoConstants.WgsSrid, place.Location.SRID);
    }
}
