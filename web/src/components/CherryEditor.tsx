'use client';

import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
  useId,
  useCallback,
} from 'react';
import dynamic from 'next/dynamic';

// ─── Types ───────────────────────────────────────────────
type EditorModel = 'editOnly' | 'edit&preview' | 'previewOnly';
export type SwitchModel = EditorModel;

export interface CherryEditorRef {
  getMarkdown: () => string;
  getHtml: () => string;
  setMarkdown: (val: string) => void;
  switchModel: (model: EditorModel) => void;
  insert: (text: string, isSelect?: boolean, anchor?: [number, number], focus?: [number, number]) => void;
}

interface CherryEditorProps {
  spaceNs?: string;
  value?: string;
  onChange?: (markdown: string, html: string) => void;
  height?: number | string;
  minHeight?: string;
  placeholder?: string;
  defaultModel?: EditorModel;
  autoSaveKey?: string;
  onAutoSave?: (markdown: string) => void;
}

// ─── Inner Component ─────────────────────────────────────
const CherryEditorInner = forwardRef<CherryEditorRef, CherryEditorProps>(
  (
    {
      value = '',
      onChange,
      height = 600,
      minHeight = '450px',
      defaultModel = 'edit&preview',
      spaceNs,
      autoSaveKey,
      onAutoSave,
    },
    ref
  ) => {
    const cherryRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const editorId = useId().replace(/:/g, '');
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState('');
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── Imperative API ────────────────────────────────
    useImperativeHandle(ref, () => ({
      getMarkdown: () => cherryRef.current?.getMarkdown() || '',
      getHtml: () => cherryRef.current?.getHtml() || '',
      setMarkdown: (val: string) => {
        cherryRef.current?.setMarkdown(val, true);
      },
      switchModel: (model: EditorModel) => {
        cherryRef.current?.switchModel(model);
      },
      insert: (text: string, isSelect = false, anchor, focus) => {
        cherryRef.current?.insert(text, isSelect, anchor, focus);
      },
    }));

    // ─── File Upload Handler ───────────────────────────
    const handleFileUpload = useCallback(
      async (file: File, callback: (url: string) => void) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = (e.target?.result as string)?.split(',')[1];
          if (!base64) return;

          try {
            const token = localStorage.getItem('polis_access_token');
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
            };
            if (token) headers['Authorization'] = 'Bearer ' + token;

            const endpoints = spaceNs
              ? [`/api/spaces/${spaceNs}/files`, '/api/upload']
              : ['/api/upload'];

            for (const endpoint of endpoints) {
              try {
                const res = await fetch(endpoint, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({
                    filename: file.name,
                    data_base64: base64,
                    mime_type: file.type || 'application/octet-stream',
                  }),
                });
                const data = await res.json();
                if (data.code === 0 && data.data?.id) {
                  const url =
                    data.data.url || `/api/files/${data.data.id}`;
                  callback(url);
                  return;
                }
              } catch {
                // try next endpoint
              }
            }

            // Fallback: inline data URL for small files (< 100KB)
            if (base64.length < 136000) {
              callback(e.target?.result as string);
            } else {
              console.error('Upload failed: file too large for inline embed');
              setError('文件上传失败：文件过大，请压缩后重试');
              setTimeout(() => setError(''), 5000);
            }
          } catch (err) {
            console.warn('Upload error:', err);
            setError('文件上传失败，请重试');
            setTimeout(() => setError(''), 5000);
          }
        };
        reader.readAsDataURL(file);
      },
      [spaceNs]
    );

    // ─── Auto Save ─────────────────────────────────────
    const triggerAutoSave = useCallback(
      (markdown: string) => {
        if (!autoSaveKey && !onAutoSave) return;
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
          if (autoSaveKey) {
            localStorage.setItem(autoSaveKey, markdown);
            localStorage.setItem(
              `${autoSaveKey}_time`,
              new Date().toISOString()
            );
          }
          onAutoSave?.(markdown);
        }, 3000);
      },
      [autoSaveKey, onAutoSave]
    );

    // ─── Cherry Init ───────────────────────────────────
    useEffect(() => {
      let instance: any;
      let mounted = true;

      const init = async () => {
        try {
          const [{ default: Cherry }] = await Promise.all([
            import('cherry-markdown'),
          ]);

          if (!mounted || !containerRef.current) return;

          const computedHeight =
            typeof height === 'number' ? `${height}px` : height;

          instance = new Cherry({
            id: editorId,
            value,

            // ── Editor ──────────────────────────────
            editor: {
              defaultModel,
              height: computedHeight,
              
              codemirror: {
                autofocus: false,
                lineWrapping: true,
                viewportMargin: Infinity,
                indentWithTabs: false,
                tabSize: 2,
              },
            },

            // ── Toolbars (核心优化：丰富工具栏) ───────
            toolbars: {
              theme: 'dark',
              showToolbar: true,

              toolbar: [
                'header',
                'list',
                {
                  insert: [
                    'checklist',
                    'table',
                    'code',
                    'link',
                    'hr',
                    'br',
                    'formula',
                  ],
                },
                'graph',
                '|',
                'bold',
                'italic',
                'strikethrough',
                {
                  color: ['color', 'bg'],
                },
                'ruby',
                '|',
                'image',
                'audio',
                'video',
                'pdf',
                'word',
                '|',
                'toc',
                'detail',
                '|',
                'undo',
                'redo',
                '|',
                'switchModel',
                'settings',
              ],

              toolbarRight: ['fullScreen', 'export'],

              bubble: [
                'bold',
                'italic',
                'underline',
                'strikethrough',
                'sub',
                'sup',
                'ruby',
                '|',
                'color',
                'header',
                '|',
                'list',
                'todo',
              ],

              float: [
                'h1',
                'h2',
                'h3',
                '|',
                'checklist',
                'quote',
                'quickTable',
                'code',
                'image',
              ],

              shortcutKey: {
                bold: { shortcutKey: 'Ctrl-B' },
                italic: { shortcutKey: 'Ctrl-I' },
                header: { shortcutKey: 'Ctrl-Shift-H' },
                strikethrough: { shortcutKey: 'Ctrl-Shift-S' },
                code: { shortcutKey: 'Ctrl-Shift-C' },
                list: { shortcutKey: 'Ctrl-Shift-L' },
                link: { shortcutKey: 'Ctrl-Shift-I' },
                undo: { shortcutKey: 'Ctrl-Z' },
                redo: { shortcutKey: 'Ctrl-Y' },
                table: { shortcutKey: 'Ctrl-Alt-T' },
                image: { shortcutKey: 'Ctrl-Shift-U' },
              },
            },

            // ── Engine ──────────────────────────────
            engine: {
              global: {
                flowSessionContext: true,
              },
              syntax: {
                header: {
                  anchorStyle: 'autonumber',
                },
                list: {
                  listNested: true,
                  indentSpace: 2,
                },
                codeBlock: {
                  wrap: true,
                  lineNumber: true,
                  copyCode: true,
                  editCode: true,
                },
                table: {
                  enableChart: true,
                },
                fontEmphasis: {
                  allowWhitespace: true,
                },
                link: {
                },
              },
            },

            // ── Previewer ───────────────────────────
            previewer: {
              floatWhenClosePreviewer: true,
              enablePreviewerBubble: true,
            },

            // ── Keydown Listener ────────────────────

            // ── Callbacks ───────────────────────────
            callback: {
              afterChange: (text: string, html: string) => {
                onChange?.(text, html);
                triggerAutoSave(text);
              },
              onClickPreview: (e: Event) => {}
            },

            // ── File Upload ─────────────────────────
            fileUpload: handleFileUpload,

            // ── Extensions ──────────────────────────
            externals: {},

            // ── Theme ───────────────────────────────
            // Theme settings removed for compatibility
          });

          cherryRef.current = instance;

          // 监听系统主题变化
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const handleThemeChange = (e: MediaQueryListEvent) => {
            const theme = e.matches ? 'dark' : 'default';
            instance.setTheme(theme);
          };
          mediaQuery.addEventListener('change', handleThemeChange);

          // 初始设置主题
          const isDark = document.documentElement.classList.contains('dark');
          if (isDark) {
            instance.setTheme('dark');
          }

          if (mounted) setIsReady(true);

          return () => {
            mediaQuery.removeEventListener('change', handleThemeChange);
          };
        } catch (e: any) {
          console.error('Cherry init error:', e);
          if (mounted) {
            setError(e?.message || '编辑器加载失败，请刷新页面重试');
          }
        }
      };

      init();

      return () => {
        mounted = false;
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        if (instance) {
          try {
            instance.destroy();
          } catch {}
          cherryRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Sync external value ───────────────────────────
    useEffect(() => {
      if (cherryRef.current && isReady) {
        const current = cherryRef.current.getMarkdown();
        if (current !== value) {
          cherryRef.current.setMarkdown(value, true);
        }
      }
    }, [value, isReady]);

    // ─── Restore draft on mount ────────────────────────
    useEffect(() => {
      if (autoSaveKey && isReady && !value) {
        const saved = localStorage.getItem(autoSaveKey);
        if (saved) {
          cherryRef.current?.setMarkdown(saved, true);
        }
      }
    }, [autoSaveKey, isReady, value]);

    // ─── Error UI ──────────────────────────────────────
    if (error) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      );
    }

    // ─── Render ────────────────────────────────────────
    return (
      <div
        className="cherry-editor-wrapper relative rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900 transition-all duration-200 focus-within:ring-2 focus-within:ring-primary-200 dark:focus-within:ring-primary-900"
        style={{ minHeight: minHeight || height }}
      >
        {!isReady && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/90 dark:bg-gray-900/90 rounded-xl backdrop-blur-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            <span className="text-sm text-gray-400 dark:text-gray-500">
              编辑器加载中...
            </span>
          </div>
        )}
        <div
          ref={containerRef}
          id={editorId}
          className="cherry-markdown"
          style={{
            minHeight: minHeight || (typeof height === 'number' ? `${height}px` : height),
          }}
        />
      </div>
    );
  }
);

