using Nooks.Core.Common;

namespace Nooks.Core.Tests;

public class PlaceMatchingTests
{
    [Theory]
    [InlineData("Le Miroir d'eau", "miroireau")]
    [InlineData("MUSÉE  de la   Chasse", "museechasse")]
    [InlineData("Château d'If", "chateauif")]
    [InlineData("   ", "")]
    public void La_normalisation_retire_accents_ponctuation_et_articles(string value, string expected)
    {
        Assert.Equal(expected, PlaceMatching.Normalize(value));
    }

    [Theory]
    [InlineData("Miroir d'eau", "Le miroir d'eau")]
    [InlineData("Miroir d'eau", "Le Miroir d'eau de Bordeaux")]
    [InlineData("Musée de la Chasse", "musee de la chasse")]
    public void Deux_ecritures_du_meme_nom_se_rejoignent(string left, string right)
    {
        Assert.True(PlaceMatching.NamesMatch(left, right));
    }

    [Theory]
    [InlineData("Le Vallon des Auffes", "Le Palais Longchamp")]
    [InlineData("Bar du port", "Café du port")]
    [InlineData("", "Miroir d'eau")]
    public void Deux_noms_distincts_ne_se_rejoignent_pas(string left, string right)
    {
        Assert.False(PlaceMatching.NamesMatch(left, right));
    }

    [Fact]
    public void La_distance_entre_deux_points_proches_est_en_metres()
    {
        // Environ 111 m par centième de degré de latitude.
        var distance = PlaceMatching.DistanceInMeters(48.86, 2.37, 48.861, 2.37);

        Assert.InRange(distance, 100, 125);
    }

    [Fact]
    public void Le_meme_nom_a_courte_distance_est_un_doublon()
    {
        Assert.True(PlaceMatching.LooksLikeDuplicate("Miroir d'eau", sameCategory: false, "Le miroir d'eau", 300));
    }

    [Fact]
    public void Le_meme_nom_a_lautre_bout_de_la_ville_ne_lest_pas()
    {
        Assert.False(PlaceMatching.LooksLikeDuplicate("Miroir d'eau", sameCategory: false, "Le miroir d'eau", 4000));
    }

    [Fact]
    public void Deux_lieux_de_meme_categorie_colles_lun_a_lautre_sont_un_doublon()
    {
        Assert.True(PlaceMatching.LooksLikeDuplicate("Un bar", sameCategory: true, "Autre bar", 40));
    }

    [Fact]
    public void Deux_commerces_voisins_de_categories_differentes_coexistent()
    {
        Assert.False(PlaceMatching.LooksLikeDuplicate("La librairie", sameCategory: false, "Le comptoir", 40));
    }
}
