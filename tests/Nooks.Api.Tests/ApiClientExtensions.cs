using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Nooks.Api.Contracts;
using System.Globalization;
using Nooks.Api.Contracts;
using Nooks.Infrastructure.Persistence.Seed;

namespace Nooks.Api.Tests;

public static class ApiClientExtensions
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    public static async Task<HttpClient> LoginAsync(this HttpClient client, string email)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, DatabaseSeeder.DemoPassword));
        response.EnsureSuccessStatusCode();

        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>(Json);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return client;
    }

    public static async Task<HttpClient> RegisterAsync(this HttpClient client, string displayName)
    {
        var email = $"{Guid.NewGuid():N}@nooks.test";
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, DatabaseSeeder.DemoPassword, displayName));
        response.EnsureSuccessStatusCode();

        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>(Json);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return client;
    }

    /// <summary>
    /// Poste un lieu comme le fait le front : en multipart, avec au moins une photo.
    /// L'image vient du générateur du seed, c'est un vrai PNG décodable.
    /// </summary>
    public static Task<HttpResponseMessage> PostPlaceAsync(this HttpClient client, CreatePlaceRequest request, int photoCount = 1)
    {
        var content = new MultipartFormDataContent
        {
            { new StringContent(request.Name), "name" },
            { new StringContent(request.Description), "description" },
            { new StringContent(request.Category.ToString()), "category" },
            { new StringContent(request.Latitude.ToString(CultureInfo.InvariantCulture)), "latitude" },
            { new StringContent(request.Longitude.ToString(CultureInfo.InvariantCulture)), "longitude" },
            { new StringContent(request.Address ?? string.Empty), "address" },
            { new StringContent(request.City), "city" },
            { new StringContent(request.Country), "country" },
        };

        for (var i = 0; i < photoCount; i++)
        {
            var photo = new ByteArrayContent(SeedPhotoFactory.Create(request.Category, $"{request.Name}-{i}"));
            photo.Headers.ContentType = new MediaTypeHeaderValue("image/png");
            content.Add(photo, "photos", $"photo-{i}.png");
        }

        return client.PostAsync("/api/places", content);
    }

    public static async Task<T> ReadAsync<T>(this HttpResponseMessage response)
    {
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<T>(Json))!;
    }
}
