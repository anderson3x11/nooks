namespace Nooks.Api.Contracts;

public sealed record RegisterRequest(string Email, string Password, string DisplayName);

public sealed record LoginRequest(string Email, string Password);

public sealed record CurrentUserResponse(Guid Id, string Email, string DisplayName, IReadOnlyList<string> Roles);

public sealed record UpdateProfileRequest(string DisplayName, string? Bio);

public sealed record AuthResponse(string Token, DateTimeOffset ExpiresAt, CurrentUserResponse User);
