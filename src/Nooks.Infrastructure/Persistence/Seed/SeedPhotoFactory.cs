using Nooks.Core.Entities;
using SkiaSharp;

namespace Nooks.Infrastructure.Persistence.Seed;

/// <summary>
/// Visuels de démonstration pour le jeu de données de départ. Ce sont des aplats
/// abstraits, volontairement pas des photographies : il n'y a pas de vraie photo
/// libre de droits pour ces lieux, et une fausse photo tromperait le lecteur.
/// Un lieu proposé par un membre porte, lui, ses vraies photos.
/// </summary>
public static class SeedPhotoFactory
{
    private const int Width = 1200;
    private const int Height = 800;

    /// <summary>Couleurs alignées sur la légende du front (client/src/app/core/categories.ts).</summary>
    private static readonly Dictionary<PlaceCategory, (SKColor Color, string Path)> Styles = new()
    {
        [PlaceCategory.Viewpoint] = (SKColor.Parse("#e07a1f"), "M6 1.6 10.6 9.8 1.4 9.8Z"),
        [PlaceCategory.Curiosity] = (SKColor.Parse("#7b5bc4"),
            "M5.2 1.3h1.6v3.1l2.2-2.2 1.1 1.1-2.2 2.2h3.1v1.6H7.9l2.2 2.2-1.1 1.1-2.2-2.2v3.1H5.2V8.2L3 10.4 1.9 9.3l2.2-2.2H1V5.5h3.1L1.9 3.3 3 2.2l2.2 2.2Z"),
        [PlaceCategory.Museum] = (SKColor.Parse("#2f6fd0"), "M6 1.9a4.1 4.1 0 1 0 0 8.2 4.1 4.1 0 1 0 0-8.2Z"),
        [PlaceCategory.StreetArt] = (SKColor.Parse("#d63b32"), "M6 1.4 10.6 6 6 10.6 1.4 6Z"),
        [PlaceCategory.Nature] = (SKColor.Parse("#3f8f52"), "M6 1.4 10.2 3.8v4.4L6 10.6 1.8 8.2V3.8Z"),
        [PlaceCategory.Shop] = (SKColor.Parse("#b8388f"), "M2.4 2.4h7.2v7.2H2.4Z"),
        [PlaceCategory.FoodDrink] = (SKColor.Parse("#b08307"),
            "M6 1 7.5 4.4 11.2 4.8 8.4 7.3 9.2 11 6 9.1 2.8 11 3.6 7.3 0.8 4.8 4.5 4.4Z"),
        [PlaceCategory.Abandoned] = (SKColor.Parse("#6b6a78"), "M4.5 1.6h3v2.9h2.9v3H7.5v2.9h-3V7.5H1.6v-3h2.9Z"),
        [PlaceCategory.Other] = (SKColor.Parse("#5f5f5f"), "M6 3.3a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 1 0 0-5.4Z"),
    };

    /// <summary>PNG d'illustration, déterministe : le même lieu produit toujours la même image.</summary>
    public static byte[] Create(PlaceCategory category, string placeName)
    {
        var (color, pathData) = Styles.TryGetValue(category, out var style) ? style : Styles[PlaceCategory.Other];

        // Le nom du lieu décale la teinte et la composition, pour que deux lieux
        // d'une même catégorie ne donnent pas exactement la même image.
        var seed = Math.Abs(placeName.GetHashCode(StringComparison.Ordinal));
        var angle = (seed % 60) - 30;
        var lift = 0.10f + (seed % 7) * 0.03f;

        using var surface = SKSurface.Create(new SKImageInfo(Width, Height));
        var canvas = surface.Canvas;

        using (var background = new SKPaint())
        {
            background.Shader = SKShader.CreateLinearGradient(
                new SKPoint(0, 0),
                new SKPoint(Width, Height),
                [Lighten(color, lift), Darken(color, 0.22f)],
                [0f, 1f],
                SKShaderTileMode.Clamp);
            canvas.DrawRect(new SKRect(0, 0, Width, Height), background);
        }

        // Semis de symboles de la catégorie : une texture décorative, pas un logo.
        var path = SKPath.ParseSvgPathData(pathData);
        if (path is not null)
        {
            var random = new Random(seed);
            canvas.Save();
            canvas.RotateDegrees(angle, Width / 2f, Height / 2f);

            for (var i = 0; i < 7; i++)
            {
                var scale = 12f + random.Next(46);
                var shape = new SKPath(path);
                shape.Transform(SKMatrix.CreateScale(scale, scale));

                var bounds = shape.Bounds;
                var x = random.Next(-160, Width + 160) - bounds.MidX;
                var y = random.Next(-160, Height + 160) - bounds.MidY;
                shape.Transform(SKMatrix.CreateTranslation(x, y));

                using var glyph = new SKPaint
                {
                    Color = (i % 2 == 0 ? SKColors.White : SKColors.Black).WithAlpha((byte)(18 + random.Next(30))),
                    IsAntialias = true,
                };
                canvas.DrawPath(shape, glyph);
            }

            canvas.Restore();
        }

        // Voile lumineux en diagonale, pour que la vignette ne soit pas un aplat.
        using (var sheen = new SKPaint())
        {
            sheen.Shader = SKShader.CreateLinearGradient(
                new SKPoint(0, Height),
                new SKPoint(Width, 0),
                [SKColors.White.WithAlpha(60), SKColors.Transparent],
                [0f, 0.65f],
                SKShaderTileMode.Clamp);
            canvas.DrawRect(new SKRect(0, 0, Width, Height), sheen);
        }

        using var image = surface.Snapshot();
        using var data = image.Encode(SKEncodedImageFormat.Png, 90);
        return data.ToArray();
    }

    private static SKColor Lighten(SKColor color, float amount)
    {
        color.ToHsl(out var h, out var s, out var l);
        return SKColor.FromHsl(h, s, Math.Min(100f, l + amount * 100f));
    }

    private static SKColor Darken(SKColor color, float amount)
    {
        color.ToHsl(out var h, out var s, out var l);
        return SKColor.FromHsl(h, s, Math.Max(0f, l - amount * 100f));
    }
}
