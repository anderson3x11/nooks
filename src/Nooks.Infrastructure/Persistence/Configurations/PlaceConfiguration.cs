using Nooks.Core.Common;
using Nooks.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Nooks.Infrastructure.Persistence.Configurations;

public sealed class PlaceConfiguration : IEntityTypeConfiguration<Place>
{
    public void Configure(EntityTypeBuilder<Place> builder)
    {
        builder.ToTable("Places");
        builder.HasKey(p => p.Id);

        // Les identifiants sont créés par le domaine. Sans ce réglage, EF prend une entité
        // ajoutée via une navigation pour une ligne existante et émet un UPDATE au lieu d'un INSERT.
        builder.Property(p => p.Id).ValueGeneratedNever();

        builder.Property(p => p.Name).HasMaxLength(Place.MaxNameLength).IsRequired();
        builder.Property(p => p.Description).HasMaxLength(Place.MaxDescriptionLength).IsRequired();
        builder.Property(p => p.Address).HasMaxLength(250);
        builder.Property(p => p.City).HasMaxLength(100).IsRequired();
        builder.Property(p => p.Country).HasMaxLength(100).IsRequired();

        // Stockées en texte : une migration reste lisible et l'ajout d'une valeur ne décale rien.
        builder.Property(p => p.Category).HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(20).IsRequired();

        builder.Property(p => p.Location)
            .HasColumnType($"geometry(Point, {GeoConstants.WgsSrid})")
            .IsRequired();

        // L'index spatial est ce qui rend la recherche par rectangle instantanée.
        builder.HasIndex(p => p.Location).HasMethod("gist");
        builder.HasIndex(p => p.Status);
        builder.HasIndex(p => p.City);

        builder.Ignore(p => p.Latitude);
        builder.Ignore(p => p.Longitude);

        builder.HasMany(p => p.Photos)
            .WithOne()
            .HasForeignKey(photo => photo.PlaceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.Ratings)
            .WithOne()
            .HasForeignKey(rating => rating.PlaceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(p => p.Photos).UsePropertyAccessMode(PropertyAccessMode.Field);
        builder.Navigation(p => p.Ratings).UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
