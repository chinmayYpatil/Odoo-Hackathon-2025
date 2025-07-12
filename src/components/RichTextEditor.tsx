import React, { forwardRef, useEffect, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor = forwardRef<ReactQuill, RichTextEditorProps>(
  ({ value, onChange, placeholder = 'Write your content here...', className = '' }, ref) => {
    const modules = useMemo(() => ({
      toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean']
      ],
    }), []);

    const formats = [
      'header',
      'bold', 'italic', 'underline', 'strike',
      'list', 'bullet',
      'align',
      'link', 'image'
    ];

    return (
      <div className={`rich-text-editor ${className}`}>
        <ReactQuill
          ref={ref}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
          }}
        />
        <style jsx global>{`
          .rich-text-editor .ql-editor {
            min-height: 150px;
            font-size: 14px;
            line-height: 1.6;
          }
          .rich-text-editor .ql-toolbar {
            border-top-left-radius: 0.5rem;
            border-top-right-radius: 0.5rem;
            border-color: #e5e7eb;
          }
          .rich-text-editor .ql-container {
            border-bottom-left-radius: 0.5rem;
            border-bottom-right-radius: 0.5rem;
            border-color: #e5e7eb;
          }
          .rich-text-editor .ql-editor.ql-blank::before {
            color: #9ca3af;
            font-style: normal;
          }
        `}</style>
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;