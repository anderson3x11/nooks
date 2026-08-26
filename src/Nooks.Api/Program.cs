using System.Text;
using System.Text.RegularExpressions;
using System.Text.Json.Serialization;
using Nooks.Api.Auth;
using Nooks.Api.Endpoints;
using Nooks.Api.Infrastructure;
using Nooks.Infrastructure;
using Nooks.Infrastructure.Identity;
using Nooks.Infrastructure.Persistence;
using Nooks.Infrastructure.Persistence.Seed;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddInfrastructure(builder.Configuration);

builder.Services
    .AddIdentityCore<AppUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequiredLength = 8;
        options.Password.RequireNonAlphanumeric = false;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<NooksDbContext>();

builder.Services.Configure<ModerationOptions>(builder.Configuration.GetSection(ModerationOptions.SectionName));
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.AddSingleton<TokenService>();

var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
          ?? throw new InvalidOperationException("Section de configuration Jwt manquante.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization(options =>
    options.AddPolicy(AuthPolicies.Admin, policy => policy.RequireRole(AppRoles.Admin)));

builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
    .AllowAnyHeader()
    .AllowAnyMethod()));

// Les énumérations circulent en texte : « Museum » se lit mieux qu'un 2 côté client.
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// Les réponses JSON de la carte sont répétitives et se compressent très bien.
builder.Services.AddResponseCompression(options => options.EnableForHttps = true);

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<DomainExceptionHandler>();
builder.Services.AddOpenApi();

var app = builder.Build();

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

// Migrations appliquées à chaque démarrage, y compris en production : le conteneur
// doit pouvoir partir d'une base vide.
await app.Services.MigrateDatabaseAsync();

// Le jeu de démonstration, lui, dépend de Seed:Demo. Son premier passage télécharge les
// photos sur Wikipédia et prend plusieurs minutes : en production on le lance une fois
// l'application en écoute, sinon l'hébergeur conclut qu'elle ne démarre pas. En local on
// l'attend, pour ne pas se retrouver devant une carte vide sans savoir pourquoi.
if (app.Environment.IsDevelopment())
{
    await app.Services.SeedDemoDataAsync();
}
else
{
    app.Lifetime.ApplicationStarted.Register(() => _ = Task.Run(async () =>
    {
        try
        {
            await app.Services.SeedDemoDataAsync(app.Lifetime.ApplicationStopping);
        }
        catch (Exception exception)
        {
            app.Logger.LogError(exception, "Le jeu de démonstration n'a pas pu être inséré.");
        }
    }));
}

app.UseResponseCompression();
app.UseCors();

// L'API sert aussi le site Angular, déposé dans wwwroot à la construction de l'image.
// Une seule application à déployer, donc pas de second hébergeur ni de question de CORS.
var staticFiles = new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        // Angular signe le nom de ses fichiers avec une empreinte du contenu : ceux-là
        // ne changent jamais et peuvent rester un an en cache. Les autres, index.html
        // en tête, doivent être revalidés, sinon un déploiement passerait inaperçu.
        var fingerprinted = FingerprintedAsset().IsMatch(context.Context.Request.Path.Value ?? string.Empty);

        context.Context.Response.Headers.CacheControl = fingerprinted
            ? "public, max-age=31536000, immutable"
            : "no-cache";
    },
};

app.UseStaticFiles(staticFiles);

app.UseAuthentication();
app.UseAuthorization();

// Sonde de vie pour l'hébergeur : volontairement sans accès à la base, pour
// distinguer « le processus tourne » de « la base répond ».
app.MapGet("/health", () => Results.Ok(new { status = "ok" })).ExcludeFromDescription();

app.MapAuthEndpoints();
app.MapPlacesEndpoints();
app.MapGeocodeEndpoints();
app.MapAdminEndpoints();
app.MapMembersEndpoints();
app.MapImagesEndpoints();

// Toute route inconnue rend index.html : c'est le routeur Angular qui décide de la suite.
// Placé après les endpoints, donc /api et /health gardent la priorité. Les mêmes options
// que plus haut, pour que la page reçoive aussi son en-tête de cache.
app.MapFallbackToFile("index.html", staticFiles);

app.Run();

/// <summary>Rend la classe visible aux tests d'intégration via WebApplicationFactory.</summary>
public partial class Program
{
    /// <summary>Empreinte de contenu ajoutée par Angular au nom de ses fichiers, par exemple main-A1B2C3D4.js.</summary>
    [GeneratedRegex(@"-[A-Z0-9]{8,}\.(js|css)$")]
    private static partial Regex FingerprintedAsset();
}
