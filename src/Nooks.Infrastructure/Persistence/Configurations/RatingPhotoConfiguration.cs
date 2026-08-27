using Nooks.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Nooks.Infrastructure.Persistence.Configurations;

public sealed class RatingPhotoConfiguration : IEntityTypeConfiguration<RatingPhoto>
{
    public void Configure(EntityTypeBuilder<RatingPhoto> builder)
    {
        builder.ToTable("RatingPhotos");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).ValueGeneratedNever();

        builder.Property(p => p.FileName).HasMaxLength(120).IsRequired();
        builder.Property(p => p.ThumbnailFileName).HasMaxLength(120).IsRequired();

        builder.HasIndex(p => p.RatingId);
    }
}
