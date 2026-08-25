namespace Nooks.Core.Entities;

public sealed class PlacePhoto
{
    private PlacePhoto() { }

    public Guid Id { get; private set; }
    public Guid PlaceId { get; private set; }
    public string FileName { get; private set; } = null!;
    public string ThumbnailFileName { get; private set; } = null!;
    public Guid UploadedByUserId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public bool IsCover { get; private set; }

    internal static PlacePhoto Create(Guid placeId, string fileName, string thumbnailFileName, Guid uploadedByUserId, bool isCover)
        => new()
        {
            Id = Guid.NewGuid(),
            PlaceId = placeId,
            FileName = fileName,
            ThumbnailFileName = thumbnailFileName,
            UploadedByUserId = uploadedByUserId,
            CreatedAt = DateTimeOffset.UtcNow,
            IsCover = isCover
        };

    internal void ClearCover() => IsCover = false;
}
