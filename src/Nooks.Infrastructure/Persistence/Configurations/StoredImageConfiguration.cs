using Nooks.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Nooks.Infrastructure.Persistence.Configurations;

public sealed class StoredImageConfiguration : IEntityTypeConfiguration<StoredImage>
{
    public void Configure(EntityTypeBuilder<StoredImage> builder)
    {
        builder.ToTable("stored_images");
        builder.HasKey(x => x.Path);
        builder.Property(x => x.Path).HasMaxLength(256);
        builder.Property(x => x.Content).IsRequired();
    }
}
