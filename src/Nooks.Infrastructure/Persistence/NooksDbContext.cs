using Nooks.Core.Entities;
using Nooks.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Nooks.Infrastructure.Persistence;

public sealed class NooksDbContext(DbContextOptions<NooksDbContext> options)
    : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<Place> Places => Set<Place>();
    public DbSet<PlacePhoto> PlacePhotos => Set<PlacePhoto>();
    public DbSet<Rating> Ratings => Set<Rating>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(NooksDbContext).Assembly);
    }
}
