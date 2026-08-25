using Microsoft.AspNetCore.Identity;

namespace Nooks.Infrastructure.Identity;

public sealed class AppUser : IdentityUser<Guid>
{
    public const int MaxDisplayNameLength = 60;

    public string DisplayName { get; set; } = null!;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public static class AppRoles
{
    public const string Admin = "Admin";
    public const string Member = "Member";

    public static readonly string[] All = [Admin, Member];
}
