'use client';

import React, { useEffect, useState, useRef } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { GitBranch, Edit2, Check, RefreshCw } from 'lucide-react';
import mermaid from 'mermaid';

// Initialize mermaid configurations
try {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'base'
  });
} catch (e) {
  console.error("Mermaid initialization failed", e);
}

export default function MermaidComponent({ node, updateAttributes, editor }: NodeViewProps) {
  const { code, theme } = node.attrs;
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingCode, setEditingCode] = useState(code);
  const [selectedTheme, setSelectedTheme] = useState(theme || 'brand');
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useRef(`mermaid-${Math.floor(Math.random() * 1000000)}`);

  const isEditable = editor.isEditable;

  // Mermaid directives to apply custom colors
  const getThemeCode = (t: string) => {
    switch (t) {
      case 'brand':
        return `%%{init: {
          'theme': 'base', 
          'themeVariables': { 
            'primaryColor': '#f97316', 
            'primaryTextColor': '#ffffff', 
            'primaryBorderColor': '#ea580c', 
            'lineColor': '#475569', 
            'secondaryColor': '#cbd5e1', 
            'tertiaryColor': '#ffedd5' 
          }
        }}%%`;
      case 'blue':
        return `%%{init: {
          'theme': 'base', 
          'themeVariables': { 
            'primaryColor': '#eff6ff', 
            'primaryTextColor': '#1e3a8a', 
            'primaryBorderColor': '#3b82f6', 
            'lineColor': '#2563eb', 
            'secondaryColor': '#ffffff' 
          }
        }}%%`;
      case 'green':
        return `%%{init: {
          'theme': 'base', 
          'themeVariables': { 
            'primaryColor': '#ecfdf5', 
            'primaryTextColor': '#064e3b', 
            'primaryBorderColor': '#10b981', 
            'lineColor': '#059669', 
            'secondaryColor': '#ffffff' 
          }
        }}%%`;
      case 'dark':
        return `%%{init: {
          'theme': 'dark'
        }}%%`;
      default:
        return '';
    }
  };

  useEffect(() => {
    renderDiagram();
  }, [code, theme]);

  const renderDiagram = async () => {
    if (!code) return;
    setError(null);

    const directive = getThemeCode(theme);
    // Strip existing directives to avoid conflicts and prepend our selected theme directive
    const cleanCode = code.replace(/%%\{init:.*?\}%%/g, '').trim();
    const finalCode = `${directive}\n${cleanCode}`;

    try {
      // Clear out previous content to render fresh
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      // Check validation
      const isValid = await mermaid.parse(finalCode);
      if (isValid) {
        const { svg: renderedSvg } = await mermaid.render(uniqueId.current, finalCode);
        setSvg(renderedSvg);
        if (containerRef.current) {
          containerRef.current.innerHTML = renderedSvg;
        }
      }
    } catch (err: any) {
      console.error("Mermaid compile error:", err);
      setError(err.message || 'Syntax error inside diagram code');
    }
  };

  const handleApply = () => {
    updateAttributes({
      code: editingCode,
      theme: selectedTheme
    });
    setEditMode(false);
  };

  return (
    <NodeViewWrapper className="mermaid-diagram-block my-6 p-4 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 rounded-3xl relative group select-none">
      
      {/* Editor floating actions */}
      {isEditable && (
        <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1.5">
          <button
            onClick={() => {
              setEditingCode(code);
              setSelectedTheme(theme);
              setEditMode(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold shadow hover:bg-black transition-colors cursor-pointer"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit Style & Colors
          </button>
        </div>
      )}

      {/* Render target */}
      <div className="flex justify-center overflow-x-auto py-4">
        <div ref={containerRef} className="mermaid-render-container" />
      </div>

      {/* Error alert banner */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 text-xs rounded-xl flex items-start gap-2 mt-2">
          <RefreshCw className="h-4 w-4 shrink-0 mt-0.5 animate-spin" />
          <div>
            <span className="font-bold">Diagram compilation issue:</span> {error}
          </div>
        </div>
      )}

      {/* Editing & Color Selection Modal */}
      {editMode && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 w-full max-w-xl p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3">
              <span className="font-heading font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <GitBranch className="h-4.5 w-4.5 text-blue-500" />
                Customize Diagram Flowchart & Colors
              </span>
              <button onClick={() => setEditMode(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">Close</button>
            </div>

            {/* Presets color themes selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Select Diagram Theme
              </label>
              <div className="grid grid-cols-4 gap-2.5">
                {/* Orange Theme */}
                <button
                  type="button"
                  onClick={() => setSelectedTheme('brand')}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between h-20 transition-all ${selectedTheme === 'brand' ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/50 dark:bg-orange-950/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}
                >
                  <div className="w-4 h-4 rounded-full bg-[#f97316] border border-orange-950" />
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block">Brand Orange</span>
                </button>

                {/* Blue Theme */}
                <button
                  type="button"
                  onClick={() => setSelectedTheme('blue')}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between h-20 transition-all ${selectedTheme === 'blue' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}
                >
                  <div className="w-4 h-4 rounded-full bg-[#3b82f6] border border-blue-900" />
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block">Classic Blue</span>
                </button>

                {/* Green Theme */}
                <button
                  type="button"
                  onClick={() => setSelectedTheme('green')}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between h-20 transition-all ${selectedTheme === 'green' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}
                >
                  <div className="w-4 h-4 rounded-full bg-[#10b981] border border-emerald-900" />
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block">Forest Green</span>
                </button>

                {/* Dark Theme */}
                <button
                  type="button"
                  onClick={() => setSelectedTheme('dark')}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between h-20 transition-all ${selectedTheme === 'dark' ? 'border-slate-500 ring-2 ring-slate-500/20 bg-slate-900 text-white' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}
                >
                  <div className="w-4 h-4 rounded-full bg-slate-800 border border-slate-600" />
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block">Stealth Dark</span>
                </button>
              </div>
            </div>

            {/* Code editor */}
            <div className="space-y-2 flex-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Mermaid.js Flowchart Syntax
              </label>
              <textarea
                value={editingCode}
                onChange={(e) => setEditingCode(e.target.value)}
                placeholder="e.g. graph TD\n  A --> B"
                className="w-full h-44 p-3 font-mono text-[11px] leading-relaxed border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleApply}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Check className="h-4 w-4" />
              Apply Diagram Style
            </button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}
