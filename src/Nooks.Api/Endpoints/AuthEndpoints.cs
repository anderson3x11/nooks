using System.Security.Claims;
using Nooks.Api.Auth;
using Nooks.Api.Contracts;
using Nooks.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;

namespace Nooks.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", RegisterAsync);
        group.MapPost("/login", LoginAsync);
        group.MapGet("/me", GetCurrentUserAsync).RequireAuthorization();

        return app;
    }

    private static async Task<IResult> RegisterAsync(
        RegisterRequest request,
        UserManager<AppUser> userManager,
        TokenService tokenService)
    {
        if (string.IsNullOrWhiteSpace(request.DisplayName))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["displayName"] = ["Le pseudo est obligatoire."]
            });
        }

        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            UserName = request.Email,
            Email = request.Email,
            DisplayName = request.DisplayName.Trim()
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return Results.ValidationProblem(ToValidationErrors(result));
        }

        await userManager.AddToRoleAsync(user, AppRoles.Member);
        return Results.Ok(await BuildResponseAsync(user, userManager, tokenService));
    }

    private static async Task<IResult> LoginAsync(
        LoginRequest request,
        UserManager<AppUser> userManager,
        TokenService tokenService)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null || !await userManager.CheckPasswordAsync(user, request.Password))
        {
            // Message volontairement identique dans les deux cas : ne pas révéler quels emails existent.
            return Results.Problem("Email ou mot de passe incorrect.", statusCode: StatusCodes.Status401Unauthorized);
        }

        return Results.Ok(await BuildResponseAsync(user, userManager, tokenService));
    }

    private static async Task<IResult> GetCurrentUserAsync(ClaimsPrincipal principal, UserManager<AppUser> userManager)
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null)
        {
            return Results.Unauthorized();
        }

        var roles = await userManager.GetRolesAsync(user);
        return Results.Ok(new CurrentUserResponse(user.Id, user.Email ?? string.Empty, user.DisplayName, [.. roles]));
    }

    private static async Task<AuthResponse> BuildResponseAsync(AppUser user, UserManager<AppUser> userManager, TokenService tokenService)
    {
        var roles = await userManager.GetRolesAsync(user);
        var issued = tokenService.Issue(user, roles);
        return new AuthResponse(
            issued.Token,
            issued.ExpiresAt,
            new CurrentUserResponse(user.Id, user.Email ?? string.Empty, user.DisplayName, [.. roles]));
    }

    private static Dictionary<string, string[]> ToValidationErrors(IdentityResult result)
        => result.Errors
            .GroupBy(error => error.Code)
            .ToDictionary(group => group.Key, group => group.Select(error => error.Description).ToArray());
}
