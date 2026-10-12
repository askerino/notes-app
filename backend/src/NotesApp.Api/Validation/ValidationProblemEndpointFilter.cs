using System.Text.Json;
using FluentValidation;
using FluentValidation.Results;

namespace NotesApp.Api.Validation;

public sealed class ValidationProblemEndpointFilter<TRequest>(IValidator<TRequest> validator) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        TRequest request = context.Arguments.OfType<TRequest>().FirstOrDefault()
            ?? throw new InvalidOperationException(
                $"The {nameof(ValidationProblemEndpointFilter<TRequest>)} endpoint filter requires an argument of type {typeof(TRequest).Name}, but none was found. " +
                $"Check that the filter is attached to an endpoint that declares a {typeof(TRequest).Name} parameter.");

        ValidationResult validation = await validator.ValidateAsync(request, context.HttpContext.RequestAborted);
        if (!validation.IsValid)
        {
            return TypedResults.ValidationProblem(ToErrors(validation));
        }

        return await next(context);
    }

    private static Dictionary<string, string[]> ToErrors(ValidationResult validation)
    {
        return validation.Errors
            .GroupBy(error => JsonNamingPolicy.CamelCase.ConvertName(error.PropertyName))
            .ToDictionary(group => group.Key, group => group.Select(error => error.ErrorMessage).ToArray());
    }
}
