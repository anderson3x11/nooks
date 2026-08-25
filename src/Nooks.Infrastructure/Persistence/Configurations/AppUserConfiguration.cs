using Nooks.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Nooks.Infrastructure.Persistence.Configurations;

public sealed class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
{
    public void Configure(EntityTypeBuilder<AppUser> builder)
    {
        builder.Property(u => u.DisplayName).HasMaxLength(AppUser.MaxDisplayNameLength).IsRequired();
        builder.Property(u => u.Bio).HasMaxLength(AppUser.MaxBioLength);
        builder.Property(u => u.AvatarFileName).HasMaxLength(120);
    }
}
