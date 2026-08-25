using System.Text.Json;
using System.Text.Json.Serialization;
using Nooks.Core.Abstractions;
using Nooks.Core.Entities;
using Nooks.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

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
        ("hugo@nooks.local", "Hugo", false)
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
        var created = await SeedPlacesAsync(context, provider.GetRequiredService<IPhotoStorage>(), users, cancellationToken);

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
        List<AppUser> users,
        CancellationToken cancellationToken)
    {
        if (await context.Places.AnyAsync(cancellationToken))
        {
            return 0;
        }

        var seedPlaces = await ReadSeedPlacesAsync(cancellationToken);

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

            // Chaque lieu porte une illustration : sans photo, il n'aurait pas de marqueur.
            using (var illustration = new MemoryStream(SeedPhotoFactory.Create(seed.Category, seed.Name)))
            {
                var stored = await storage.SaveAsync(place.Id, illustration, cancellationToken);
                place.AddPhoto(stored.FileName, stored.ThumbnailFileName, author.Id);
            }

            // Une note par membre au maximum : l'index du tableau détermine qui a noté.
            for (var ratingIndex = 0; ratingIndex < seed.Ratings.Length && ratingIndex < users.Count; ratingIndex++)
            {
                place.AddOrUpdateRating(users[ratingIndex].Id, seed.Ratings[ratingIndex], null);
            }

            context.Places.Add(place);
        }

        await context.SaveChangesAsync(cancellationToken);
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
