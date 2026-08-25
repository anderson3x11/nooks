using System.Security.Claims;
using Nooks.Api.Auth;
using Nooks.Api.Contracts;
using Nooks.Api.Infrastructure;
using Nooks.Core.Abstractions;
using Nooks.Core.Common;
using Nooks.Core.Dtos;
using Nooks.Core.Entities;
using Nooks.Infrastructure.Identity;
using Microsoft.Extensions.Options;

namespace Nooks.Api.Endpoints;

public static class PlacesEndpoints
{
    public static IEndpointRouteBuilder MapPlacesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/places").WithTags("Places");

        group.MapGet("/", SearchAsync);
        group.MapGet("/{id:guid}", GetDetailAsync);
        group.MapPost("/", CreateAsync).RequireAuthorization();
        group.MapPut("/{id:guid}/rating", RateAsync).RequireAuthorization();
        group.MapPost("/{id:guid}/photos", UploadPhotoAsync).RequireAuthorization().DisableAntiforgery();

        return app;
    }

    private static async Task<IResult> SearchAsync(
        string? bbox,
        string? categories,
        double? minRating,
        string? q,
        IPlaceRepository repository,
        CancellationToken cancellationToken)
    {
        if (!GeoBounds.TryParse(bbox, out var bounds, out var boundsError))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]> { ["bbox"] = [boundsError!] });
        }

        if (!TryParseCategories(categories, out var parsedCategories, out var categoriesError))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]> { ["categories"] = [categoriesError!] });
        }

        var query = new PlaceSearchQuery(bounds, parsedCategories, minRating, q);
        return Results.Ok(await repository.SearchAsync(query, cancellationToken));
    }

    private static async Task<IResult> GetDetailAsync(
        Guid id,
        ClaimsPrincipal principal,
        IPlaceRepository repository,
        CancellationToken cancellationToken)
    {
        var place = await repository.GetDetailAsync(id, principal.IsInRole(AppRoles.Admin), cancellationToken);
        return place is null ? Results.NotFound() : Results.Ok(place);
    }

    private static async Task<IResult> CreateAsync(
        CreatePlaceRequest request,
        ClaimsPrincipal principal,
        IPlaceRepository repository,
        IOptions<ModerationOptions> moderation,
        CancellationToken cancellationToken)
    {
        var status = moderation.Value.AutoApprove ? PlaceStatus.Approved : PlaceStatus.Pending;

        var place = Place.Create(
            request.Name,
            request.Description,
            request.Category,
            request.Latitude,
            request.Longitude,
            request.Address,
            request.City,
            request.Country,
            principal.GetUserId(),
            status);

        await repository.AddAsync(place, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);

        var detail = await repository.GetDetailAsync(place.Id, includeUnapproved: true, cancellationToken);
        return Results.Created($"/api/places/{place.Id}", detail);
    }

    private static async Task<IResult> RateAsync(
        Guid id,
        RatePlaceRequest request,
        ClaimsPrincipal principal,
        IPlaceRepository repository,
        CancellationToken cancellationToken)
    {
        var place = await repository.GetForUpdateAsync(id, cancellationToken);
        if (place is null || place.Status != PlaceStatus.Approved)
        {
            return Results.NotFound();
        }

        place.AddOrUpdateRating(principal.GetUserId(), request.Stars, request.Comment);
        await repository.SaveChangesAsync(cancellationToken);

        return Results.Ok(await repository.GetDetailAsync(id, includeUnapproved: false, cancellationToken));
    }

    private static async Task<IResult> UploadPhotoAsync(
        Guid id,
        IFormFile file,
        ClaimsPrincipal principal,
        IPlaceRepository repository,
        IPhotoStorage storage,
        CancellationToken cancellationToken)
    {
        var place = await repository.GetForUpdateAsync(id, cancellationToken);
        if (place is null)
        {
            return Results.NotFound();
        }

        await using var stream = file.OpenReadStream();
        var stored = await storage.SaveAsync(place.Id, stream, cancellationToken);

        place.AddPhoto(stored.FileName, stored.ThumbnailFileName, principal.GetUserId());
        await repository.SaveChangesAsync(cancellationToken);

        return Results.Ok(await repository.GetDetailAsync(id, includeUnapproved: true, cancellationToken));
    }

    private static bool TryParseCategories(string? value, out IReadOnlyCollection<PlaceCategory> categories, out string? error)
    {
        categories = [];
        error = null;

        if (string.IsNullOrWhiteSpace(value))
        {
            return true;
        }

        var parsed = new List<PlaceCategory>();
        foreach (var name in value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (!Enum.TryParse<PlaceCategory>(name, ignoreCase: true, out var category))
            {
                error = $"Catégorie inconnue : « {name} ».";
                return false;
            }

            parsed.Add(category);
        }

        categories = parsed;
        return true;
    }
}