CherryEditorInner.displayName = 'CherryEditorInner';

// ─── Dynamic Wrapper ─────────────────────────────────────
const CherryEditorDynamic = dynamic(() => Promise.resolve(CherryEditorInner), {
  ssr: false,
  loading: () => (
    <div className="h-[450px] animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <span className="text-sm text-gray-400 dark:text-gray-500">
          编辑器加载中...
        </span>
      </div>
    </div>
  ),
});

// ─── Legacy-compatible wrapper ─────────────────────────
function CherryEditorLegacyWrapper({
  value = '',
  onChange,
  height,
  minHeight,
  placeholder,
  defaultModel,
  spaceNs,
  autoSaveKey,
  onAutoSave,
}: CherryEditorProps & {
  onChange?: ((value: string) => void) | ((markdown: string, html: string) => void);
}) {
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
      autoSaveKey={autoSaveKey}
      onAutoSave={onAutoSave}
    />
  );
}

export const CherryEditor = CherryEditorLegacyWrapper;
export const CherryEditorWithRef = React.forwardRef<CherryEditorRef, CherryEditorProps>(
  (props, ref) => <CherryEditorDynamic {...props} ref={ref} />
);
CherryEditorWithRef.displayName = 'CherryEditorWithRef';

export default CherryEditorDynamic;
