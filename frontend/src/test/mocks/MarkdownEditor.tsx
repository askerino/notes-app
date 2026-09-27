type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function MarkdownEditor(props: MarkdownEditorProps) {
  return (
    <textarea
      value={props.value}
      onChange={(event) => props.onChange(event.currentTarget.value)}
      aria-label="本文"
    />
  );
}
