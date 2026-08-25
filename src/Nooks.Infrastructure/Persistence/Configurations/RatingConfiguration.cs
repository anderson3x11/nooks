using Nooks.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Nooks.Infrastructure.Persistence.Configurations;

public sealed class RatingConfiguration : IEntityTypeConfiguration<Rating>
{
    public void Configure(EntityTypeBuilder<Rating> builder)
    {
        builder.ToTable("Ratings");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedNever();

        builder.Property(r => r.Comment).HasMaxLength(Rating.MaxCommentLength);
        builder.Ignore(r => r.IsEdited);
        builder.Ignore(r => r.IsRemoved);
        builder.HasIndex(r => r.RemovedAt);

        // Un membre ne peut noter un lieu qu'une seule fois.
        builder.HasIndex(r => new { r.PlaceId, r.UserId }).IsUnique();
        builder.HasIndex(r => r.UserId);
    }
}
