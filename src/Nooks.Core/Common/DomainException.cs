namespace Nooks.Core.Common;

/// <summary>
/// Règle métier violée. Traduite en HTTP 400 par le gestionnaire d'exceptions de l'API.
/// </summary>
public sealed class DomainException(string message) : Exception(message);
