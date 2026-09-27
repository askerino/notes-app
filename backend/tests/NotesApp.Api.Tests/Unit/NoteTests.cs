using System.Globalization;
using NotesApp.Api.Features.Notes;
using Xunit;

namespace NotesApp.Api.Tests.Unit;

public sealed class NoteTests
{
    private static readonly DateTimeOffset SampleTimestamp = DateTimeOffset.Parse("2026-01-01T00:00:00Z", CultureInfo.InvariantCulture);

    public sealed class Create
    {
        [Fact]
        public void BlankData_Succeeds()
        {
            Note note = Note.Create(Guid.NewGuid(), "", "", SampleTimestamp);

            Assert.Equal("", note.Title);
            Assert.Equal("", note.Content);
            Assert.Equal(SampleTimestamp, note.CreatedAt);
            Assert.Equal(SampleTimestamp, note.UpdatedAt);
        }

        [Fact]
        public void ValidData_Succeeds()
        {
            Guid id = Guid.NewGuid();

            Note note = Note.Create(id, " タイトル ", " 本文 ", SampleTimestamp);

            Assert.Equal(id, note.Id);
            Assert.Equal("タイトル", note.Title);
            Assert.Equal(" 本文 ", note.Content);
            Assert.Equal(SampleTimestamp, note.CreatedAt);
            Assert.Equal(SampleTimestamp, note.UpdatedAt);
        }

        public sealed class Title
        {
            [Fact]
            public void AtMaxLengthAfterTrimming_Succeeds()
            {
                string title = new('あ', Note.MaxTitleLength);

                Note note = Note.Create(Guid.NewGuid(), $" {title} ", string.Empty, SampleTimestamp);

                Assert.Equal(title, note.Title);
            }

            [Fact]
            public void OverMaxLengthAfterTrimming_Throws()
            {
                Assert.Throws<ArgumentException>(() =>
                    Note.Create(Guid.NewGuid(), new string('あ', Note.MaxTitleLength + 1), string.Empty, SampleTimestamp));
            }

            [Fact]
            public void Null_Throws()
            {
                Assert.Throws<ArgumentNullException>(() => Note.Create(Guid.NewGuid(), null!, string.Empty, SampleTimestamp));
            }
        }

        public sealed class Content
        {
            [Fact]
            public void AtMaxLength_Succeeds()
            {
                string content = new('あ', Note.MaxContentLength);

                Note note = Note.Create(Guid.NewGuid(), string.Empty, content, SampleTimestamp);

                Assert.Equal(content, note.Content);
            }

            [Fact]
            public void OverMaxLength_Throws()
            {
                Assert.Throws<ArgumentException>(() =>
                    Note.Create(Guid.NewGuid(), string.Empty, new string('あ', Note.MaxContentLength + 1), SampleTimestamp));
            }

            [Fact]
            public void Null_Throws()
            {
                Assert.Throws<ArgumentNullException>(() => Note.Create(Guid.NewGuid(), string.Empty, null!, SampleTimestamp));
            }
        }
    }

    public sealed class Update
    {
        [Fact]
        public void BlankData_Succeeds()
        {
            Note note = CreateExistingNote();
            DateTimeOffset updatedAt = SampleTimestamp.AddMinutes(1);

            note.Update("", "", updatedAt);

            Assert.Equal("", note.Title);
            Assert.Equal("", note.Content);
            Assert.Equal(updatedAt, note.UpdatedAt);
            Assert.Equal(SampleTimestamp, note.CreatedAt);
        }

        [Fact]
        public void ValidData_Succeeds()
        {
            Note note = CreateExistingNote();
            DateTimeOffset updatedAt = SampleTimestamp.AddMinutes(1);

            note.Update(" 更新したタイトル ", "更新した本文", updatedAt);

            Assert.Equal("更新したタイトル", note.Title);
            Assert.Equal("更新した本文", note.Content);
            Assert.Equal(updatedAt, note.UpdatedAt);
            Assert.Equal(SampleTimestamp, note.CreatedAt);
        }

        [Fact]
        public void InvalidData_ThrowsAndKeepsPreviousState()
        {
            Note note = CreateExistingNote();
            string tooLongTitle = new('あ', Note.MaxTitleLength + 1);

            Assert.Throws<ArgumentException>(() => note.Update(tooLongTitle, "更新した本文", SampleTimestamp.AddMinutes(1)));

            Assert.Equal("タイトル", note.Title);
            Assert.Equal("本文", note.Content);
            Assert.Equal(SampleTimestamp, note.CreatedAt);
            Assert.Equal(SampleTimestamp, note.UpdatedAt);
        }
    }

    private static Note CreateExistingNote()
    {
        return Note.Create(Guid.NewGuid(), "タイトル", "本文", SampleTimestamp);
    }
}
