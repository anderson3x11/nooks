using Nooks.Core.Common;
using Microsoft.AspNetCore.Diagnostics;

namespace Nooks.Api.Infrastructure;

/// <summary>
/// Traduit en réponse 400 lisible ce qui relève de la requête du client : règle métier violée
/// ou corps de requête illisible. Le reste continue vers le 500 habituel.
/// </summary>
public sealed class DomainExceptionHandler(IProblemDetailsService problemDetailsService) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var detail = exception switch
        {
            DomainException domainException => domainException.Message,
            // En développement, une désérialisation ratée remonte sous forme d'exception plutôt qu'en 400.
            BadHttpRequestException badRequest => badRequest.Message,
            _ => null
        };

        if (detail is null)
        {
            return false;
        }

        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;

        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails =
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Requête invalide",
                Detail = detail
            }
        });
    }
}
