using System.Security.Claims;

namespace Nooks.Api.Auth;

public static class ClaimsPrincipalExtensions
{
    /// <summary>Identifiant du membre connecté, issu du claim « sub » du JWT.</summary>
    public static Guid GetUserId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out var userId)
            ? userId
            : throw new InvalidOperationException("Le jeton ne contient pas d'identifiant utilisateur exploitable.");
    }
}
