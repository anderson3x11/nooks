using System.Net;
using System.Net.Http.Json;
using Nooks.Api.Contracts;
using Nooks.Core.Dtos;
using Nooks.Core.Entities;

namespace Nooks.Api.Tests;

[Collection(ApiCollection.Name)]
public class MemberTests(NooksApiFactory factory)
{
    [Fact]
    public async Task Le_profil_compte_les_lieux_proposes_les_avis_et_les_favoris()
    {
        var client = await factory.CreateClient().RegisterAsync("Contributrice");

        var created = await (await client.PostPlaceAsync(Somewhere("Le jardin suspendu"))).ReadAsync<PlaceDetailDto>();
        await client.PutAsJsonAsync($"/api/places/{created.Id}/rating", new RatePlaceRequest(5, "Magnifique."));
        await client.PostAsync($"/api/places/{created.Id}/favorite", null);

        var profile = await (await client.GetAsync("/api/me")).ReadAsync<MemberProfileDto>();

        Assert.Equal("Contributrice", profile.DisplayName);
        Assert.Equal(1, profile.PlaceCount);
        Assert.Equal(1, profile.ReviewCount);
        Assert.Equal(1, profile.FavoriteCount);
        Assert.Contains(profile.Places, place => place.Id == created.Id);
        Assert.Contains(profile.Favorites, place => place.Id == created.Id);
        Assert.Contains(profile.Reviews, review => review.PlaceId == created.Id && review.Comment == "Magnifique.");
    }

    [Fact]
    public async Task Le_favori_se_pose_et_se_retire()
    {
        var client = await factory.CreateClient().RegisterAsync("Collectionneur");
        var created = await (await client.PostPlaceAsync(Somewhere("La cour des ateliers"))).ReadAsync<PlaceDetailDto>();

        await client.PostAsync($"/api/places/{created.Id}/favorite", null);
        var withFavorite = await (await client.GetAsync($"/api/places/{created.Id}")).ReadAsync<PlaceDetailDto>();
        Assert.True(withFavorite.IsFavorite);

        await client.PostAsync($"/api/places/{created.Id}/favorite", null);
        var without = await (await client.GetAsync($"/api/places/{created.Id}")).ReadAsync<PlaceDetailDto>();
        Assert.False(without.IsFavorite);

        var favorites = await (await client.GetAsync("/api/me/favorites")).ReadAsync<List<PlaceSummaryDto>>();
        Assert.DoesNotContain(favorites, place => place.Id == created.Id);
    }

    [Fact]
    public async Task Les_favoris_ne_sont_visibles_que_par_leur_proprietaire()
    {
        var owner = await factory.CreateClient().RegisterAsync("Discret");
        var created = await (await owner.PostPlaceAsync(Somewhere("Le kiosque oublié"))).ReadAsync<PlaceDetailDto>();
        await owner.PostAsync($"/api/places/{created.Id}/favorite", null);

        var ownProfile = await (await owner.GetAsync("/api/me")).ReadAsync<MemberProfileDto>();
        var seenByOthers = await (await factory.CreateClient().GetAsync($"/api/members/{ownProfile.Id}")).ReadAsync<MemberProfileDto>();

        Assert.NotEmpty(ownProfile.Favorites);
        Assert.Empty(seenByOthers.Favorites);
        // Le compteur reste public, c'est la liste qui ne l'est pas.
        Assert.Equal(1, seenByOthers.FavoriteCount);
    }

    [Fact]
    public async Task La_presentation_du_profil_se_modifie()
    {
        var client = await factory.CreateClient().RegisterAsync("Avant");

        var updated = await (await client.PutAsJsonAsync("/api/me", new UpdateProfileRequest("Après", "Je cherche les passages couverts.")))
            .ReadAsync<MemberProfileDto>();

        Assert.Equal("Après", updated.DisplayName);
        Assert.Equal("Je cherche les passages couverts.", updated.Bio);
    }

    [Fact]
    public async Task Un_avis_retire_disparait_de_la_fiche_et_ne_compte_plus_dans_la_moyenne()
    {
        var author = await factory.CreateClient().RegisterAsync("Auteur du lieu");
        var created = await (await author.PostPlaceAsync(Somewhere("Le mur peint"))).ReadAsync<PlaceDetailDto>();

        await author.PutAsJsonAsync($"/api/places/{created.Id}/rating", new RatePlaceRequest(5, null));

        var troll = await factory.CreateClient().RegisterAsync("Grossier");
        var withTroll = await (await troll.PutAsJsonAsync($"/api/places/{created.Id}/rating", new RatePlaceRequest(1, "Contenu injurieux")))
            .ReadAsync<PlaceDetailDto>();
        Assert.Equal(2, withTroll.RatingCount);
        Assert.Equal(3, withTroll.AverageRating);

        var offending = withTroll.Ratings.Single(rating => rating.Comment == "Contenu injurieux");
        var admin = await factory.CreateClient().LoginAsync("admin@nooks.local");
        await admin.PostAsync($"/api/admin/ratings/{created.Id}/{offending.Id}/remove", null);

        var cleaned = await (await author.GetAsync($"/api/places/{created.Id}")).ReadAsync<PlaceDetailDto>();
        Assert.DoesNotContain(cleaned.Ratings, rating => rating.Id == offending.Id);
        Assert.Equal(1, cleaned.RatingCount);
        Assert.Equal(5, cleaned.AverageRating);

        // Retiré, pas détruit : la modération le retrouve et peut revenir dessus.
        var removed = await (await admin.GetAsync("/api/admin/ratings?removedOnly=true")).ReadAsync<List<AdminRatingDto>>();
        Assert.Contains(removed, rating => rating.Id == offending.Id && rating.IsRemoved);

        await admin.PostAsync($"/api/admin/ratings/{created.Id}/{offending.Id}/restore", null);
        var restored = await (await author.GetAsync($"/api/places/{created.Id}")).ReadAsync<PlaceDetailDto>();
        Assert.Contains(restored.Ratings, rating => rating.Id == offending.Id);
    }

    [Fact]
    public async Task Un_admin_supprime_definitivement_un_lieu()
    {
        var client = await factory.CreateClient().RegisterAsync("Spammeur");
        var created = await (await client.PostPlaceAsync(Somewhere("Publicité déguisée"))).ReadAsync<PlaceDetailDto>();

        var admin = await factory.CreateClient().LoginAsync("admin@nooks.local");
        var response = await admin.DeleteAsync($"/api/admin/places/{created.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/places/{created.Id}")).StatusCode);
    }

    [Fact]
    public async Task La_moderation_est_fermee_aux_membres_ordinaires()
    {
        var member = await factory.CreateClient().RegisterAsync("Curieux du back-office");

        Assert.Equal(HttpStatusCode.Forbidden, (await member.GetAsync("/api/admin/ratings")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await member.GetAsync("/api/admin/members")).StatusCode);
    }

    private static int _counter;

    private static CreatePlaceRequest Somewhere(string name)
    {
        var index = Interlocked.Increment(ref _counter);
        return new CreatePlaceRequest(
            name,
            "Un lieu de test pour les fonctions de compte.",
            PlaceCategory.Curiosity,
            48.7500 + index * 0.003,
            2.3000,
            null,
            "Paris",
            "France");
    }
}
