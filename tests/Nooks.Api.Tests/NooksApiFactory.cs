using Nooks.Core.Abstractions;
using Nooks.Core.Dtos;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Testcontainers.PostgreSql;

namespace Nooks.Api.Tests;

/// <summary>
/// Démarre l'API sur une vraie base PostGIS jetable. Les requêtes spatiales n'ont pas
/// d'équivalent en base mémoire, donc les tester à vide n'aurait aucune valeur.
/// </summary>
public sealed class NooksApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _database = new PostgreSqlBuilder("postgis/postgis:17-3.5")
        .WithDatabase("nooks")
        .WithUsername("nooks")
        .WithPassword("nooks")
        .Build();

    public async Task InitializeAsync() => await _database.StartAsync();

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await _database.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // L'environnement Development déclenche les migrations et le jeu de données de démonstration.
        builder.UseEnvironment("Development");
        builder.UseSetting("ConnectionStrings:Default", _database.GetConnectionString());

        builder.ConfigureTestServices(services =>
        {
            // Aucun appel réseau pendant les tests : Nominatim est remplacé par une réponse fixe.
            services.RemoveAll<IGeocodingService>();
            services.AddSingleton<IGeocodingService, FakeGeocodingService>();
        });
    }
}

public sealed class FakeGeocodingService : IGeocodingService
{
    public static readonly GeocodeResultDto Lyon =
        new("Lyon, Métropole de Lyon, France", 45.7578, 4.8320, 4.7718, 45.7073, 4.8983, 45.8082);

    public Task<IReadOnlyList<GeocodeResultDto>> SearchAsync(string query, CancellationToken cancellationToken)
        => Task.FromResult<IReadOnlyList<GeocodeResultDto>>(
            query.Contains("lyon", StringComparison.OrdinalIgnoreCase) ? [Lyon] : []);
}

[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<NooksApiFactory>
{
    public const string Name = "api";
}
