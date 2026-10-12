using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using NotesApp.Api.Data;
using NotesApp.Api.Validation;

namespace NotesApp.Api.Features.Notes;

public static class NoteEndpoints
{
    public static IEndpointRouteBuilder MapNoteEndpoints(this IEndpointRouteBuilder endpoints)
    {
        RouteGroupBuilder notes = endpoints.MapGroup("/api/notes").WithTags("Notes");
        notes.MapPost("/", Create)
            .WithName("CreateNote")
            .ProducesValidationProblem()
            .AddEndpointFilter<ValidationProblemEndpointFilter<SaveNoteRequest>>();
        notes.MapGet("/", Search)
            .WithName("SearchNotes")
            .ProducesValidationProblem()
            .AddEndpointFilter<ValidationProblemEndpointFilter<SearchNotesRequest>>();
        notes.MapGet("/{id:guid}", GetById).WithName("GetNote");
        notes.MapPut("/{id:guid}", Update)
            .WithName("UpdateNote")
            .ProducesValidationProblem()
            .AddEndpointFilter<ValidationProblemEndpointFilter<SaveNoteRequest>>();
        notes.MapDelete("/{id:guid}", Delete).WithName("DeleteNote");
        return endpoints;
    }

    private static async Task<CreatedAtRoute<NoteResponse>> Create(
        SaveNoteRequest request,
        TimeProvider timeProvider,
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        // UUIDv7 breaks ties when UpdatedAt is the same.
        Note note = Note.Create(Guid.CreateVersion7(), request.Title, request.Content, timeProvider.GetUtcNow());
        dbContext.Notes.Add(note);
        await dbContext.SaveChangesAsync(cancellationToken);
        return TypedResults.CreatedAtRoute(ToNoteResponse(note), "GetNote", new { id = note.Id });
    }

    private static async Task<Ok<NotePageResponse>> Search(
        [AsParameters] SearchNotesRequest request,
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
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

    private static async Task<Results<Ok<NoteResponse>, NotFound>> Update(
        Guid id,
        SaveNoteRequest request,
        TimeProvider timeProvider,
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
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

    // Escape LIKE wildcards; backslash must be escaped first.
    private static string EscapeLikeSpecialChars(string value)
    {
        return value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);
    }
}
