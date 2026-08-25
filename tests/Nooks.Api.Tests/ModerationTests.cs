using System.Net;
using System.Net.Http.Json;
using Nooks.Api.Contracts;
using Nooks.Core.Dtos;
using Nooks.Core.Entities;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Nooks.Api.Tests;

[Collection(ApiCollection.Name)]
public class ModerationTests(NooksApiFactory factory)
{
    private const string ParisBbox = "bbox=2.20,48.78,2.45,48.92";

    /// <summary>Le mode « validation manuelle » du futur : un simple réglage de configuration.</summary>
    private WebApplicationFactory<Program> WithManualModeration()
        => factory.WithWebHostBuilder(builder => builder.UseSetting("Moderation:AutoApprove", "false"));

    [Fact]
    public async Task La_file_de_moderation_est_reservee_aux_admins()
    {
        var anonymous = factory.CreateClient();
        var member = await factory.CreateClient().RegisterAsync("Curieux");
        var admin = await factory.CreateClient().LoginAsync("admin@nooks.local");

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/admin/places")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await member.GetAsync("/api/admin/places")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync("/api/admin/places")).StatusCode);
    }

    [Fact]
    public async Task En_validation_manuelle_un_lieu_propose_reste_invisible_jusqua_son_approbation()
    {
        using var moderated = WithManualModeration();
        var member = await moderated.CreateClient().RegisterAsync("Proposeur");
        var admin = await moderated.CreateClient().LoginAsync("admin@nooks.local");

        var created = await (await member.PostPlaceAsync(NewPlace())).ReadAsync<PlaceDetailDto>();
        Assert.Equal(PlaceStatus.Pending, created.Status);

        var beforeApproval = await (await member.GetAsync($"/api/places?{ParisBbox}")).ReadAsync<List<PlaceSummaryDto>>();
        Assert.DoesNotContain(beforeApproval, place => place.Id == created.Id);
        Assert.Equal(HttpStatusCode.NotFound, (await member.GetAsync($"/api/places/{created.Id}")).StatusCode);

        var pending = await (await admin.GetAsync("/api/admin/places?status=Pending")).ReadAsync<List<PlaceSummaryDto>>();
        Assert.Contains(pending, place => place.Id == created.Id);

        var approved = await (await admin.PostAsync($"/api/admin/places/{created.Id}/approve", null)).ReadAsync<PlaceDetailDto>();
        Assert.Equal(PlaceStatus.Approved, approved.Status);

        var afterApproval = await (await member.GetAsync($"/api/places?{ParisBbox}")).ReadAsync<List<PlaceSummaryDto>>();
        Assert.Contains(afterApproval, place => place.Id == created.Id);
    }

    [Fact]
    public async Task Un_lieu_rejete_ne_revient_pas_sur_la_carte()
    {
        using var moderated = WithManualModeration();
        var member = await moderated.CreateClient().RegisterAsync("Proposeur rejete");
        var admin = await moderated.CreateClient().LoginAsync("admin@nooks.local");

        var created = await (await member.PostPlaceAsync(NewPlace())).ReadAsync<PlaceDetailDto>();
        var rejected = await (await admin.PostAsync($"/api/admin/places/{created.Id}/reject", null)).ReadAsync<PlaceDetailDto>();

        Assert.Equal(PlaceStatus.Rejected, rejected.Status);

        var visible = await (await member.GetAsync($"/api/places?{ParisBbox}")).ReadAsync<List<PlaceSummaryDto>>();
        Assert.DoesNotContain(visible, place => place.Id == created.Id);
    }

    private static int _counter;

    /// <summary>Un lieu distinct par test, pour ne pas déclencher la détection de doublons.</summary>
    private static CreatePlaceRequest NewPlace()
    {
        var index = Interlocked.Increment(ref _counter);
        return new CreatePlaceRequest(
            $"Passage à valider n{index:D2}",
            "Une cour intérieure remplie de mosaïques, repérée par hasard.",
            PlaceCategory.Curiosity,
            48.8100 + index * 0.002,
            2.3550,
            null,
            "Paris",
            "France");
    }
}
