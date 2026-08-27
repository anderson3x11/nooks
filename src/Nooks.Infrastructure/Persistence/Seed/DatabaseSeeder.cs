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
        ("manon@nooks.local", "Manon", false),
        ("nadia@nooks.local", "Nadia", false),
        ("basile@nooks.local", "Basile", false),
        ("ines@nooks.local", "Ines", false),
        ("youssef@nooks.local", "Youssef", false),
        ("clara@nooks.local", "Clara", false),
        ("malo@nooks.local", "Malo", false),
        ("awa@nooks.local", "Awa", false),
        ("victor@nooks.local", "Victor", false),
        ("jeanne@nooks.local", "Jeanne", false),
        ("ravi@nooks.local", "Ravi", false),
        ("solene@nooks.local", "Solene", false),
        ("gaspard@nooks.local", "Gaspard", false),
        ("elodie@nooks.local", "Elodie", false),
        ("mehdi@nooks.local", "Mehdi", false),
        ("chloe@nooks.local", "Chloe", false),
        ("antoine@nooks.local", "Antoine", false),
        ("fanny@nooks.local", "Fanny", false),
        ("lucas@nooks.local", "Lucas", false),
        ("amel@nooks.local", "Amel", false),
        ("pierrick@nooks.local", "Pierrick", false),
        ("sarah@nooks.local", "Sarah", false),
        ("julien@nooks.local", "Julien", false),
        ("noemie@nooks.local", "Noemie", false),
        ("tanguy@nooks.local", "Tanguy", false),
        ("louise@nooks.local", "Louise", false)
    ];

    /// <summary>
    /// Commentaires de démonstration, rangés par ton. Ils restent volontairement
    /// génériques : inventer un avis circonstancié au nom d'une personne qui n'existe
    /// pas serait un faux. Le ton suit la note, sinon une étoile accompagnée de
    /// « magnifique » sauterait aux yeux.
    /// </summary>
    private static readonly string[] PraiseComments =
    [
        "Vraiment surprenant, et personne n'y était.",
        "À faire en fin de journée, la lumière change tout.",
        "Je passais devant depuis des années sans jamais m'arrêter.",
        "Le genre d'endroit dont on parle encore le lendemain.",
        "Une vraie curiosité, je ne m'y attendais pas du tout.",
        "Un détour largement justifié.",
        "Bien plus grand qu'il n'y paraît de l'extérieur.",
        "J'y retourne dès que j'ai des visiteurs.",
        "Belle découverte, merci à celui qui l'a ajouté.",
        "Ça vaut le coup rien que pour la vue.",
        "Un endroit qu'on ne trouve dans aucun guide.",
        "Calme, même en pleine saison.",
        "Parfait pour une pause au milieu d'une balade.",
        "On y reste plus longtemps que prévu.",
        "Exactement ce que je cherchais.",
    ];

    private static readonly string[] MixedComments =
    [
        "Sympa, sans plus, mais content d'y être passé.",
        "Moins spectaculaire que sur les photos, mais l'ambiance y est.",
        "Allez-y en semaine si vous pouvez.",
        "Prévoyez de bonnes chaussures.",
        "Attention aux horaires, très restreints.",
        "Intéressant dix minutes, pas beaucoup plus.",
        "Correct, mais il faut aimer le genre.",
        "Bien si vous êtes déjà dans le quartier.",
        "Un peu difficile à trouver, fléchage inexistant.",
        "Joli, mais bondé le week-end.",
    ];

    private static readonly string[] CriticalComments =
    [
        "Franchement décevant par rapport à ce qui est annoncé.",
        "Fermé sans explication alors que les horaires disaient l'inverse.",
        "Beaucoup de bruit pour pas grand-chose.",
        "L'endroit est laissé à l'abandon, c'est dommage.",
        "Impossible d'accéder, tout est barricadé.",
        "J'ai fait le déplacement pour rien.",
        "Sale et mal entretenu, je ne recommande pas.",
        "Aucun intérêt, passez votre chemin.",
        "Accueil désagréable, on ne s'est pas attardés.",
        "Trop cher pour ce que c'est.",
    ];

    /// <summary>Le ton du commentaire suit la note laissée.</summary>
    private static string? PickComment(int stars, int seed)
    {
        // Un avis sur quatre reste sans commentaire : tout le monde ne s'exprime pas.
        if (seed % 4 == 3)
        {
            return null;
        }

        var pool = stars switch
        {
            >= 4 => PraiseComments,
            3 => MixedComments,
            _ => CriticalComments,
        };

        return pool[seed % pool.Length];
    }

    /// <summary>
    /// Met la base au niveau du code. Rapide, et indispensable avant la première requête :
    /// à faire avant que l'application se mette à écouter.
    /// </summary>
    public static async Task MigrateDatabaseAsync(this IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var provider = scope.ServiceProvider;

        await provider.GetRequiredService<NooksDbContext>().Database.MigrateAsync(cancellationToken);

        // Les rôles existent dans tous les cas : sans eux, aucune inscription ne fonctionne.
        await SeedRolesAsync(provider.GetRequiredService<RoleManager<IdentityRole<Guid>>>());
    }

    /// <summary>
    /// Remplit le jeu de démonstration. Le premier passage télécharge les photos sur
    /// Wikipédia et dure plusieurs minutes : à lancer en arrière-plan, sinon l'hébergeur
    /// conclut que l'application ne démarre pas.
    /// </summary>
    public static async Task SeedDemoDataAsync(this IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var provider = scope.ServiceProvider;
        var logger = provider.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(DatabaseSeeder));

        var options = provider.GetRequiredService<IOptions<SeedOptions>>().Value;
        var context = provider.GetRequiredService<NooksDbContext>();

        if (!options.Demo)
        {
            logger.LogInformation("Jeu de démonstration désactivé (Seed:Demo).");
            return;
        }

        var users = await SeedUsersAsync(provider.GetRequiredService<UserManager<AppUser>>(), options.Password);
        var created = await SeedPlacesAsync(
            context,
            provider.GetRequiredService<IPhotoStorage>(),
            provider.GetRequiredService<WikimediaPhotoSource>(),
            options,
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

    private static async Task<List<AppUser>> SeedUsersAsync(UserManager<AppUser> userManager, string password)
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

                var result = await userManager.CreateAsync(user, password);
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
        var illustrated = 0;

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

            // Chaque lieu porte au moins une photo : sans elle, il n'aurait pas de marqueur.
            // On tente d'abord la vraie photo de son article Wikipédia, créditée. Les lieux
            // sans article ne déclenchent aucun appel réseau, ce qui garde le seed rapide.
            var sourced = options.FetchPhotos && seed.Wikipedia is not null
                ? await photoSource.TryFetchAsync(seed.Wikipedia, cancellationToken)
                : null;

            if (sourced is not null)
            {
                using var stream = new MemoryStream(sourced.Content);
                var stored = await storage.SaveAsync(place.Id, stream, cancellationToken);
                place.AddPhoto(stored.FileName, stored.ThumbnailFileName, author.Id, sourced.Attribution, sourced.SourceUrl);
                photographed++;
            }

            // Les photos restantes sont des illustrations générées, une variante par
            // position : c'est ce qui alimente le carrousel de la fiche.
            for (var photoIndex = place.Photos.Count; photoIndex < Math.Max(1, seed.Photos); photoIndex++)
            {
                using var illustration = new MemoryStream(SeedPhotoFactory.Create(seed.Category, seed.Name, photoIndex));
                var stored = await storage.SaveAsync(place.Id, illustration, cancellationToken);
                place.AddPhoto(stored.FileName, stored.ThumbnailFileName, author.Id);
            }

            // Une note par membre au maximum : l'index du tableau détermine qui a noté.
            // Les votants sont décalés d'un lieu à l'autre pour que les avis ne viennent
            // pas toujours des mêmes comptes.
            for (var ratingIndex = 0; ratingIndex < seed.Ratings.Length && ratingIndex < users.Count; ratingIndex++)
            {
                var voter = users[(index * 3 + ratingIndex) % users.Count];
                var stars = seed.Ratings[ratingIndex];
                var rating = place.AddOrUpdateRating(voter.Id, stars, PickComment(stars, index + ratingIndex));

                // Un avis sur cinq est illustré, un sur onze en porte deux : de quoi voir
                // le rendu sans transformer chaque fiche en galerie.
                var reviewPhotos = (index + ratingIndex) % 11 == 4 ? 2 : (index + ratingIndex) % 5 == 1 ? 1 : 0;
                for (var photo = 0; photo < reviewPhotos; photo++)
                {
                    using var illustration = new MemoryStream(
                        SeedPhotoFactory.Create(seed.Category, seed.Name, 100 + ratingIndex * 4 + photo));
                    var stored = await storage.SaveAsync(place.Id, illustration, cancellationToken);
                    rating.AddPhoto(stored.FileName, stored.ThumbnailFileName);
                    illustrated++;
                }
            }

            context.Places.Add(place);
        }

        await context.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Photos : {Photographed} depuis Wikipédia, {Generated} illustrations de lieux, {Illustrated} sur des avis.",
            photographed,
            seedPlaces.Sum(p => Math.Max(1, p.Photos)) - photographed,
            illustrated);

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
