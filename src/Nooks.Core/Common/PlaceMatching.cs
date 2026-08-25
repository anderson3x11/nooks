using System.Globalization;
using System.Text;

namespace Nooks.Core.Common;

/// <summary>
/// Règles de rapprochement entre un lieu proposé et ceux déjà présents.
/// Le but n'est pas de détecter toutes les redites, mais d'attraper les deux cas
/// fréquents sans bloquer les voisins légitimes : deux boutiques d'une même rue
/// doivent pouvoir coexister.
/// </summary>
public static class PlaceMatching
{
    /// <summary>Rayon de recherche des candidats autour du point proposé.</summary>
    public const double SearchRadiusInMeters = 500;

    /// <summary>Au-delà, deux lieux de même nom sont considérés comme distincts.</summary>
    public const double SameNameRadiusInMeters = 500;

    /// <summary>Très près et dans la même catégorie, c'est presque sûrement le même lieu.</summary>
    public const double SameCategoryRadiusInMeters = 75;

    private static readonly string[] Articles = ["le", "la", "les", "du", "de", "des", "un", "une", "au", "aux"];

    /// <summary>
    /// Un candidat est un doublon probable s'il porte le même nom à moins de 500 m,
    /// ou s'il partage la catégorie à moins de 75 m.
    /// </summary>
    public static bool LooksLikeDuplicate(
        string proposedName,
        bool sameCategory,
        string candidateName,
        double distanceInMeters)
    {
        if (distanceInMeters <= SameCategoryRadiusInMeters && sameCategory)
        {
            return true;
        }

        return distanceInMeters <= SameNameRadiusInMeters && NamesMatch(proposedName, candidateName);
    }

    /// <summary>
    /// Deux noms se rejoignent s'ils sont identiques une fois normalisés, ou si
    /// l'un contient l'autre : « Miroir d'eau » et « Le miroir d'eau de Bordeaux ».
    /// </summary>
    public static bool NamesMatch(string left, string right)
    {
        var a = Normalize(left);
        var b = Normalize(right);

        if (a.Length == 0 || b.Length == 0)
        {
            return false;
        }

        return a == b || (a.Length >= 6 && b.Contains(a, StringComparison.Ordinal)) || (b.Length >= 6 && a.Contains(b, StringComparison.Ordinal));
    }

    /// <summary>
    /// Minuscules, sans accents ni ponctuation, sans articles ni espaces. Les mots
    /// d'une seule lettre disparaissent aussi : ce sont les élisions du français
    /// (« d'If », « l'eau »), qui ne portent aucun sens.
    /// </summary>
    public static string Normalize(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var stripped = new StringBuilder(value.Length);
        foreach (var character in value.Normalize(NormalizationForm.FormD))
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(character);
            if (category == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            stripped.Append(char.IsLetterOrDigit(character) ? char.ToLowerInvariant(character) : ' ');
        }

        var words = stripped
            .ToString()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(word => word.Length > 1 && !Articles.Contains(word));

        return string.Concat(words);
    }

    /// <summary>Distance orthodromique en mètres, suffisante à l'échelle d'une ville.</summary>
    public static double DistanceInMeters(double lat1, double lon1, double lat2, double lon2)
    {
        const double earthRadius = 6_371_000;

        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                + Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        return 2 * earthRadius * Math.Asin(Math.Min(1, Math.Sqrt(a)));
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180;
}
