import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    [{ color: [] }, { background: [] }],
    ["clean"],
  ],
};

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  return (
    <div className="rich-text-editor">
      <ReactQuill theme="snow" value={value} onChange={onChange} modules={modules} />
      <style>{`
        .rich-text-editor .ql-toolbar {
          border-color: hsl(var(--border));
          background: hsl(var(--muted));
          border-radius: 0.5rem 0.5rem 0 0;
        }
        .rich-text-editor .ql-container {
          border-color: hsl(var(--border));
          background: hsl(var(--background));
          border-radius: 0 0 0.5rem 0.5rem;
          min-height: 200px;
          font-family: inherit;
        }
        .rich-text-editor .ql-editor {
          min-height: 200px;
          color: hsl(var(--foreground));
        }
        .rich-text-editor .ql-stroke { stroke: hsl(var(--muted-foreground)); }
        .rich-text-editor .ql-fill { fill: hsl(var(--muted-foreground)); }
        .rich-text-editor .ql-picker-label { color: hsl(var(--muted-foreground)); }
        .rich-text-editor .ql-picker-options {
          background: hsl(var(--popover));
          border-color: hsl(var(--border));
        }
      `}</style>
    </div>
  );
}
