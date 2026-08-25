namespace Nooks.Api.Infrastructure;

public sealed class ModerationOptions
{
    public const string SectionName = "Moderation";

    /// <summary>
    /// À true, un lieu proposé est publié immédiatement (mode POC).
    /// À false, il part en file d'attente et attend la validation d'un admin.
    /// </summary>
    public bool AutoApprove { get; set; } = true;
}
