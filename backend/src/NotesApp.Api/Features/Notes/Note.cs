namespace NotesApp.Api.Features.Notes;

public sealed class Note
{
    public const int MaxTitleLength = 100;
    public const int MaxContentLength = 100_000;

    private Note() { }
    private Note(Guid id, string title, string content, DateTimeOffset now)
    {
        ValidateTitle(title);
        ValidateContent(content);

        string trimmedTitle = TrimTitle(title);

        Id = id;
        Title = trimmedTitle;
        Content = content;
        CreatedAt = now;
        UpdatedAt = now;
    }

    public Guid Id { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string Content { get; private set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public static Note Create(Guid id, string title, string content, DateTimeOffset now)
    {
        return new(id, title, content, now);
    }

    public void Update(string title, string content, DateTimeOffset now)
    {
        ValidateTitle(title);
        ValidateContent(content);

        string trimmedTitle = TrimTitle(title);

        Title = trimmedTitle;
        Content = content;
        UpdatedAt = now;
    }

    private static string TrimTitle(string title)
    {
        return title.Trim();
    }

    private static void ValidateTitle(string title)
    {
        ArgumentNullException.ThrowIfNull(title);
        if (title.Trim().Length > MaxTitleLength)
        {
            throw new ArgumentException($"Title must be {MaxTitleLength} characters or fewer.", nameof(title));
        }
    }

    private static void ValidateContent(string content)
    {
        ArgumentNullException.ThrowIfNull(content);
        if (content.Length > MaxContentLength)
        {
            throw new ArgumentException($"Content must be {MaxContentLength} characters or fewer.", nameof(content));
        }
    }
}
