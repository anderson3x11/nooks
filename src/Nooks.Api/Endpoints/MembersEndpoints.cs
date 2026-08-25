using System.Security.Claims;
using Nooks.Api.Auth;
using Nooks.Api.Contracts;
using Nooks.Core.Abstractions;

namespace Nooks.Api.Endpoints;

public static class MembersEndpoints
{
    public static IEndpointRouteBuilder MapMembersEndpoints(this IEndpointRouteBuilder app)
    {
        var members = app.MapGroup("/api/members").WithTags("Members");

        members.MapGet("/{id:guid}", GetProfileAsync);

        var me = app.MapGroup("/api/me").WithTags("Members").RequireAuthorization();

        me.MapGet("/", GetOwnProfileAsync);
        me.MapPut("/", UpdateProfileAsync);
        me.MapPost("/avatar", UploadAvatarAsync).DisableAntiforgery();
        me.MapGet("/favorites", ListFavoritesAsync);

        app.MapPost("/api/places/{id:guid}/favorite", ToggleFavoriteAsync)
            .WithTags("Members")
            .RequireAuthorization();

        return app;
    }

    /// <summary>Profil public : les favoris d'un membre ne regardent que lui.</summary>
    private static async Task<IResult> GetProfileAsync(
        Guid id,
        ClaimsPrincipal principal,
        IProfileRepository profiles,
        CancellationToken cancellationToken)
    {
        var isOwner = principal.Identity?.IsAuthenticated == true && principal.GetUserId() == id;
        var profile = await profiles.GetProfileAsync(id, isOwner, cancellationToken);

        return profile is null ? Results.NotFound() : Results.Ok(profile);
    }

    private static async Task<IResult> GetOwnProfileAsync(
        ClaimsPrincipal principal,
        IProfileRepository profiles,
        CancellationToken cancellationToken)
    {
        var profile = await profiles.GetProfileAsync(principal.GetUserId(), includePrivate: true, cancellationToken);
        return profile is null ? Results.NotFound() : Results.Ok(profile);
    }

    private static async Task<IResult> UpdateProfileAsync(
        UpdateProfileRequest request,
        ClaimsPrincipal principal,
        IProfileRepository profiles,
        CancellationToken cancellationToken)
    {
        await profiles.UpdateProfileAsync(principal.GetUserId(), request.DisplayName, request.Bio, cancellationToken);
        return Results.Ok(await profiles.GetProfileAsync(principal.GetUserId(), includePrivate: true, cancellationToken));
    }

    private static async Task<IResult> UploadAvatarAsync(
        IFormFile file,
        ClaimsPrincipal principal,
        IProfileRepository profiles,
        IPhotoStorage storage,
        CancellationToken cancellationToken)
    {
        var userId = principal.GetUserId();

        await using var stream = file.OpenReadStream();
        var fileName = await storage.SaveAvatarAsync(userId, stream, cancellationToken);
        await profiles.SetAvatarAsync(userId, fileName, cancellationToken);

        return Results.Ok(await profiles.GetProfileAsync(userId, includePrivate: true, cancellationToken));
    }

    private static async Task<IResult> ListFavoritesAsync(
        ClaimsPrincipal principal,
        IProfileRepository profiles,
        CancellationToken cancellationToken)
        => Results.Ok(await profiles.ListFavoritesAsync(principal.GetUserId(), cancellationToken));

    private static async Task<IResult> ToggleFavoriteAsync(
        Guid id,
        ClaimsPrincipal principal,
        IProfileRepository profiles,
        CancellationToken cancellationToken)
    {
        var isFavorite = await profiles.ToggleFavoriteAsync(principal.GetUserId(), id, cancellationToken);
        return Results.Ok(new { isFavorite });
    }
}
