using Nooks.Core.Abstractions;
using Nooks.Core.Common;
using Nooks.Infrastructure.Persistence;
using Microsoft.Extensions.Options;
using SkiaSharp;

namespace Nooks.Infrastructure.Storage;

/// <summary>
/// Stockage des photos dans la base. Les images sont réencodées en WebP : cela normalise
/// le format, coupe les métadonnées et neutralise un fichier piégé qui se ferait passer
/// pour une image. Les octets partent ensuite dans la même transaction que le lieu, donc
/// aucun disque à prévoir et aucune photo orpheline en cas d'échec.
/// </summary>
public sealed class DatabasePhotoStorage(NooksDbContext dbContext, IOptions<PhotoStorageOptions> options) : IPhotoStorage
{
    private static ReadOnlySpan<byte> PngSignature => [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    private readonly PhotoStorageOptions _options = options.Value;

    public async Task<StoredPhoto> SaveAsync(Guid placeId, Stream content, CancellationToken cancellationToken)
    {
        using var bitmap = await DecodeAsync(content, cancellationToken);

        var baseName = Guid.NewGuid().ToString("N");
        var fileName = $"{baseName}.webp";
        var thumbnailFileName = $"{baseName}_thumb.webp";
        var folder = $"{PhotoUrls.RootFolder}/{placeId}";

        Add($"{folder}/{fileName}", Encode(bitmap, _options.MaxDimension));
        Add($"{folder}/{thumbnailFileName}", Encode(bitmap, _options.ThumbnailDimension));

        return new StoredPhoto(fileName, thumbnailFileName);
    }

    public async Task<string> SaveAvatarAsync(Guid userId, Stream content, CancellationToken cancellationToken)
    {
        using var bitmap = await DecodeAsync(content, cancellationToken);

        // Un avatar est toujours affiché dans un rond : on recadre au carré une bonne
        // fois plutôt que de laisser le navigateur rogner une image de travers.
        using var square = CropToSquare(bitmap);

        var fileName = $"{Guid.NewGuid():N}.webp";
        Add($"{PhotoUrls.AvatarFolder}/{userId}/{fileName}", Encode(square, _options.AvatarDimension));

        return fileName;
    }

    private void Add(string path, byte[] content) => dbContext.StoredImages.Add(StoredImage.Create(path, content));

    private async Task<SKBitmap> DecodeAsync(Stream content, CancellationToken cancellationToken)
    {
        var bytes = await ReadWithLimitAsync(content, _options.MaxSizeInBytes, cancellationToken);

        if (!LooksLikeSupportedImage(bytes))
        {
            throw new DomainException("Format non supporté. Envoyez une image JPEG, PNG ou WebP.");
        }

        return SKBitmap.Decode(bytes) ?? throw new DomainException("Image illisible ou corrompue.");
    }

    private static SKBitmap CropToSquare(SKBitmap source)
    {
        var side = Math.Min(source.Width, source.Height);
        var left = (source.Width - side) / 2;
        var top = (source.Height - side) / 2;

        var square = new SKBitmap(side, side);
        source.ExtractSubset(square, SKRectI.Create(left, top, side, side));
        return square;
    }

    private byte[] Encode(SKBitmap source, int maxDimension)
    {
        var scale = Math.Min(1d, (double)maxDimension / Math.Max(source.Width, source.Height));
        var width = Math.Max(1, (int)Math.Round(source.Width * scale));
        var height = Math.Max(1, (int)Math.Round(source.Height * scale));

        using var resized = source.Resize(new SKImageInfo(width, height), new SKSamplingOptions(SKFilterMode.Linear, SKMipmapMode.Linear))
            ?? throw new DomainException("Le redimensionnement de l'image a échoué.");
        using var image = SKImage.FromBitmap(resized);
        using var data = image.Encode(SKEncodedImageFormat.Webp, _options.Quality);

        return data.ToArray();
    }

    private static async Task<byte[]> ReadWithLimitAsync(Stream content, long maxSize, CancellationToken cancellationToken)
    {
        using var buffer = new MemoryStream();
        var chunk = new byte[81920];

        while (true)
        {
            var read = await content.ReadAsync(chunk, cancellationToken);
            if (read == 0)
            {
                break;
            }

            buffer.Write(chunk, 0, read);
            if (buffer.Length > maxSize)
            {
                throw new DomainException($"L'image dépasse la taille maximale de {maxSize / (1024 * 1024)} Mo.");
            }
        }

        return buffer.ToArray();
    }

    /// <summary>Contrôle sur les octets réels du fichier, l'en-tête Content-Type étant déclaratif.</summary>
    private static bool LooksLikeSupportedImage(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < 12)
        {
            return false;
        }

        var isJpeg = bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF;
        var isPng = bytes[..8].SequenceEqual(PngSignature);
        var isWebp = bytes[..4].SequenceEqual("RIFF"u8) && bytes[8..12].SequenceEqual("WEBP"u8);

        return isJpeg || isPng || isWebp;
    }
}
