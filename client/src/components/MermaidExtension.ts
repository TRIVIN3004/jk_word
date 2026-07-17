import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import MermaidComponent from './MermaidComponent';

export default Node.create({
  name: 'mermaidDiagram',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      code: {
        default: 'graph TD\n  A[Start] --> B(Verify Checkpoint)\n  B --> C{Verify Output?}\n  C -- Yes --> D[Generate Export]\n  C -- No --> E[Edit Colors]',
      },
      theme: {
        default: 'brand', // 'brand' | 'blue' | 'green' | 'dark'
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid"]',
        getAttrs: (element: HTMLElement | string) => {
          if (typeof element === 'string') return {};
          return {
            code: element.getAttribute('data-code'),
            theme: element.getAttribute('data-theme'),
          };
        }
      },
      // Also match standard mermaid classes from parsed docx markup if any
      {
        tag: 'div.mermaid',
        getAttrs: (element: HTMLElement | string) => {
          if (typeof element === 'string') return {};
          return {
            code: element.textContent || '',
            theme: 'brand'
          };
        }
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div', 
      mergeAttributes(HTMLAttributes, { 'data-type': 'mermaid' }),
      HTMLAttributes.code || ''
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidComponent);
  },
});
