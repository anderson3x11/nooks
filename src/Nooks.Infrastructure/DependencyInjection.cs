using Nooks.Core.Abstractions;
using Nooks.Infrastructure.Geocoding;
using Nooks.Infrastructure.Persistence;
using Nooks.Infrastructure.Persistence.Repositories;
using Nooks.Infrastructure.Persistence.Seed;
using Nooks.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Nooks.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // DATABASE_URL est la variable que branchent seuls les hébergeurs ; la chaîne
        // classique reste prioritaire pour le développement local.
        var connectionString = configuration.GetConnectionString("Default")
                               ?? configuration["DATABASE_URL"]
                               ?? throw new InvalidOperationException(
                                   "Aucune base configurée : renseignez ConnectionStrings__Default ou DATABASE_URL.");

        services.AddDbContext<NooksDbContext>(options =>
            options.UseNpgsql(
                ConnectionString.Normalize(connectionString),
                npgsql => npgsql.UseNetTopologySuite()));

        services.AddScoped<IPlaceRepository, PlaceRepository>();
        services.AddScoped<IProfileRepository, ProfileRepository>();

        services.AddMemoryCache();
        services.Configure<NominatimOptions>(configuration.GetSection(NominatimOptions.SectionName));
        services.AddHttpClient<IGeocodingService, NominatimGeocodingService>((provider, client) =>
        {
            var options = provider.GetRequiredService<IOptions<NominatimOptions>>().Value;
            client.BaseAddress = new Uri(options.BaseUrl);
            client.DefaultRequestHeaders.UserAgent.ParseAdd(options.UserAgent);
            client.Timeout = TimeSpan.FromSeconds(10);
        });

        services.Configure<SeedOptions>(configuration.GetSection(SeedOptions.SectionName));
        services.AddHttpClient<WikimediaPhotoSource>((provider, client) =>
        {
            var options = provider.GetRequiredService<IOptions<SeedOptions>>().Value;
            client.DefaultRequestHeaders.UserAgent.ParseAdd(options.UserAgent);
            client.Timeout = TimeSpan.FromSeconds(20);
        });

        services.Configure<PhotoStorageOptions>(configuration.GetSection(PhotoStorageOptions.SectionName));
        services.AddScoped<IPhotoStorage, DatabasePhotoStorage>();

        return services;
    }
}
