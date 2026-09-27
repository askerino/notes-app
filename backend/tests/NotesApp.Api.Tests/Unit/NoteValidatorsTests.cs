using FluentValidation.TestHelper;
using NotesApp.Api.Features.Notes;
using Xunit;

namespace NotesApp.Api.Tests.Unit;

public sealed class SaveNoteValidatorTests
{
    private readonly SaveNoteValidator validator = new();

    [Theory]
    [InlineData("", "")]
    [InlineData("   ", "   ")]
    public void BlankData_HasNoErrors(string title, string content)
    {
        SaveNoteRequest request = new(title, content);

        TestValidationResult<SaveNoteRequest> result = validator.TestValidate(request);

        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void ValidData_HasNoErrors()
    {
        SaveNoteRequest request = new("タイトル", "本文");

        TestValidationResult<SaveNoteRequest> result = validator.TestValidate(request);

        result.ShouldNotHaveAnyValidationErrors();
    }

    public sealed class Title
    {
        private readonly SaveNoteValidator validator = new();

        [Fact]
        public void AtMaxLengthAfterTrimming_HasNoError()
        {
            SaveNoteRequest request = new(
                $" {new string('あ', Note.MaxTitleLength)} ",
                "本文");

            TestValidationResult<SaveNoteRequest> result = validator.TestValidate(request);

            result.ShouldNotHaveValidationErrorFor(value => value.Title);
        }

        [Fact]
        public void OverMaxLengthAfterTrimming_HasError()
        {
            SaveNoteRequest request = new(
                new string('あ', Note.MaxTitleLength + 1),
                "本文");

            TestValidationResult<SaveNoteRequest> result = validator.TestValidate(request);

            result.ShouldHaveValidationErrorFor(value => value.Title);
        }

        [Fact]
        public void Null_HasError()
        {
            SaveNoteRequest request = new(null!, "本文");

            TestValidationResult<SaveNoteRequest> result = validator.TestValidate(request);

            result.ShouldHaveValidationErrorFor(value => value.Title);
        }
    }

    public sealed class Content
    {
        private readonly SaveNoteValidator validator = new();

        [Fact]
        public void AtMaxLength_HasNoError()
        {
            SaveNoteRequest request = new(
                "タイトル",
                new string('あ', Note.MaxContentLength));

            TestValidationResult<SaveNoteRequest> result = validator.TestValidate(request);

            result.ShouldNotHaveValidationErrorFor(value => value.Content);
        }

        [Fact]
        public void OverMaxLength_HasError()
        {
            SaveNoteRequest request = new(
                "タイトル",
                new string('あ', Note.MaxContentLength + 1));

            TestValidationResult<SaveNoteRequest> result = validator.TestValidate(request);

            result.ShouldHaveValidationErrorFor(value => value.Content);
        }

        [Fact]
        public void Null_HasError()
        {
            SaveNoteRequest request = new("タイトル", null!);

            TestValidationResult<SaveNoteRequest> result = validator.TestValidate(request);

            result.ShouldHaveValidationErrorFor(value => value.Content);
        }
    }
}

public sealed class SearchNotesValidatorTests
{
    private readonly SearchNotesValidator validator = new();

    [Fact]
    public void DefaultValues_HaveNoErrors()
    {
        SearchNotesRequest request = new(null);

        TestValidationResult<SearchNotesRequest> result = validator.TestValidate(request);

        result.ShouldNotHaveAnyValidationErrors();
    }

    public sealed class Query
    {
        private readonly SearchNotesValidator validator = new();

        [Fact]
        public void AtMaxLength_HasNoError()
        {
            SearchNotesRequest request = new(new string('あ', 100));

            TestValidationResult<SearchNotesRequest> result = validator.TestValidate(request);

            result.ShouldNotHaveValidationErrorFor(value => value.Query);
        }

        [Fact]
        public void OverMaxLength_HasError()
        {
            SearchNotesRequest request = new(new string('あ', 101));

            TestValidationResult<SearchNotesRequest> result = validator.TestValidate(request);

            result.ShouldHaveValidationErrorFor(value => value.Query);
        }
    }

    public sealed class Offset
    {
        private readonly SearchNotesValidator validator = new();

        [Fact]
        public void Zero_HasNoError()
        {
            SearchNotesRequest request = new(null, Offset: 0);

            TestValidationResult<SearchNotesRequest> result = validator.TestValidate(request);

            result.ShouldNotHaveValidationErrorFor(value => value.Offset);
        }

        [Fact]
        public void Negative_HasError()
        {
            SearchNotesRequest request = new(null, Offset: -1);

            TestValidationResult<SearchNotesRequest> result = validator.TestValidate(request);

            result.ShouldHaveValidationErrorFor(value => value.Offset);
        }
    }

    public sealed class Limit
    {
        private readonly SearchNotesValidator validator = new();

        [Theory]
        [InlineData(1)]
        [InlineData(100)]
        public void WithinRange_HasNoError(int limit)
        {
            SearchNotesRequest request = new(null, Limit: limit);

            TestValidationResult<SearchNotesRequest> result = validator.TestValidate(request);

            result.ShouldNotHaveValidationErrorFor(value => value.Limit);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(101)]
        public void OutOfRange_HasError(int limit)
        {
            SearchNotesRequest request = new(null, Limit: limit);

            TestValidationResult<SearchNotesRequest> result = validator.TestValidate(request);

            result.ShouldHaveValidationErrorFor(value => value.Limit);
        }
    }
}
