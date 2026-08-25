using System.Net;
using System.Net.Http.Json;
using Nooks.Api.Contracts;
using Nooks.Core.Dtos;
using Nooks.Core.Entities;

namespace Nooks.Api.Tests;

[Collection(ApiCollection.Name)]
public class PlacesEndpointsTests(NooksApiFactory factory)
{
    private const string ParisBbox = "bbox=2.20,48.78,2.45,48.92";
    private const string LyonBbox = "bbox=4.75,45.70,4.90,45.80";

    [Fact]
    public async Task La_recherche_par_rectangle_ne_renvoie_que_les_lieux_dedans()
    {
        var client = factory.CreateClient();

        var places = await (await client.GetAsync($"/api/places?{ParisBbox}")).ReadAsync<List<PlaceSummaryDto>>();

        Assert.NotEmpty(places);
        Assert.All(places, place => Assert.Equal("Paris", place.City));
        Assert.All(places, place => Assert.Equal(PlaceStatus.Approved, place.Status));
    }

    [Fact]
    public async Task Deux_rectangles_differents_renvoient_des_lieux_differents()
    {
        var client = factory.CreateClient();

        var paris = await (await client.GetAsync($"/api/places?{ParisBbox}")).ReadAsync<List<PlaceSummaryDto>>();
        var lyon = await (await client.GetAsync($"/api/places?{LyonBbox}")).ReadAsync<List<PlaceSummaryDto>>();

        Assert.All(lyon, place => Assert.Equal("Lyon", place.City));
        Assert.Empty(paris.Select(p => p.Id).Intersect(lyon.Select(p => p.Id)));
    }

    [Fact]
    public async Task Le_filtre_par_categorie_est_applique()
    {
        var client = factory.CreateClient();

        var places = await (await client.GetAsync($"/api/places?{ParisBbox}&categories=Museum")).ReadAsync<List<PlaceSummaryDto>>();

        Assert.NotEmpty(places);
        Assert.All(places, place => Assert.Equal(PlaceCategory.Museum, place.Category));
    }

    [Fact]
    public async Task Le_filtre_par_note_minimale_est_applique()
    {
        var client = factory.CreateClient();

        var places = await (await client.GetAsync($"/api/places?{ParisBbox}&minRating=4.5")).ReadAsync<List<PlaceSummaryDto>>();

        Assert.NotEmpty(places);
        Assert.All(places, place => Assert.True(place.AverageRating >= 4.5));
    }

    [Fact]
    public async Task Un_rectangle_trop_grand_est_refuse()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/places?bbox=-40,-40,40,40");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Une_categorie_inconnue_est_refusee()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/places?{ParisBbox}&categories=Chateau");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Proposer_un_lieu_exige_un_compte()
    {
        var client = factory.CreateClient();

        var response = await client.PostPlaceAsync(NewPlace());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Un_membre_connecte_peut_proposer_un_lieu_et_le_retrouver_sur_la_carte()
    {
        var client = await factory.CreateClient().RegisterAsync("Contributeur");

        var created = await (await client.PostPlaceAsync(NewPlace())).ReadAsync<PlaceDetailDto>();
        var places = await (await client.GetAsync($"/api/places?{ParisBbox}")).ReadAsync<List<PlaceSummaryDto>>();

        Assert.Equal(PlaceStatus.Approved, created.Status);
        Assert.Equal("Contributeur", created.CreatedByDisplayName);
        Assert.Contains(places, place => place.Id == created.Id);
    }

    [Fact]
    public async Task Noter_deux_fois_le_meme_lieu_met_a_jour_sa_note_au_lieu_den_creer_une_seconde()
    {
        var client = await factory.CreateClient().RegisterAsync("Noteur");
        var created = await (await client.PostPlaceAsync(NewPlace())).ReadAsync<PlaceDetailDto>();

        var first = await (await client.PutAsJsonAsync($"/api/places/{created.Id}/rating", new RatePlaceRequest(5, "Superbe"))).ReadAsync<PlaceDetailDto>();
        var second = await (await client.PutAsJsonAsync($"/api/places/{created.Id}/rating", new RatePlaceRequest(2, "Finalement non"))).ReadAsync<PlaceDetailDto>();

        Assert.Equal(1, first.RatingCount);
        Assert.Equal(5, first.AverageRating);
        Assert.Equal(1, second.RatingCount);
        Assert.Equal(2, second.AverageRating);
        Assert.Equal("Finalement non", Assert.Single(second.Ratings).Comment);
    }

    [Fact]
    public async Task La_moyenne_tient_compte_de_tous_les_votants()
    {
        var author = await factory.CreateClient().RegisterAsync("Auteur");
        var created = await (await author.PostPlaceAsync(NewPlace())).ReadAsync<PlaceDetailDto>();

        await author.PutAsJsonAsync($"/api/places/{created.Id}/rating", new RatePlaceRequest(5, null));
        var other = await factory.CreateClient().RegisterAsync("Autre");
        var updated = await (await other.PutAsJsonAsync($"/api/places/{created.Id}/rating", new RatePlaceRequest(2, null))).ReadAsync<PlaceDetailDto>();

        Assert.Equal(2, updated.RatingCount);
        Assert.Equal(3.5, updated.AverageRating);
    }

    [Fact]
    public async Task Une_note_hors_bornes_est_refusee()
    {
        var client = await factory.CreateClient().RegisterAsync("Tricheur");
        var created = await (await client.PostPlaceAsync(NewPlace())).ReadAsync<PlaceDetailDto>();

        var response = await client.PutAsJsonAsync($"/api/places/{created.Id}/rating", new RatePlaceRequest(9, null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Un_lieu_sans_photo_est_refuse()
    {
        var client = await factory.CreateClient().RegisterAsync("Sans photo");

        var response = await client.PostPlaceAsync(NewPlace(), photoCount: 0);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Les_photos_envoyees_a_la_creation_deviennent_celles_du_lieu()
    {
        var client = await factory.CreateClient().RegisterAsync("Photographe");

        var created = await (await client.PostPlaceAsync(NewPlace(), photoCount: 3)).ReadAsync<PlaceDetailDto>();

        Assert.Equal(3, created.Photos.Count);
        Assert.Single(created.Photos, photo => photo.IsCover);

        // La vignette de couverture est ce qui alimente le marqueur sur la carte.
        var places = await (await client.GetAsync($"/api/places?{ParisBbox}")).ReadAsync<List<PlaceSummaryDto>>();
        var onMap = Assert.Single(places, place => place.Id == created.Id);
        Assert.NotNull(onMap.CoverThumbnailUrl);
    }

    [Fact]
    public async Task Un_lieu_inconnu_renvoie_404()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/places/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task La_recherche_de_ville_renvoie_un_cadre_exploitable_par_la_carte()
    {
        var client = factory.CreateClient();

        var results = await (await client.GetAsync("/api/geocode?q=Lyon")).ReadAsync<List<GeocodeResultDto>>();

        var lyon = Assert.Single(results);
        Assert.True(lyon.MinLon < lyon.MaxLon);
        Assert.True(lyon.MinLat < lyon.MaxLat);
    }

    private static CreatePlaceRequest NewPlace() => new(
        "Atelier secret",
        "Un atelier d'artiste ouvert un samedi sur deux, derrière une porte cochère.",
        PlaceCategory.Curiosity,
        48.8600,
        2.3700,
        "12 rue imaginaire",
        "Paris",
        "France");
}
