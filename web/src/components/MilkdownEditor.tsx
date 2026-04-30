'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Eye, Edit3, Upload, FileText, Loader2, Moon, Sun } from 'lucide-react';

interface MilkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

// 轻量级 Markdown 预览渲染
function renderMarkdown(md: string): string {
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-5 mb-2 text-gray-900 dark:text-gray-100">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-2 text-gray-900 dark:text-gray-100">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3 text-gray-900 dark:text-gray-100">$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-700 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-600 hover:underline" target="_blank" rel="noopener">$1</a>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg max-w-full my-2" />')
    .replace(/^- (.+)$/gm, '<li class="text-gray-600 dark:text-gray-400 ml-5 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="text-gray-600 dark:text-gray-400 ml-5 list-decimal">$1</li>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-gray-900 dark:bg-gray-950 text-gray-100 rounded-lg p-4 my-3 overflow-x-auto text-sm"><code>$2</code></pre>')
    .replace(/^---$/gm, '<hr class="my-6 border-gray-200 dark:border-gray-700" />')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-primary-300 dark:border-primary-600 pl-4 py-1 my-2 text-gray-600 dark:text-gray-400 italic">$1</blockquote>')
    .replace(/\n\n/g, '</p><p class="text-gray-600 dark:text-gray-400 mb-2">')
    .replace(/\n/g, '<br />');
  return '<p class="text-gray-600 dark:text-gray-400 mb-2">' + html + '</p>';
}

export function MilkdownEditor({
  value,
  onChange,
  placeholder = '写下你的想法... 支持 Markdown 语法',
  minHeight = '400px',
}: MilkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<any>(null);
  const isInternalChange = useRef(false);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDark, setIsDark] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // 检测暗黑模式
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // 初始化 Milkdown 编辑器
  useEffect(() => {
    let mounted = true;
    let crepeInstance: any = null;

    const initEditor = async () => {
      if (!containerRef.current) return;

      try {
        const { Crepe } = await import('@milkdown/crepe');

        if (!mounted || !containerRef.current) return;

        crepeInstance = new Crepe({
          root: containerRef.current,
          defaultValue: value || '',
        });
        crepeRef.current = crepeInstance;

        await crepeInstance.create();

        // 监听 markdown 变化
        crepeInstance.on((listener: any) => {
          listener.markdownUpdated((_ctx: any, markdown: string) => {
            if (isInternalChange.current) {
              isInternalChange.current = false;
              return;
            }
            onChange(markdown);
          });
        });

        if (mounted) setLoading(false);
      } catch (err: any) {
        console.error('Milkdown init error:', err);
        if (mounted) {
          setError('编辑器加载失败，请刷新重试');
          setLoading(false);
        }
      }
    };

    // 小延迟确保 DOM 就绪
    const timer = setTimeout(initEditor, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (crepeInstance) {
        try { crepeInstance.destroy(); } catch {}
      }
    };
  }, [isDark]);

  // 外部 value 变化时同步到编辑器
  useEffect(() => {
    if (!crepeRef.current || loading) return;
    const crepe = crepeRef.current;
    const editor = crepe.editor;
    if (!editor) return;

    try {
      const currentMd = crepe.getMarkdown();
      if (currentMd !== value) {
        isInternalChange.current = true;
        editor.action((ctx: any) => {
          const { replaceAll } = ctx.get('milkdown/utils') || {};
          if (replaceAll) {
            ctx.set(replaceAll(value));
          }
        });
      }
    } catch (e) {
      // 同步失败时忽略
    }
  }, [value, loading]);

  // 处理 Markdown 文件上传
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown') && !file.name.endsWith('.txt')) {
      setError('仅支持 .md、.markdown、.txt 文件');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setUploading(true);
    try {
      const text = await file.text();
      const currentMd = crepeRef.current?.getMarkdown?.() || value || '';
      const newContent = currentMd ? currentMd + '\n\n' + text : text;
      onChange(newContent);
    } catch {
      setError('文件读取失败');
      setTimeout(() => setError(''), 3000);
    } finally {
      setUploading(false);
    }
  }, [value, onChange]);

  // 拖拽上传
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  // 错误降级：显示基本 textarea
  if (error && loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2">
          <FileText className="h-4 w-4 text-amber-500" />
          <span className="text-xs text-amber-600 dark:text-amber-400">{error}</span>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full resize-y border-0 p-4 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none bg-white dark:bg-gray-900 font-mono leading-relaxed"
          style={{ minHeight }}
        />
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 工具栏 */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1.5">
        {/* 左侧：文件上传 + 暗黑模式 */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="上传 Markdown 文件（.md）"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">导入 MD</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            onClick={() => {
              document.documentElement.classList.toggle('dark');
              setIsDark(!isDark);
            }}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title={isDark ? '切换亮色模式' : '切换暗黑模式'}
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* 中间提示 */}
        <div className="flex-1 text-center">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:inline">
            支持 Markdown · 拖拽 .md 文件上传 · 选中文字弹出菜单
          </span>
        </div>

        {/* 右侧预览切换 */}
        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
            preview
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {preview ? <Edit3 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{preview ? '编辑' : '预览'}</span>
        </button>
      </div>

      {/* 编辑器 / 预览 */}
      {loading ? (
        <div className="flex items-center justify-center py-12" style={{ minHeight }}>
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 text-primary-500 animate-spin" />
            <span className="text-sm text-gray-400 dark:text-gray-500">加载编辑器...</span>
          </div>
        </div>
      ) : preview ? (
        <div
          className="p-4 overflow-auto prose prose-sm dark:prose-invert max-w-none"
          style={{ minHeight }}
          dangerouslySetInnerHTML={{
            __html: value ? renderMarkdown(value) : '<p class="text-gray-400 dark:text-gray-500 italic">暂无内容</p>',
          }}
        />
      ) : (
        <div
          ref={containerRef}
          className="milkdown-editor-wrapper"
          style={{ minHeight }}
        />
      )}
    </div>
  );
}
