using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NotesApp.Api.Data;
using NotesApp.Api.Data.Seeding;
using NotesApp.Api.Features.Notes;
using Xunit;

namespace NotesApp.Api.Tests.Integration;

[Trait("Category", "Integration")]
[Collection(IntegrationCollectionDefinition.Name)]
public abstract class SampleNoteSeederTests(ApiWebApplicationFactory factory) : IAsyncLifetime
{
    protected ApiWebApplicationFactory Factory { get; } = factory;

    public async ValueTask InitializeAsync()
    {
        await using AsyncServiceScope scope = Factory.Services.CreateAsyncScope();
        AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await dbContext.Notes.ExecuteDeleteAsync();
    }

    public ValueTask DisposeAsync()
    {
        GC.SuppressFinalize(this);
        return ValueTask.CompletedTask;
    }

    [Trait("Category", "Integration")]
    [Collection(IntegrationCollectionDefinition.Name)]
    public sealed class Seed(ApiWebApplicationFactory factory) : SampleNoteSeederTests(factory)
    {
        [Fact]
        public async Task EmptyDatabase_SeedsSampleNotesInListOrder()
        {
            await using AsyncServiceScope scope = Factory.Services.CreateAsyncScope();
            AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            SampleNoteSeeder.Seed(dbContext, TimeProvider.System);
            List<string> titles = await dbContext.Notes
                .OrderByDescending(note => note.UpdatedAt)
                .ThenByDescending(note => note.Id)
                .Select(note => note.Title)
                .ToListAsync(TestContext.Current.CancellationToken);

            Assert.Equal(SampleNotes.All.Select(sample => sample.Title), titles);
        }

        [Fact]
        public async Task ExistingNotes_DoesNotSeed()
        {
            await using AsyncServiceScope scope = Factory.Services.CreateAsyncScope();
            AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            dbContext.Notes.Add(Note.Create(Guid.CreateVersion7(), "タイトル", "本文", DateTimeOffset.UtcNow));
            await dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

            SampleNoteSeeder.Seed(dbContext, TimeProvider.System);

            string title = Assert.Single(await dbContext.Notes.Select(note => note.Title).ToListAsync(TestContext.Current.CancellationToken));
            Assert.Equal("タイトル", title);
        }
    }

    [Trait("Category", "Integration")]
    [Collection(IntegrationCollectionDefinition.Name)]
    public sealed class SeedAsync(ApiWebApplicationFactory factory) : SampleNoteSeederTests(factory)
    {
        [Fact]
        public async Task EmptyDatabase_SeedsSampleNotesInListOrder()
        {
            await using AsyncServiceScope scope = Factory.Services.CreateAsyncScope();
            AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            await SampleNoteSeeder.SeedAsync(dbContext, TimeProvider.System, TestContext.Current.CancellationToken);
            List<string> titles = await dbContext.Notes
                .OrderByDescending(note => note.UpdatedAt)
                .ThenByDescending(note => note.Id)
                .Select(note => note.Title)
                .ToListAsync(TestContext.Current.CancellationToken);

            Assert.Equal(SampleNotes.All.Select(sample => sample.Title), titles);
        }

        [Fact]
        public async Task ExistingNotes_DoesNotSeed()
        {
            await using AsyncServiceScope scope = Factory.Services.CreateAsyncScope();
            AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            dbContext.Notes.Add(Note.Create(Guid.CreateVersion7(), "タイトル", "本文", DateTimeOffset.UtcNow));
            await dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

            await SampleNoteSeeder.SeedAsync(dbContext, TimeProvider.System, TestContext.Current.CancellationToken);

            string title = Assert.Single(await dbContext.Notes.Select(note => note.Title).ToListAsync(TestContext.Current.CancellationToken));
            Assert.Equal("タイトル", title);
        }
    }

    // Starts a separate app instance so that its startup MigrateAsync runs the seeding registered in Program.cs.
    [Trait("Category", "Integration")]
    [Collection(IntegrationCollectionDefinition.Name)]
    public sealed class SeedSampleData(ApiWebApplicationFactory factory) : SampleNoteSeederTests(factory)
    {
        [Fact]
        public async Task True_SeedsSampleNotesOnStartup()
        {
            int count = await CountNotesAfterStartupAsync("true");

            Assert.Equal(SampleNotes.All.Count, count);
        }

        [Fact]
        public async Task False_DoesNotSeedOnStartup()
        {
            int count = await CountNotesAfterStartupAsync("false");

            Assert.Equal(0, count);
        }

        private async Task<int> CountNotesAfterStartupAsync(string seedSampleData)
        {
            await using WebApplicationFactory<Program> app = Factory.WithWebHostBuilder(builder => builder.UseSetting("SEED_SAMPLE_DATA", seedSampleData));
            await using AsyncServiceScope scope = app.Services.CreateAsyncScope();
            AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            return await dbContext.Notes.CountAsync(TestContext.Current.CancellationToken);
        }
    }
}
