using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nooks.Core.Entities;

namespace Nooks.Infrastructure.Persistence.Configurations;

public sealed class FavoriteConfiguration : IEntityTypeConfiguration<Favorite>
{
    public void Configure(EntityTypeBuilder<Favorite> builder)
    {
        builder.ToTable("Favorites");

        // La paire membre/lieu est la clé : on ne met un lieu en favori qu'une fois.
        builder.HasKey(f => new { f.UserId, f.PlaceId });
        builder.HasIndex(f => f.UserId);

        builder.HasOne<Place>()
            .WithMany()
            .HasForeignKey(f => f.PlaceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
