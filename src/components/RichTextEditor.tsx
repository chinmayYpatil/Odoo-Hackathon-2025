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
        <style>{`
          .rich-text-editor .ql-editor {
            min-height: 150px;
            font-size: 14px;
            line-height: 1.6;
            color: #1f2937;
          }
          .rich-text-editor .ql-toolbar {
            border-top-left-radius: 0.5rem;
            border-top-right-radius: 0.5rem;
            border-color: #e5e7eb;
            background-color: #f9fafb;
          }
          .rich-text-editor .ql-container {
            border-bottom-left-radius: 0.5rem;
            border-bottom-right-radius: 0.5rem;
            border-color: #e5e7eb;
            background-color: white;
          }
          .rich-text-editor .ql-editor.ql-blank::before {
            color: #9ca3af;
            font-style: normal;
          }
          
          /* Dark mode styles */
          .dark .rich-text-editor .ql-editor {
            color: #f3f4f6;
            background-color: #374151;
          }
          .dark .rich-text-editor .ql-toolbar {
            border-color: #4b5563;
            background-color: #1f2937;
          }
          .dark .rich-text-editor .ql-container {
            border-color: #4b5563;
            background-color: #374151;
          }
          .dark .rich-text-editor .ql-editor.ql-blank::before {
            color: #9ca3af;
          }
          .dark .rich-text-editor .ql-stroke {
            stroke: #d1d5db;
          }
          .dark .rich-text-editor .ql-fill {
            fill: #d1d5db;
          }
          .dark .rich-text-editor .ql-picker {
            color: #d1d5db;
          }
          .dark .rich-text-editor .ql-picker-options {
            background-color: #1f2937;
            border-color: #4b5563;
          }
        `}</style>
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;