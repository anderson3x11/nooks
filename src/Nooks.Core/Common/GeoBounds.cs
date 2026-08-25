using System.Globalization;
using NetTopologySuite.Geometries;

namespace Nooks.Core.Common;

/// <summary>
/// Rectangle géographique envoyé par la carte, au format "minLon,minLat,maxLon,maxLat".
/// </summary>
public readonly record struct GeoBounds(double MinLon, double MinLat, double MaxLon, double MaxLat)
{
    /// <summary>Surface maximale acceptée, en degrés carrés. Au-delà, la requête ratisse trop large.</summary>
    public const double MaxAreaInSquareDegrees = 100d;

    public double AreaInSquareDegrees => (MaxLon - MinLon) * (MaxLat - MinLat);

    public static bool TryParse(string? value, out GeoBounds bounds, out string? error)
    {
        bounds = default;
        error = null;

        if (string.IsNullOrWhiteSpace(value))
        {
            error = "Le paramètre bbox est obligatoire (format : minLon,minLat,maxLon,maxLat).";
            return false;
        }

        var parts = value.Split(',', StringSplitOptions.TrimEntries);
        if (parts.Length != 4)
        {
            error = "Le paramètre bbox attend 4 valeurs : minLon,minLat,maxLon,maxLat.";
            return false;
        }

        var numbers = new double[4];
        for (var i = 0; i < 4; i++)
        {
            if (!double.TryParse(parts[i], NumberStyles.Float, CultureInfo.InvariantCulture, out numbers[i]))
            {
                error = $"Valeur bbox invalide : « {parts[i]} ».";
                return false;
            }
        }

        var candidate = new GeoBounds(numbers[0], numbers[1], numbers[2], numbers[3]);

        if (candidate.MinLon is < -180 or > 180 || candidate.MaxLon is < -180 or > 180)
        {
            error = "Les longitudes doivent être comprises entre -180 et 180.";
            return false;
        }

        if (candidate.MinLat is < -90 or > 90 || candidate.MaxLat is < -90 or > 90)
        {
            error = "Les latitudes doivent être comprises entre -90 et 90.";
            return false;
        }

        if (candidate.MinLon >= candidate.MaxLon || candidate.MinLat >= candidate.MaxLat)
        {
            error = "Le coin sud-ouest du bbox doit être strictement inférieur au coin nord-est.";
            return false;
        }

        if (candidate.AreaInSquareDegrees > MaxAreaInSquareDegrees)
        {
            error = $"La zone demandée est trop grande (maximum {MaxAreaInSquareDegrees} degrés carrés). Zoomez davantage.";
            return false;
        }

        bounds = candidate;
        return true;
    }

    public Geometry ToPolygon()
    {
        var factory = new GeometryFactory(new PrecisionModel(), GeoConstants.WgsSrid);
        return factory.ToGeometry(new Envelope(MinLon, MaxLon, MinLat, MaxLat));
    }
}
