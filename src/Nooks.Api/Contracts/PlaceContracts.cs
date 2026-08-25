using Nooks.Core.Entities;

namespace Nooks.Api.Contracts;

public sealed record CreatePlaceRequest(
    string Name,
    string Description,
    PlaceCategory Category,
    double Latitude,
    double Longitude,
    string? Address,
    string City,
    string Country);

public sealed record RatePlaceRequest(int Stars, string? Comment);
