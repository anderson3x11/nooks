using System.Globalization;
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
    string Country)
{
    /// <summary>
    /// La création arrive en multipart, puisqu'elle transporte les photos du lieu.
    /// On lit donc les champs du formulaire plutôt qu'un corps JSON.
    /// </summary>
    public static bool TryParse(IFormCollection form, out CreatePlaceRequest request, out string? error)
    {
        request = null!;
        error = null;

        if (!TryDouble(form, "latitude", out var latitude, out error) ||
            !TryDouble(form, "longitude", out var longitude, out error))
        {
            return false;
        }

        var categoryValue = form["category"].ToString();
        if (!Enum.TryParse<PlaceCategory>(categoryValue, ignoreCase: true, out var category))
        {
            error = $"Catégorie inconnue : « {categoryValue} ».";
            return false;
        }

        request = new CreatePlaceRequest(
            form["name"].ToString(),
            form["description"].ToString(),
            category,
            latitude,
            longitude,
            form["address"].ToString(),
            form["city"].ToString(),
            form["country"].ToString());

        return true;
    }

    private static bool TryDouble(IFormCollection form, string key, out double value, out string? error)
    {
        error = null;
        if (double.TryParse(form[key].ToString(), NumberStyles.Float, CultureInfo.InvariantCulture, out value))
        {
            return true;
        }

        error = $"Le champ « {key} » est absent ou n'est pas un nombre.";
        return false;
    }
}

public sealed record RatePlaceRequest(int Stars, string? Comment);
