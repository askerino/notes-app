using FluentValidation;

namespace NotesApp.Api.Features.Notes;

public sealed class SaveNoteValidator : AbstractValidator<SaveNoteRequest>
{
    public SaveNoteValidator()
    {
        RuleFor(value => value.Title)
            .NotNull()
            .WithMessage("タイトルを入力してください。")
            .Must(title => title is null || title.Trim().Length <= Note.MaxTitleLength)
            .WithMessage($"タイトルは{Note.MaxTitleLength}文字以内で入力してください。");
        RuleFor(value => value.Content)
            .NotNull()
            .WithMessage("本文を入力してください。")
            .MaximumLength(Note.MaxContentLength)
            .WithMessage($"本文は{Note.MaxContentLength:N0}文字以内で入力してください。");
    }
}

public sealed class SearchNotesValidator : AbstractValidator<SearchNotesRequest>
{
    public SearchNotesValidator()
    {
        RuleFor(value => value.Query).MaximumLength(100).WithMessage("検索キーワードは100文字以内で入力してください。");
        RuleFor(value => value.Offset).GreaterThanOrEqualTo(0).WithMessage("offsetは0以上を指定してください。");
        RuleFor(value => value.Limit).InclusiveBetween(1, 100).WithMessage("limitは1から100の範囲で指定してください。");
    }
}
