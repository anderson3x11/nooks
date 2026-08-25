using System.Text.Json;
using System.Text.Json.Serialization;
using Nooks.Core.Abstractions;
using Nooks.Core.Entities;
using Nooks.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Nooks.Infrastructure.Persistence.Seed;

/// <summary>
/// Remplit la base au démarrage en développement : migrations, rôles, comptes de démonstration
/// et lieux de départ. Idempotent, on peut relancer l'API sans rien dupliquer.
/// </summary>
public static class DatabaseSeeder
{
    public const string DemoPassword = "Nooks!2026";
    private const string ResourceName = "Nooks.Infrastructure.Persistence.Seed.places.json";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private static readonly (string Email, string DisplayName, bool IsAdmin)[] DemoUsers =
    [
        ("admin@nooks.local", "Admin Nooks", true),
        ("camille@nooks.local", "Camille", false),
        ("hugo@nooks.local", "Hugo", false),
        ("lea@nooks.local", "Lea", false),
        ("karim@nooks.local", "Karim", false),
        ("sofia@nooks.local", "Sofia", false),
        ("thomas@nooks.local", "Thomas", false),
        ("manon@nooks.local", "Manon", false)
    ];

    /// <summary>
    /// Commentaires de démonstration. Ils sont volontairement génériques : inventer
    /// un avis circonstancié au nom d'une personne qui n'existe pas serait un faux.
    /// </summary>
    private static readonly string[] DemoComments =
    [
        "Vraiment surprenant, et personne n'y était.",
        "À faire en fin de journée, la lumière change tout.",
        "Je passais devant depuis des années sans jamais m'arrêter.",
        "Petit mais on y reste plus longtemps que prévu.",
        "Arrivez tôt, ça se remplit vite le week-end.",
        "Exactement le genre d'endroit pour lequel j'utilise cette carte.",
        "Un peu difficile à trouver, la ruelle n'est pas indiquée.",
        "Gratuit, et franchement mieux que beaucoup de payants.",
        "Emmené des amis de passage, ils ont adoré.",
        "Moins spectaculaire que sur les photos, mais l'ambiance y est.",
        "Allez-y en semaine si vous pouvez.",
        "Une vraie curiosité, je ne m'y attendais pas du tout.",
        "Prévoyez de bonnes chaussures.",
        "Le genre d'endroit dont on parle encore le lendemain.",
        "Calme, même en pleine saison.",
        "Un détour largement justifié.",
        "Bien plus grand qu'il n'y paraît de l'extérieur.",
        "J'y retourne dès que j'ai des visiteurs.",
        "Attention aux horaires, très restreints.",
        "Belle découverte, merci à celui qui l'a ajouté.",
        "Ça vaut le coup rien que pour la vue.",
        "Un endroit qu'on ne trouve dans aucun guide.",
        "Parfait pour une pause au milieu d'une balade.",
        "Sympa, sans plus, mais content d'y être passé."
    ];

    public static async Task SeedDatabaseAsync(this IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var provider = scope.ServiceProvider;
        var logger = provider.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(DatabaseSeeder));

        var context = provider.GetRequiredService<NooksDbContext>();
        await context.Database.MigrateAsync(cancellationToken);

        await SeedRolesAsync(provider.GetRequiredService<RoleManager<IdentityRole<Guid>>>());
        var users = await SeedUsersAsync(provider.GetRequiredService<UserManager<AppUser>>());
        var created = await SeedPlacesAsync(
            context,
            provider.GetRequiredService<IPhotoStorage>(),
            provider.GetRequiredService<WikimediaPhotoSource>(),
            provider.GetRequiredService<IOptions<SeedOptions>>().Value,
            users,
            logger,
            cancellationToken);

