using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NotesApp.Api.Data;
using Xunit;

namespace NotesApp.Api.Tests.Integration;

[Trait("Category", "Integration")]
[Collection(IntegrationCollectionDefinition.Name)]
public abstract class NoteEndpointsTests(ApiWebApplicationFactory factory) : IAsyncLifetime
{
    protected ApiWebApplicationFactory Factory { get; } = factory;

    protected HttpClient Client { get; } = factory.CreateClient();

    public async ValueTask InitializeAsync()
    {
        await using AsyncServiceScope scope = Factory.Services.CreateAsyncScope();
        AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await dbContext.Notes.ExecuteDeleteAsync();
    }

    public ValueTask DisposeAsync()
    {
        Client.Dispose();
        GC.SuppressFinalize(this);
        return ValueTask.CompletedTask;
    }

    protected sealed record NoteSummaryDto(
        Guid Id,
        string Title);

    protected sealed record NotePageDto(
        IReadOnlyList<NoteSummaryDto> Items,
        int? NextOffset);

    protected sealed record NoteDto(
        Guid Id,
        string Title,
        string Content,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt);

    protected async Task<NoteDto> CreateNoteAsync(string title, string content)
    {
        HttpResponseMessage response = await Client.PostAsJsonAsync("/api/notes", new { title, content }, TestContext.Current.CancellationToken);
        NoteDto? note = await response.Content.ReadFromJsonAsync<NoteDto>(TestContext.Current.CancellationToken);
        Assert.NotNull(note);
        return note;
    }

