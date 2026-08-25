namespace Nooks.Api.Auth;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "nooks-api";
    public string Audience { get; set; } = "nooks-client";

    /// <summary>Clé HMAC : 32 caractères minimum. En production, elle vient d'un secret, pas d'appsettings.</summary>
    public string SigningKey { get; set; } = string.Empty;

    public int ExpirationDays { get; set; } = 7;
}
