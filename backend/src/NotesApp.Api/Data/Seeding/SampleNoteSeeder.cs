using Microsoft.EntityFrameworkCore;
using NotesApp.Api.Features.Notes;

namespace NotesApp.Api.Data.Seeding;

public static class SampleNoteSeeder
{
    public static void Seed(DbContext dbContext, TimeProvider timeProvider)
    {
        DbSet<Note> notes = dbContext.Set<Note>();

        // Only seed an empty database
        if (notes.Any())
        {
            return;
        }

        notes.AddRange(CreateNotes(timeProvider));
        dbContext.SaveChanges();
    }

    public static async Task SeedAsync(DbContext dbContext, TimeProvider timeProvider, CancellationToken cancellationToken)
    {
        DbSet<Note> notes = dbContext.Set<Note>();

        // Only seed an empty database
        if (await notes.AnyAsync(cancellationToken))
        {
            return;
        }

        notes.AddRange(CreateNotes(timeProvider));
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static IEnumerable<Note> CreateNotes(TimeProvider timeProvider)
    {
        DateTimeOffset now = timeProvider.GetUtcNow();
        for (int i = 0; i < SampleNotes.All.Count; i++)
        {
            DateTimeOffset timestamp = now.AddMinutes(-i);
            SampleNote sample = SampleNotes.All[i];
            yield return Note.Create(Guid.CreateVersion7(timestamp), sample.Title, sample.Content, timestamp);
        }
    }
}
