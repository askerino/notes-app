using System.Text.Json;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using NotesApp.Api.Data;

namespace NotesApp.Api.Features.Notes;

public static class NoteEndpoints
{
    public static IEndpointRouteBuilder MapNoteEndpoints(this IEndpointRouteBuilder endpoints)
    {
        RouteGroupBuilder notes = endpoints.MapGroup("/api/notes").WithTags("Notes");
        notes.MapPost("/", Create).WithName("CreateNote");
        notes.MapGet("/", Search).WithName("SearchNotes");
        notes.MapGet("/{id:guid}", GetById).WithName("GetNote");
        notes.MapPut("/{id:guid}", Update).WithName("UpdateNote");
        notes.MapDelete("/{id:guid}", Delete).WithName("DeleteNote");
        return endpoints;
    }

    private static async Task<Results<CreatedAtRoute<NoteResponse>, ValidationProblem>> Create(
        SaveNoteRequest request,
        TimeProvider timeProvider,
        AppDbContext dbContext,
        IValidator<SaveNoteRequest> validator,
        CancellationToken cancellationToken)
    {
        ValidationResult validation = await validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return TypedResults.ValidationProblem(ToValidationErrors(validation));
        }

        // UUIDv7 breaks ties when UpdatedAt is the same.
        Note note = Note.Create(Guid.CreateVersion7(), request.Title, request.Content, timeProvider.GetUtcNow());
        dbContext.Notes.Add(note);
        await dbContext.SaveChangesAsync(cancellationToken);
        return TypedResults.CreatedAtRoute(ToNoteResponse(note), "GetNote", new { id = note.Id });
    }

    private static async Task<Results<Ok<NotePageResponse>, ValidationProblem>> Search(
        [AsParameters] SearchNotesRequest request,
        AppDbContext dbContext,
        IValidator<SearchNotesRequest> validator,
        CancellationToken cancellationToken)
    {
        ValidationResult validation = await validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return TypedResults.ValidationProblem(ToValidationErrors(validation));
        }

        IQueryable<Note> notes = dbContext.Notes.AsNoTracking();

        string? trimmedQuery = request.Query?.Trim();
        if (!string.IsNullOrWhiteSpace(trimmedQuery))
        {
            // Must match the escape character used by EscapeLikeSpecialChars below.
            string pattern = $"%{EscapeLikeSpecialChars(trimmedQuery)}%";
            notes = notes.Where(note =>
                EF.Functions.ILike(note.Title, pattern, "\\") ||
                EF.Functions.ILike(note.Content, pattern, "\\"));
        }

        // Fetch one extra row to detect if there's a next page.
        List<Note> items = await notes
            .OrderByDescending(note => note.UpdatedAt)
            .ThenByDescending(note => note.Id)
            .Skip(request.Offset)
            .Take(request.Limit + 1)
            .ToListAsync(cancellationToken);

        bool hasMore = items.Count > request.Limit;
        if (hasMore)
        {
            items.RemoveAt(request.Limit);
        }
        int? nextOffset = hasMore ? request.Offset + request.Limit : null;

        return TypedResults.Ok(new NotePageResponse([.. items.Select(ToNoteSummaryResponse)], nextOffset));
    }

    private static async Task<Results<Ok<NoteResponse>, NotFound>> GetById(
        Guid id,
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        Note? note = await dbContext.Notes.AsNoTracking().SingleOrDefaultAsync(note => note.Id == id, cancellationToken);
        return note is null ? TypedResults.NotFound() : TypedResults.Ok(ToNoteResponse(note));
    }

    private static async Task<Results<Ok<NoteResponse>, ValidationProblem, NotFound>> Update(
        Guid id,
        SaveNoteRequest request,
        TimeProvider timeProvider,
        AppDbContext dbContext,
        IValidator<SaveNoteRequest> validator,
        CancellationToken cancellationToken)
    {
        ValidationResult validation = await validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return TypedResults.ValidationProblem(ToValidationErrors(validation));
        }

        Note? note = await dbContext.Notes.SingleOrDefaultAsync(note => note.Id == id, cancellationToken);
        if (note is null)
        {
            return TypedResults.NotFound();
        }

        note.Update(request.Title, request.Content, timeProvider.GetUtcNow());
        await dbContext.SaveChangesAsync(cancellationToken);
        return TypedResults.Ok(ToNoteResponse(note));
    }

    private static async Task<Results<NoContent, NotFound>> Delete(
        Guid id,
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        Note? note = await dbContext.Notes.SingleOrDefaultAsync(note => note.Id == id, cancellationToken);
        if (note is null)
        {
            return TypedResults.NotFound();
        }

        dbContext.Notes.Remove(note);
        await dbContext.SaveChangesAsync(cancellationToken);
        return TypedResults.NoContent();
    }

    private static NoteSummaryResponse ToNoteSummaryResponse(Note note)
    {
        return new(note.Id, note.Title);
    }

    private static NoteResponse ToNoteResponse(Note note)
    {
        return new(note.Id, note.Title, note.Content, note.CreatedAt, note.UpdatedAt);
    }

    private static Dictionary<string, string[]> ToValidationErrors(ValidationResult validation)
    {
        return validation.Errors.GroupBy(error =>
            JsonNamingPolicy.CamelCase.ConvertName(error.PropertyName))
            .ToDictionary(group => group.Key, group => group.Select(error => error.ErrorMessage)
            .ToArray());
    }

    // Escape LIKE wildcards; backslash must be escaped first.
    private static string EscapeLikeSpecialChars(string value)
    {
        return value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);
    }
}
