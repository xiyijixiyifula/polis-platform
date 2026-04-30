'use client';

import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState, useId } from 'react';
import dynamic from 'next/dynamic';

type EditorModel = 'editOnly' | 'edit&preview' | 'previewOnly';
export type SwitchModel = EditorModel;

export interface CherryEditorRef {
  getMarkdown: () => string;
  getHtml: () => string;
  setMarkdown: (val: string) => void;
  switchModel: (model: EditorModel) => void;
}

interface CherryEditorProps {
  spaceNs?: string;
  value?: string;
  onChange?: (markdown: string, html: string) => void;
  height?: number | string;
  minHeight?: string;
  placeholder?: string;
  defaultModel?: EditorModel;
}

const CherryEditorInner = forwardRef<CherryEditorRef, CherryEditorProps>(({
  value = '',
  onChange,
  height = 450,
  minHeight,
  defaultModel = 'edit&preview',
  spaceNs,
}, ref) => {
  const cherryRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorId = useId().replace(/:/g, '');
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState('');

  useImperativeHandle(ref, () => ({
    getMarkdown: () => cherryRef.current?.getMarkdown() || '',
    getHtml: () => cherryRef.current?.getHtml() || '',
    setMarkdown: (val: string) => {
      cherryRef.current?.setMarkdown(val, true);
    },
    switchModel: (model: EditorModel) => {
      cherryRef.current?.switchModel(model);
    },
  }));

  useEffect(() => {
    let instance: any;
    let mounted = true;

    const init = async () => {
      try {
        const [{ default: Cherry }] = await Promise.all([
          import('cherry-markdown'),
        ]);

        if (!mounted || !containerRef.current) return;

        const computed = typeof height === 'number' ? String(height) + 'px' : height;
        const h = minHeight || computed;

        instance = new Cherry({
          id: editorId,
          value: value,

          editor: {
            defaultModel: defaultModel,
            height: h,
            codemirror: {
              autofocus: false,
              lineWrapping: true,
              viewportMargin: Infinity,
            },
          },

          toolbars: {
            theme: 'light',
            showToolbar: true,
            toolbar: [
              'bold', 'italic', 'strikethrough', '|',
              'header', '|',
              'list', 'image', { insert: ['link', 'code', 'table'] }, '|',
              'undo', 'redo', '|',
              'switchModel',
            ],
            bubble: ['bold', 'italic', 'underline', 'strikethrough', 'quote', '|', 'color'],
            float: ['h1', 'h2', 'h3', '|', 'checklist', 'quote', 'quickTable', 'code'],
          },

          engine: {
            syntax: {
              header: { anchorStyle: 'none' },
            },
          },

          previewer: {
            floatWhenClosePreviewer: false,
            enablePreviewerBubble: false,
          },

          callback: {
            afterChange: (text: string, html: string) => {
              onChange?.(text, html);
            },
          },

          fileUpload: async (file: File, callback: (url: string) => void) => {
            try {
              const reader = new FileReader();
              reader.onload = async (e) => {
                const base64 = (e.target?.result as string)?.split(',')[1];
                if (!base64 || !spaceNs) {
                  // Fallback: use data URL directly
                  callback(e.target?.result as string);
                  return;
                }
                try {
                  const res = await fetch('/api/spaces/' + spaceNs + '/files', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      filename: file.name,
                      data_base64: base64,
                      mime_type: file.type || 'application/octet-stream',
                    }),
                  });
                  const data = await res.json();
                  if (data.code === 0 && data.data?.id) {
                    callback('/api/files/' + data.data.id);
                    return;
                  }
                } catch (uploadErr) {
                  console.warn('Server upload failed, using base64:', uploadErr);
                }
                callback(e.target?.result as string);
              };
              reader.readAsDataURL(file);
            } catch (err) {
              console.warn('Upload failed:', err);
            }
          },
        });

        cherryRef.current = instance;
        if (mounted) setIsReady(true);
      } catch (e: any) {
        console.error('Cherry init error:', e);
        if (mounted) {
          setError(e?.message || 'Cherry editor load failed');
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (instance) {
        try { instance.destroy(); } catch {}
        cherryRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cherryRef.current && isReady) {
      const current = cherryRef.current.getMarkdown();
      if (current !== value) {
        cherryRef.current.setMarkdown(value, true);
      }
    }
  }, [value, isReady]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="cherry-editor-wrapper relative rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900" style={{ minHeight: minHeight || height }}>
      {!isReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 rounded-xl">
          <span className="text-sm text-gray-400">Loading editor...</span>
        </div>
      )}
      <div
        ref={containerRef}
        id={editorId}
        className="cherry-markdown"
        style={{
          minHeight: minHeight || (typeof height === 'number' ? height + 'px' : height),
        }}
      />
    </div>
  );
});

CherryEditorInner.displayName = 'CherryEditorInner';

const CherryEditorDynamic = dynamic(() => Promise.resolve(CherryEditorInner), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700" />
  ),
});

// Backward-compatible wrapper for current <CherryEditor value={body} onChange={setBody} />
function CherryEditorLegacyWrapper({
  value = '',
  onChange,
  height,
  minHeight,
  placeholder,
  defaultModel,
  spaceNs,
}: CherryEditorProps & { onChange?: ((value: string) => void) | ((markdown: string, html: string) => void) }) {
  const handleChange = (markdown: string, _html: string) => {
    if (onChange) {
      (onChange as (value: string) => void)(markdown);
    }
  };

  return (
    <CherryEditorDynamic
      value={value}
      onChange={handleChange}
      height={height}
      minHeight={minHeight}
      placeholder={placeholder}
      defaultModel={defaultModel}
      spaceNs={spaceNs}
    />
  );
}

export const CherryEditor = CherryEditorLegacyWrapper;
export const CherryEditorWithRef = React.forwardRef<CherryEditorRef, CherryEditorProps>(
  (props, ref) => <CherryEditorDynamic {...props} ref={ref} />
);
export default CherryEditorDynamic;
