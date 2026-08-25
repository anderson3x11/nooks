using Microsoft.AspNetCore.Identity;

namespace Nooks.Infrastructure.Identity;

public sealed class AppUser : IdentityUser<Guid>
{
    public const int MaxDisplayNameLength = 60;

    public const int MaxBioLength = 400;

    public string DisplayName { get; set; } = null!;

    /// <summary>Quelques lignes de présentation sur la page du membre.</summary>
    public string? Bio { get; set; }

    /// <summary>Nom du fichier d'avatar dans le dossier des envois, sans chemin.</summary>
    public string? AvatarFileName { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public static class AppRoles
{
    public const string Admin = "Admin";
    public const string Member = "Member";

    public static readonly string[] All = [Admin, Member];
}
