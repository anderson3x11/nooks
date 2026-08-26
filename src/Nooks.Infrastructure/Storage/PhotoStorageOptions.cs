namespace Nooks.Infrastructure.Storage;

public sealed class PhotoStorageOptions
{
    public const string SectionName = "PhotoStorage";

    public long MaxSizeInBytes { get; set; } = 5 * 1024 * 1024;

    public int MaxDimension { get; set; } = 1600;

    public int ThumbnailDimension { get; set; } = 400;

    public int AvatarDimension { get; set; } = 256;

    public int Quality { get; set; } = 80;
}
