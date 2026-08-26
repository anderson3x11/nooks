using Nooks.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Nooks.Api.Endpoints;

public static class ImagesEndpoints
{
    public static IEndpointRouteBuilder MapImagesEndpoints(this IEndpointRouteBuilder app)
    {
        // Les photos vivent dans la base, pas sur un disque : c'est cet endpoint qui les
        // ressert. Leur nom contient un identifiant unique et leur contenu ne change
        // jamais, donc le navigateur peut les garder en cache sans jamais revenir.
        app.MapGet("/uploads/{**path}", async (
            string path,
            NooksDbContext dbContext,
            HttpContext context,
            CancellationToken cancellationToken) =>
        {
            var image = await dbContext.StoredImages
                .AsNoTracking()
                .Where(x => x.Path == $"uploads/{path}")
                .Select(x => x.Content)
                .FirstOrDefaultAsync(cancellationToken);

            if (image is null)
            {
                return Results.NotFound();
            }

            context.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
            return Results.File(image, "image/webp");
        }).ExcludeFromDescription();

        return app;
    }
}
