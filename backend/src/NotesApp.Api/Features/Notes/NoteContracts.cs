using Microsoft.AspNetCore.Mvc;

namespace NotesApp.Api.Features.Notes;

public sealed record SearchNotesRequest(
    [FromQuery(Name = "q")] string? Query,
    int Offset = 0,
    int Limit = 20);

public sealed record NoteSummaryResponse(
    Guid Id,
    string Title);

public sealed record NotePageResponse(
    IReadOnlyList<NoteSummaryResponse> Items,
    int? NextOffset);

public sealed record NoteResponse(
    Guid Id,
    string Title,
    string Content,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record SaveNoteRequest(
    string Title,
    string Content);