        logger.LogInformation("Seed terminé : {UserCount} comptes de démonstration, {PlaceCount} lieux ajoutés.", users.Count, created);
    }

    private static async Task SeedRolesAsync(RoleManager<IdentityRole<Guid>> roleManager)
    {
        foreach (var role in AppRoles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole<Guid> { Id = Guid.NewGuid(), Name = role });
            }
        }
    }

    private static async Task<List<AppUser>> SeedUsersAsync(UserManager<AppUser> userManager)
    {
        var users = new List<AppUser>();

        foreach (var (email, displayName, isAdmin) in DemoUsers)
        {
            var user = await userManager.FindByEmailAsync(email);
            if (user is null)
            {
                user = new AppUser
                {
                    Id = Guid.NewGuid(),
                    UserName = email,
                    Email = email,
                    EmailConfirmed = true,
                    DisplayName = displayName
                };

                var result = await userManager.CreateAsync(user, DemoPassword);
                if (!result.Succeeded)
                {
                    throw new InvalidOperationException(
                        $"Création du compte de démonstration {email} impossible : {string.Join(", ", result.Errors.Select(e => e.Description))}");
                }

                await userManager.AddToRoleAsync(user, AppRoles.Member);
                if (isAdmin)
                {
                    await userManager.AddToRoleAsync(user, AppRoles.Admin);
                }
            }

            users.Add(user);
        }

        return users;
    }

    private static async Task<int> SeedPlacesAsync(
        NooksDbContext context,
        IPhotoStorage storage,
        WikimediaPhotoSource photoSource,
        SeedOptions options,
        List<AppUser> users,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        if (await context.Places.AnyAsync(cancellationToken))
        {
            return 0;
        }

        var seedPlaces = await ReadSeedPlacesAsync(cancellationToken);
        var photographed = 0;

        for (var index = 0; index < seedPlaces.Count; index++)
        {
            var seed = seedPlaces[index];
            var author = users[index % users.Count];

            var place = Place.Create(
                seed.Name,
                seed.Description,
                seed.Category,
                seed.Latitude,
                seed.Longitude,
                seed.Address,
                seed.City,
                seed.Country,
                author.Id,
                PlaceStatus.Approved);

            // Chaque lieu porte une photo : sans elle, il n'aurait pas de marqueur.
            // On tente d'abord la vraie photo de son article Wikipédia, créditée.
            var sourced = options.FetchPhotos
                ? await photoSource.TryFetchAsync(seed.Wikipedia ?? seed.Name, cancellationToken)
                : null;

            if (sourced is not null)
            {
                using var stream = new MemoryStream(sourced.Content);
                var stored = await storage.SaveAsync(place.Id, stream, cancellationToken);
                place.AddPhoto(stored.FileName, stored.ThumbnailFileName, author.Id, sourced.Attribution, sourced.SourceUrl);
                photographed++;
            }
            else
            {
                using var illustration = new MemoryStream(SeedPhotoFactory.Create(seed.Category, seed.Name));
                var stored = await storage.SaveAsync(place.Id, illustration, cancellationToken);
                place.AddPhoto(stored.FileName, stored.ThumbnailFileName, author.Id);
            }

            // Une note par membre au maximum : l'index du tableau détermine qui a noté.
            // Les votants sont décalés d'un lieu à l'autre pour que les avis ne viennent
            // pas toujours des trois mêmes comptes.
            for (var ratingIndex = 0; ratingIndex < seed.Ratings.Length && ratingIndex < users.Count; ratingIndex++)
            {
                var voter = users[(index + ratingIndex) % users.Count];
                var comment = (index + ratingIndex) % 3 == 2
                    ? null
                    : DemoComments[(index * 3 + ratingIndex) % DemoComments.Length];

                place.AddOrUpdateRating(voter.Id, seed.Ratings[ratingIndex], comment);
            }

            context.Places.Add(place);
        }

        await context.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Photos : {Photographed} vraies photos Wikipédia, {Generated} illustrations générées.",
            photographed,
            seedPlaces.Count - photographed);

        return seedPlaces.Count;
    }

    private static async Task<List<SeedPlace>> ReadSeedPlacesAsync(CancellationToken cancellationToken)
    {
        await using var stream = typeof(DatabaseSeeder).Assembly.GetManifestResourceStream(ResourceName)
            ?? throw new InvalidOperationException($"Ressource embarquée introuvable : {ResourceName}");

        return await JsonSerializer.DeserializeAsync<List<SeedPlace>>(stream, JsonOptions, cancellationToken)
               ?? throw new InvalidOperationException("Le fichier places.json est vide ou invalide.");
    }
}
