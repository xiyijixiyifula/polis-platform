'use client';

import { useEffect, useRef, useState } from 'react';

interface CherryEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function CherryEditor({
  value,
  onChange,
  placeholder = '请输入内容...',
  minHeight = '400px',
}: CherryEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const Cherry = (await import('cherry-markdown')).default;
        if (!mounted || !containerRef.current) return;

        const editor = new Cherry({
          el: containerRef.current,
          value: value,
          editor: {
            defaultModel: 'edit&preview',
            height: minHeight,
          },
          toolbars: {
            theme: 'light',
            showToolbar: true,
            toolbar: [
              'bold', 'italic', 'strikethrough', '|',
              'header', '|',
              'list', 'ol', '|',
              'quote', 'code', '|',
              'link', 'image', 'table', '|',
              'undo', 'redo',
            ],
          },
          engine: {
            syntax: {
              header: { anchorStyle: 'none' },
            },
          },
        });

        editorRef.current = editor;

        // 监听内容变化
        editor.on('afterChange', () => {
          const md = editor.getMarkdown();
          onChange(md);
        });

        if (mounted) setLoading(false);
      } catch (e: any) {
        console.error('Cherry init error:', e);
        if (mounted) {
          setError(e?.message || 'Cherry 编辑器加载失败');
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (editorRef.current) {
        try { editorRef.current.destroy(); } catch {}
      }
    };
  }, []);

  // 外部 value 变化同步
  useEffect(() => {
    if (editorRef.current) {
      const current = editorRef.current.getMarkdown();
      if (current !== value) {
        editorRef.current.setMarkdown(value);
      }
    }
  }, [value]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="cherry-editor-wrapper rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
      {loading && (
        <div className="flex items-center justify-center" style={{ height: minHeight }}>
          <span className="text-sm text-gray-400">加载编辑器...</span>
        </div>
      )}
      <div ref={containerRef} style={{ display: loading ? 'none' : 'block' }} />
    </div>
  );
}
