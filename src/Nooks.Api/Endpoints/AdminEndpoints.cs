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

        return app;
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
