using System.Net;
using System.Net.Http.Json;
using Nooks.Api.Contracts;
using Nooks.Api.Endpoints;
using Nooks.Core.Dtos;
using Nooks.Core.Entities;

namespace Nooks.Api.Tests;

/// <summary>
/// Anti-flood : proposer un lieu déjà présent doit avertir, pas créer une redite.
/// L'auteur garde la main, mais sa proposition passe alors par la modération.
/// </summary>
[Collection(ApiCollection.Name)]
public class DuplicateTests(NooksApiFactory factory)
{
    [Fact]
    public async Task Reproposer_le_meme_lieu_renvoie_un_avertissement_avec_le_lieu_existant()
    {
        var client = await factory.CreateClient().RegisterAsync("Premier");
        var place = Somewhere("La fontaine oubliée", PlaceCategory.Curiosity);

        var created = await (await client.PostPlaceAsync(place)).ReadAsync<PlaceDetailDto>();

        var second = await factory.CreateClient().RegisterAsync("Second");
        var response = await second.PostPlaceAsync(place);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);

        var warning = await response.Content.ReadFromJsonAsync<PlacesEndpoints.DuplicateWarning>(ApiClientExtensions.Json);
        Assert.Contains(warning!.Candidates, candidate => candidate.Id == created.Id);
    }

    [Fact]
    public async Task Insister_publie_le_lieu_mais_le_met_en_verification()
    {
        var client = await factory.CreateClient().RegisterAsync("Insistant");
        var place = Somewhere("Le banc du bout du monde", PlaceCategory.Viewpoint);

        await client.PostPlaceAsync(place);
        var forced = await (await client.PostPlaceAsync(place, force: true)).ReadAsync<PlaceDetailDto>();

        Assert.True(forced.SuspectedDuplicate);
        Assert.Equal(PlaceStatus.Pending, forced.Status);

        // Tant qu'un modérateur n'a pas tranché, la redite reste hors de la carte publique.
        var visible = await (await client.GetAsync($"/api/places?bbox={Bbox(place)}")).ReadAsync<List<PlaceSummaryDto>>();
        Assert.DoesNotContain(visible, item => item.Id == forced.Id);

        var admin = await factory.CreateClient().LoginAsync("admin@nooks.local");
        var pending = await (await admin.GetAsync("/api/admin/places?status=Pending")).ReadAsync<List<PlaceSummaryDto>>();
        Assert.Contains(pending, item => item.Id == forced.Id && item.SuspectedDuplicate);
    }

    [Fact]
    public async Task Un_lieu_voisin_mais_different_passe_sans_avertissement()
    {
        var client = await factory.CreateClient().RegisterAsync("Voisin");
        var first = Somewhere("La librairie du passage", PlaceCategory.Shop);

        await client.PostPlaceAsync(first);

        // Même rue, autre nom, autre catégorie : deux commerces voisins doivent coexister.
        var neighbour = first with
        {
            Name = "Le comptoir des épices",
            Category = PlaceCategory.FoodDrink,
            Latitude = first.Latitude + 0.0009,
        };

        var response = await client.PostPlaceAsync(neighbour);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task La_recherche_de_lieux_semblables_repond_avant_la_publication()
    {
        var client = await factory.CreateClient().RegisterAsync("Prudent");
        var place = Somewhere("Le mur des horloges", PlaceCategory.StreetArt);

        var created = await (await client.PostPlaceAsync(place)).ReadAsync<PlaceDetailDto>();

        var url =
            $"/api/places/similar?latitude={place.Latitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}"
            + $"&longitude={place.Longitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}"
            + $"&name={Uri.EscapeDataString(place.Name)}&category={place.Category}";

        var similar = await (await client.GetAsync(url)).ReadAsync<List<PlaceSummaryDto>>();

        Assert.Contains(similar, candidate => candidate.Id == created.Id);
    }

    private static int _counter;

    /// <summary>Un coin de carte réservé à ces tests, loin des lieux des autres classes.</summary>
    private static CreatePlaceRequest Somewhere(string name, PlaceCategory category)
    {
        var index = Interlocked.Increment(ref _counter);
        return new CreatePlaceRequest(
            name,
            "Un lieu de test pour la détection des redites.",
            category,
            48.9000 + index * 0.003,
            2.4000,
            null,
            "Paris",
            "France");
    }

    private static string Bbox(CreatePlaceRequest place)
    {
        var culture = System.Globalization.CultureInfo.InvariantCulture;
        return $"{(place.Longitude - 0.01).ToString(culture)},{(place.Latitude - 0.01).ToString(culture)}," +
               $"{(place.Longitude + 0.01).ToString(culture)},{(place.Latitude + 0.01).ToString(culture)}";
    }
}
