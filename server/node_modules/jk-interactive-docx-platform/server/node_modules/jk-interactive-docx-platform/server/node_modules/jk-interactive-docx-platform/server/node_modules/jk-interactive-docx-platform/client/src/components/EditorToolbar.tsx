'use client';

import React from 'react';
import { Editor } from '@tiptap/react';
import { 
  Bold, Italic, Underline, Heading1, Heading2, Heading3, 
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, 
  Table, Image, Link2, Eraser, Undo2, Redo2, Type, Highlighter,
  GitBranch
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
}

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL link address:', previousUrl);
    
    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt('Image URL address:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const insertFlowchart = () => {
    editor.chain().focus().insertContent({
      type: 'mermaidDiagram',
      attrs: {
        code: 'graph TD\n  A[Start Process] --> B(Verify Checkpoint)\n  B --> C{Check Output?}\n  C -- Yes --> D[Success]\n  C -- No --> E[Edit Colors]',
        theme: 'brand'
      }
    }).run();
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    editor.chain().focus().setColor(e.target.value).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm sticky top-0 z-30">
      
      {/* Undo & Redo */}
      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700 disabled:opacity-20 rounded-xl cursor-pointer"
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700 disabled:opacity-20 rounded-xl cursor-pointer"
        title="Redo (Ctrl+Y)"
      >
        <Redo2 className="h-4 w-4" />
      </button>

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

      {/* Headings */}
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-2 rounded-xl cursor-pointer ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700'}`}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-2 rounded-xl cursor-pointer ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700'}`}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`p-2 rounded-xl cursor-pointer ${editor.isActive('heading', { level: 3 }) ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700'}`}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </button>

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

      {/* Formatting Marks */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded-xl cursor-pointer ${editor.isActive('bold') ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700'}`}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded-xl cursor-pointer ${editor.isActive('italic') ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700'}`}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-2 rounded-xl cursor-pointer ${editor.isActive('underline') ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700'}`}
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        className={`p-2 rounded-xl cursor-pointer ${editor.isActive('highlight') ? 'bg-amber-500/20 text-amber-700 shadow-sm border border-amber-300/30' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700'}`}
        title="Highlight Marker"
      >
        <Highlighter className="h-4 w-4" />
      </button>

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

      {/* Colors Picker */}
      <div className="flex items-center gap-1 px-1" title="Text Color">
        <Type className="h-4 w-4 text-slate-500" />
        <input
          type="color"
          value={editor.getAttributes('textStyle').color || '#000000'}
          onChange={handleColorChange}
          className="h-6 w-6 border-0 bg-transparent rounded cursor-pointer"
        />
      </div>

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

      {/* Lists */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded-xl cursor-pointer ${editor.isActive('bulletList') ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700'}`}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded-xl cursor-pointer ${editor.isActive('orderedList') ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700'}`}
        title="Ordered List"
      >
        <ListOrdered className="h-4 w-4" />
      </button>

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

      {/* Tables, links and images */}
      <button
        onClick={insertTable}
        className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
        title="Insert Grid Table"
      >
        <Table className="h-4 w-4" />
      </button>
      <button
        onClick={setLink}
        className={`p-2 rounded-xl cursor-pointer ${editor.isActive('link') ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700'}`}
        title="Insert Link"
      >
        <Link2 className="h-4 w-4" />
      </button>
      <button
        onClick={addImage}
        className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
        title="Insert Image Link"
      >
        <Image className="h-4 w-4" />
      </button>
      <button
        onClick={insertFlowchart}
        className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
        title="Insert Flowchart Diagram"
      >
        <GitBranch className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      </button>

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

      {/* Clear formats */}
      <button
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
        title="Clear All Formatting"
      >
        <Eraser className="h-4 w-4" />
      </button>
    </div>
  );
}
