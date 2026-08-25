using Nooks.Core.Abstractions;

namespace Nooks.Api.Endpoints;

public static class GeocodeEndpoints
{
    public static IEndpointRouteBuilder MapGeocodeEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/geocode", async (string? q, IGeocodingService geocoding, CancellationToken cancellationToken) =>
            {
                if (string.IsNullOrWhiteSpace(q))
                {
                    return Results.ValidationProblem(new Dictionary<string, string[]>
                    {
                        ["q"] = ["Indiquez le nom de la ville à rechercher."]
                    });
                }

                return Results.Ok(await geocoding.SearchAsync(q, cancellationToken));
            })
            .WithTags("Geocode");

        return app;
    }
}