    [Trait("Category", "Integration")]
    [Collection(IntegrationCollectionDefinition.Name)]
    public sealed class Create(ApiWebApplicationFactory factory) : NoteEndpointsTests(factory)
    {
        [Fact]
        public async Task BlankData_ReturnsCreatedNote()
        {
            HttpResponseMessage response =
                await Client.PostAsJsonAsync("/api/notes", new { title = "", content = "" }, TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            NoteDto? note = await response.Content.ReadFromJsonAsync<NoteDto>(TestContext.Current.CancellationToken);

            Assert.NotNull(note);
            Assert.Equal("", note.Title);
            Assert.Equal("", note.Content);
        }

        [Fact]
        public async Task ValidData_ReturnsCreatedNote()
        {
            HttpResponseMessage response =
                await Client.PostAsJsonAsync("/api/notes", new { title = "タイトル", content = "本文" }, TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            NoteDto? note = await response.Content.ReadFromJsonAsync<NoteDto>(TestContext.Current.CancellationToken);

            Assert.NotNull(note);
            Assert.Equal("タイトル", note.Title);
            Assert.Equal("本文", note.Content);
        }

        [Fact]
        public async Task NullData_ReturnsBadRequest()
        {
            HttpResponseMessage response =
                await Client.PostAsJsonAsync("/api/notes", new { title = (string?)null, content = (string?)null }, TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            ValidationProblemDetails? problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>(TestContext.Current.CancellationToken);

            Assert.NotNull(problem);
            Assert.Contains("title", problem.Errors.Keys);
            Assert.Contains("content", problem.Errors.Keys);
        }
    }

    [Trait("Category", "Integration")]
    [Collection(IntegrationCollectionDefinition.Name)]
    public sealed class Search(ApiWebApplicationFactory factory) : NoteEndpointsTests(factory)
    {
        [Fact]
        public async Task Notes_ReturnsUpdatedAtDescending()
        {
            NoteDto first = await CreateNoteAsync("タイトル1", "本文");
            NoteDto second = await CreateNoteAsync("タイトル2", "本文");

            NotePageDto? response =
                await Client.GetFromJsonAsync<NotePageDto>("/api/notes", TestContext.Current.CancellationToken);

            Assert.NotNull(response);
            Assert.Equal([second.Id, first.Id], response.Items.Select(note => note.Id));
        }

        [Fact]
        public async Task Query_ReturnsNotesMatchingTitleOrContent()
        {
            NoteDto matching = await CreateNoteAsync("会議メモ", "議題は来週の予定");
            await CreateNoteAsync("買い物リスト", "牛乳とパン");

            NotePageDto? response =
                await Client.GetFromJsonAsync<NotePageDto>("/api/notes?q=会議", TestContext.Current.CancellationToken);

            Assert.NotNull(response);
            Assert.Single(response.Items);
            Assert.Equal(matching.Id, response.Items[0].Id);

            response =
                await Client.GetFromJsonAsync<NotePageDto>("/api/notes?q=議題", TestContext.Current.CancellationToken);

            Assert.NotNull(response);
            Assert.Single(response.Items);
            Assert.Equal(matching.Id, response.Items[0].Id);
        }

        [Fact]
        public async Task QueryWithBackslash_ReturnsMatchingNote()
        {
            NoteDto matching = await CreateNoteAsync("a\\b", "");

            NotePageDto? response =
                await Client.GetFromJsonAsync<NotePageDto>($"/api/notes?q={Uri.EscapeDataString("a\\b")}", TestContext.Current.CancellationToken);

            Assert.NotNull(response);
            Assert.Single(response.Items);
            Assert.Equal(matching.Id, response.Items[0].Id);
        }

        [Fact]
        public async Task QueryWithPercent_ReturnsMatchingNote()
        {
            NoteDto matching = await CreateNoteAsync("a%b", "");
            await CreateNoteAsync("aXb", "");

            NotePageDto? response =
                await Client.GetFromJsonAsync<NotePageDto>($"/api/notes?q={Uri.EscapeDataString("a%b")}", TestContext.Current.CancellationToken);

            Assert.NotNull(response);
            Assert.Single(response.Items);
            Assert.Equal(matching.Id, response.Items[0].Id);
        }

        [Fact]
        public async Task QueryWithUnderscore_ReturnsMatchingNote()
        {
            NoteDto matching = await CreateNoteAsync("a_b", "");
            await CreateNoteAsync("aXb", "");

            NotePageDto? response =
                await Client.GetFromJsonAsync<NotePageDto>("/api/notes?q=a_b", TestContext.Current.CancellationToken);

            Assert.NotNull(response);
            Assert.Single(response.Items);
            Assert.Equal(matching.Id, response.Items[0].Id);
        }

        [Fact]
        public async Task Limit_ReturnsPaginatedResults()
        {
            for (int index = 0; index < 3; index++)
            {
                await CreateNoteAsync($"タイトル{index + 1}", "本文");
            }

            NotePageDto? first =
                await Client.GetFromJsonAsync<NotePageDto>("/api/notes?limit=2", TestContext.Current.CancellationToken);

            Assert.NotNull(first);
            Assert.Equal(2, first.Items.Count);
            Assert.Equal(2, first.NextOffset);

            NotePageDto? second =
                await Client.GetFromJsonAsync<NotePageDto>($"/api/notes?limit=2&offset={first.NextOffset}", TestContext.Current.CancellationToken);

            Assert.NotNull(second);
            Assert.Single(second.Items);
        }

        [Theory]
        [MemberData(nameof(InvalidQueryStrings))]
        public async Task InvalidData_ReturnsBadRequest(string queryString)
        {
            HttpResponseMessage response =
                await Client.GetAsync($"/api/notes?{queryString}", TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        public static TheoryData<string> InvalidQueryStrings => new()
        {
            $"q={new string('あ', 101)}",
            "offset=-1",
            "limit=0",
            "limit=101",
        };
    }

    [Trait("Category", "Integration")]
    [Collection(IntegrationCollectionDefinition.Name)]
    public sealed class GetById(ApiWebApplicationFactory factory) : NoteEndpointsTests(factory)
    {
        [Fact]
        public async Task ExistingId_ReturnsNote()
        {
            NoteDto created = await CreateNoteAsync("タイトル", "本文");

            NoteDto? fetched =
                await Client.GetFromJsonAsync<NoteDto>($"/api/notes/{created.Id}", TestContext.Current.CancellationToken);

            Assert.NotNull(fetched);
            Assert.Equal(created.Id, fetched.Id);
            Assert.Equal(created.Title, fetched.Title);
            Assert.Equal(created.Content, fetched.Content);
            Assert.Equal(created.CreatedAt, fetched.CreatedAt, TimeSpan.FromMilliseconds(1));
            Assert.Equal(created.UpdatedAt, fetched.UpdatedAt, TimeSpan.FromMilliseconds(1));
        }

        [Fact]
        public async Task NonExistentId_ReturnsNotFound()
        {
            HttpResponseMessage response =
                await Client.GetAsync($"/api/notes/{Guid.Empty}", TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
    }

    [Trait("Category", "Integration")]
    [Collection(IntegrationCollectionDefinition.Name)]
    public sealed class Update(ApiWebApplicationFactory factory) : NoteEndpointsTests(factory)
    {
        [Fact]
        public async Task ValidData_ReturnsUpdatedNote()
        {
            NoteDto created = await CreateNoteAsync("タイトル", "本文");

            HttpResponseMessage response =
                await Client.PutAsJsonAsync($"/api/notes/{created.Id}", new { title = "更新したタイトル", content = "更新した本文" }, TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            NoteDto? updated = await response.Content.ReadFromJsonAsync<NoteDto>(TestContext.Current.CancellationToken);

            Assert.NotNull(updated);
            Assert.Equal("更新したタイトル", updated.Title);
            Assert.Equal("更新した本文", updated.Content);
            Assert.True(updated.UpdatedAt >= created.UpdatedAt);
        }

        [Fact]
        public async Task NonExistentId_ReturnsNotFound()
        {
            HttpResponseMessage response =
                await Client.PutAsJsonAsync($"/api/notes/{Guid.Empty}", new { title = "タイトル", content = "本文" }, TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
    }

    [Trait("Category", "Integration")]
    [Collection(IntegrationCollectionDefinition.Name)]
    public sealed class Delete(ApiWebApplicationFactory factory) : NoteEndpointsTests(factory)
    {
        [Fact]
        public async Task ExistingId_RemovesNote()
        {
            NoteDto created = await CreateNoteAsync("タイトル", "本文");

            HttpResponseMessage response =
                await Client.DeleteAsync($"/api/notes/{created.Id}", TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await Client.GetAsync($"/api/notes/{created.Id}", TestContext.Current.CancellationToken)).StatusCode);
        }

        [Fact]
        public async Task NonExistentId_ReturnsNotFound()
        {
            HttpResponseMessage response =
                await Client.DeleteAsync($"/api/notes/{Guid.Empty}", TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
    }

    [Trait("Category", "Integration")]
    [Collection(IntegrationCollectionDefinition.Name)]
    public sealed class Misc(ApiWebApplicationFactory factory) : NoteEndpointsTests(factory)
    {
        [Fact]
        public async Task OpenApiDocument_ReturnsOk()
        {
            HttpResponseMessage response =
                await Client.GetAsync("/openapi/v1.json", TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task HealthEndpoints_ReturnsOk()
        {
            Assert.Equal(HttpStatusCode.OK, (await Client.GetAsync("/health/live", TestContext.Current.CancellationToken)).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await Client.GetAsync("/health/ready", TestContext.Current.CancellationToken)).StatusCode);
        }

        [Fact]
        public async Task UnhandledException_ReturnsGenericProblemDetails()
        {
            await using WebApplicationFactory<Program> throwingFactory = Factory.WithWebHostBuilder(builder => builder
                .ConfigureServices(services => services
                    .RemoveAll<TimeProvider>()
                    .AddSingleton<TimeProvider>(new ThrowingTimeProvider())));
            using HttpClient throwingClient = throwingFactory.CreateClient();

            HttpResponseMessage response =
                await throwingClient.PostAsJsonAsync("/api/notes", new { title = "タイトル", content = "本文" }, TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);

            ProblemDetails? problem = await response.Content.ReadFromJsonAsync<ProblemDetails>(TestContext.Current.CancellationToken);

            Assert.NotNull(problem);
            Assert.Equal((int)HttpStatusCode.InternalServerError, problem.Status);
            Assert.Equal("予期しないエラーが発生しました。", problem.Title);

            string body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);

            Assert.DoesNotContain(nameof(ThrowingTimeProvider), body, StringComparison.Ordinal);
        }

        private sealed class ThrowingTimeProvider : TimeProvider
        {
            public override DateTimeOffset GetUtcNow()
            {
                throw new InvalidOperationException("Simulated exception for GlobalExceptionHandler test.");
            }
        }
    }
}
