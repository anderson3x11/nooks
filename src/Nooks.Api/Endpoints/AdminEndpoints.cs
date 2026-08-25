using System.Security.Claims;
using Nooks.Api.Auth;
using Nooks.Core.Abstractions;
using Nooks.Core.Entities;

namespace Nooks.Api.Endpoints;

public static class AdminEndpoints
{
    public static IEndpointRouteBuilder MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/places")
            .WithTags("Admin")
            .RequireAuthorization(AuthPolicies.Admin);

        group.MapGet("/", async (PlaceStatus? status, IPlaceRepository repository, CancellationToken cancellationToken)
            => Results.Ok(await repository.GetByStatusAsync(status ?? PlaceStatus.Pending, cancellationToken)));

        group.MapPost("/{id:guid}/approve", (Guid id, IPlaceRepository repository, CancellationToken cancellationToken)
            => ReviewAsync(id, repository, place => place.Approve(), cancellationToken));

        group.MapPost("/{id:guid}/reject", (Guid id, IPlaceRepository repository, CancellationToken cancellationToken)
            => ReviewAsync(id, repository, place => place.Reject(), cancellationToken));

        group.MapDelete("/{id:guid}", DeletePlaceAsync);

        var ratings = app.MapGroup("/api/admin/ratings")
            .WithTags("Admin")
            .RequireAuthorization(AuthPolicies.Admin);

        ratings.MapGet("/", (bool? removedOnly, IPlaceRepository repository, CancellationToken cancellationToken)
            => ListRatingsAsync(removedOnly ?? false, repository, cancellationToken));

        ratings.MapPost("/{placeId:guid}/{ratingId:guid}/remove", RemoveRatingAsync);
        ratings.MapPost("/{placeId:guid}/{ratingId:guid}/restore", RestoreRatingAsync);
        ratings.MapDelete("/{placeId:guid}/{ratingId:guid}", DeleteRatingAsync);

        app.MapGet("/api/admin/members", ListMembersAsync)
            .WithTags("Admin")
            .RequireAuthorization(AuthPolicies.Admin);

        return app;
    }

    /// <summary>Nombre d'avis rapportés à la modération en une fois.</summary>
    private const int RatingPageSize = 200;

    private static async Task<IResult> ListRatingsAsync(
        bool removedOnly,
        IPlaceRepository repository,
        CancellationToken cancellationToken)
        => Results.Ok(await repository.ListRatingsAsync(removedOnly, RatingPageSize, cancellationToken));

    private static async Task<IResult> ListMembersAsync(IProfileRepository profiles, CancellationToken cancellationToken)
        => Results.Ok(await profiles.ListMembersAsync(cancellationToken));

    /// <summary>Suppression définitive : le lieu, ses avis et ses photos partent avec lui.</summary>
    private static async Task<IResult> DeletePlaceAsync(
        Guid id,
        IPlaceRepository repository,
        CancellationToken cancellationToken)
    {
        var place = await repository.GetForUpdateAsync(id, cancellationToken);
        if (place is null)
        {
            return Results.NotFound();
        }

        await repository.DeleteAsync(place, cancellationToken);
        return Results.NoContent();
    }

    private static Task<IResult> RemoveRatingAsync(
        Guid placeId,
        Guid ratingId,
        ClaimsPrincipal principal,
        IPlaceRepository repository,
        CancellationToken cancellationToken)
        => ModerateRatingAsync(placeId, repository, place => place.RemoveRating(ratingId, principal.GetUserId()), cancellationToken);

    private static Task<IResult> RestoreRatingAsync(
        Guid placeId,
        Guid ratingId,
        IPlaceRepository repository,
        CancellationToken cancellationToken)
        => ModerateRatingAsync(placeId, repository, place => place.RestoreRating(ratingId), cancellationToken);

    private static Task<IResult> DeleteRatingAsync(
        Guid placeId,
        Guid ratingId,
        IPlaceRepository repository,
        CancellationToken cancellationToken)
        => ModerateRatingAsync(placeId, repository, place => place.DeleteRating(ratingId), cancellationToken);

    private static async Task<IResult> ModerateRatingAsync(
        Guid placeId,
        IPlaceRepository repository,
        Action<Place> decision,
        CancellationToken cancellationToken)
    {
        var place = await repository.GetForUpdateAsync(placeId, cancellationToken);
        if (place is null)
        {
            return Results.NotFound();
        }

        decision(place);
        await repository.SaveChangesAsync(cancellationToken);

        return Results.Ok(await repository.GetDetailAsync(placeId, includeUnapproved: true, cancellationToken));
    }

    private static async Task<IResult> ReviewAsync(
        Guid id,
        IPlaceRepository repository,
        Action<Place> decision,
        CancellationToken cancellationToken)
    {
        var place = await repository.GetForUpdateAsync(id, cancellationToken);
        if (place is null)
        {
            return Results.NotFound();
        }

        decision(place);
        await repository.SaveChangesAsync(cancellationToken);

        return Results.Ok(await repository.GetDetailAsync(id, includeUnapproved: true, cancellationToken));
    }
}
