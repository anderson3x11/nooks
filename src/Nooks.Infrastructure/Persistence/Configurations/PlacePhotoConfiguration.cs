using Nooks.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Nooks.Infrastructure.Persistence.Configurations;

public sealed class PlacePhotoConfiguration : IEntityTypeConfiguration<PlacePhoto>
{
    public void Configure(EntityTypeBuilder<PlacePhoto> builder)
    {
        builder.ToTable("PlacePhotos");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).ValueGeneratedNever();

        builder.Property(p => p.FileName).HasMaxLength(120).IsRequired();
        builder.Property(p => p.ThumbnailFileName).HasMaxLength(120).IsRequired();

        builder.HasIndex(p => p.PlaceId);
    }
}
