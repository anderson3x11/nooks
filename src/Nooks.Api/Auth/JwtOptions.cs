namespace Nooks.Api.Auth;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    /// <summary>
    /// La valeur d'appsettings.json, qui n'a d'intérêt qu'en local. Nommée ici pour que le
    /// démarrage puisse la reconnaître et refuser de s'en servir ailleurs qu'en développement.
    /// </summary>
    public const string DevelopmentSigningKey = "dev-only-signing-key-change-me-in-production-32-chars-minimum";

    public string Issuer { get; set; } = "nooks-api";
    public string Audience { get; set; } = "nooks-client";

    /// <summary>Clé HMAC : 32 caractères minimum. En production, elle vient d'un secret, pas d'appsettings.</summary>
    public string SigningKey { get; set; } = string.Empty;

    public int ExpirationDays { get; set; } = 7;
}
