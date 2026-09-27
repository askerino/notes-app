using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace NotesApp.Api.Features.Notes;

public sealed class NoteConfiguration : IEntityTypeConfiguration<Note>
{
    public void Configure(EntityTypeBuilder<Note> builder)
    {
        builder.ToTable("notes");
        builder.HasKey(value => value.Id);
        builder.Property(value => value.Title).HasMaxLength(Note.MaxTitleLength).IsRequired();
        builder.Property(value => value.Content).HasMaxLength(Note.MaxContentLength).IsRequired();
        builder.Property(value => value.CreatedAt).IsRequired();
        builder.Property(value => value.UpdatedAt).IsRequired();
        // Supports the Search ordering by UpdatedAt and Id.
        builder.HasIndex(value => new { value.UpdatedAt, value.Id })
            .IsDescending(true, true)
            .HasDatabaseName("ix_notes_updated_at_id");
    }
}
