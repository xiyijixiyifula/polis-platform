'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Eye, Edit3, Upload, FileText, Loader2, Moon, Sun, Code2, Type } from 'lucide-react';
import { marked } from 'marked';
import TurndownService from 'turndown';

// ===== marked 配置 =====
marked.setOptions({
  breaks: true,
  gfm: true,
});

// ===== turndown 实例 (模块级单例) =====
let _turndown: TurndownService | null = null;
function getTurndown(): TurndownService {
  if (!_turndown) {
    _turndown = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
    });
  }
  return _turndown;
}

// ===== 工具函数 =====
function sanitizeHtml(html: string): string {
  if (typeof document === 'undefined') return html;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, iframe, object, embed').forEach((el) => el.remove());
    doc.querySelectorAll('*').forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
      });
    });
    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

function mdToHtml(md: string): string {
  if (!md) return '';
  try {
    const raw = marked.parse(md) as string;
    return sanitizeHtml(raw);
  } catch {
    return md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

function htmlToMd(html: string): string {
  try {
    const td = getTurndown();
    return td.turndown(html);
  } catch {
    // 降级：返回纯文本
    return html.replace(/<[^>]*>/g, '');
  }
}

// ===== Props =====
interface MilkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

type EditorMode = 'wysiwyg' | 'raw' | 'preview';

// ===== 组件 =====
export function MilkdownEditor({
  value,
  onChange,
  placeholder = '写下你的想法... 支持 Markdown 语法',
  minHeight = '400px',
}: MilkdownEditorProps) {
  const [mode, setMode] = useState<EditorMode>('wysiwyg');
  const [isDark, setIsDark] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [turndownError, setTurndownError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const wysiwygRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInternalChange = useRef(false);

  // 初始化 turndown
  useEffect(() => {
    try {
      getTurndown(); // 测试初始化
    } catch {
      setTurndownError(true);
    }
  }, []);

  // 检测暗黑模式
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // 切换到 WYSIWYG 模式时，将 markdown 渲染为 HTML 填充编辑器
  useEffect(() => {
    if (mode === 'wysiwyg' && wysiwygRef.current) {
      const html = mdToHtml(value);
      wysiwygRef.current.innerHTML = html;
    }
  }, [mode]); // 仅在模式切换时触发

  // 外部 value 变化时同步到 WYSIWYG（仅非内部变更时）
  useEffect(() => {
    if (mode !== 'wysiwyg' || !wysiwygRef.current) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    // 获取当前编辑器内容对应的 markdown，避免不必要的 DOM 更新
    const currentHtml = wysiwygRef.current.innerHTML;
    const currentMd = htmlToMd(currentHtml).trim();
    if (currentMd === value.trim()) return; // 内容相同，跳过

    const html = mdToHtml(value);
    wysiwygRef.current.innerHTML = html;
  }, [value, mode]);

  // 自动调整 textarea 高度
  useEffect(() => {
    if (mode === 'raw' && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value, mode]);

  // ===== 事件处理 =====

  // WYSIWYG 输入
  const handleWysiwygInput = useCallback(() => {
    if (!wysiwygRef.current) return;
    const html = wysiwygRef.current.innerHTML;

    // 空编辑器：发送空字符串
    if (!html || html === '<br>' || html === '<br/>' || html === '\n' || html === '<br>\n') {
      isInternalChange.current = true;
      onChange('');
      return;
    }

    const md = htmlToMd(html);
    isInternalChange.current = true;
    onChange(md);
  }, [onChange]);

  // WYSIWYG 粘贴：去除富文本格式，粘贴纯文本
  const handleWysiwygPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    // 将换行转为 <br>，插入光标位置
    const html = text.replace(/\n/g, '<br>');
    document.execCommand('insertHTML', false, html);
  }, []);

  // 文件上传
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown') && !file.name.endsWith('.txt')) {
      setError('仅支持 .md、.markdown、.txt 文件');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setUploading(true);
    try {
      const text = await file.text();
      const newContent = value ? value + '\n\n' + text : text;
      onChange(newContent);
    } catch {
      setError('文件读取失败');
      setTimeout(() => setError(''), 3000);
    } finally {
      setUploading(false);
    }
  }, [value, onChange]);

  // 拖拽
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

  // Markdown 源码模式下，在光标处插入文本
  const insertAtCursor = useCallback((before: string, after: string = '') => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.substring(start, end);
    const newText = value.substring(0, start) + before + selected + after + value.substring(end);
    onChange(newText);
    // 恢复光标位置
    requestAnimationFrame(() => {
      ta.focus();
      if (selected) {
        ta.setSelectionRange(start + before.length, start + before.length + selected.length);
      } else {
        ta.setSelectionRange(start + before.length, start + before.length);
      }
    });
  }, [value, onChange]);

  // Markdown 工具栏按钮
  const mdToolbar = mode === 'raw' && (
    <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
      {[
        { label: 'B', title: '粗体 (Ctrl+B)', action: () => insertAtCursor('**', '**') },
        { label: 'I', title: '斜体 (Ctrl+I)', action: () => insertAtCursor('*', '*') },
        { label: 'H2', title: '二级标题', action: () => insertAtCursor('## ') },
        { label: 'H3', title: '三级标题', action: () => insertAtCursor('### ') },
        { label: '🔗', title: '链接', action: () => insertAtCursor('[', '](url)') },
        { label: '`', title: '行内代码', action: () => insertAtCursor('`', '`') },
        { label: '```', title: '代码块', action: () => insertAtCursor('```\n', '\n```') },
        { label: '•', title: '无序列表', action: () => insertAtCursor('- ') },
        { label: '1.', title: '有序列表', action: () => insertAtCursor('1. ') },
        { label: '❝', title: '引用', action: () => insertAtCursor('> ') },
        { label: '—', title: '分割线', action: () => insertAtCursor('\n---\n') },
      ].map((btn) => (
        <button
          key={btn.title}
          type="button"
          onClick={btn.action}
          title={btn.title}
          className="px-1.5 py-0.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors font-mono"
        >
          {btn.label}
        </button>
      ))}
    </div>
  );

  // ===== 渲染 =====

  // turndown 加载失败时，回退到纯 Markdown 编辑器
  if (turndownError) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2">
          <FileText className="h-4 w-4 text-amber-500" />
          <span className="text-xs text-amber-600 dark:text-amber-400">富文本引擎加载失败，使用纯 Markdown 编辑模式</span>
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
      {/* ===== 工具栏 ===== */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1.5">
        {/* 左侧：模式切换 */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setMode('wysiwyg')}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
              mode === 'wysiwyg'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="所见即所得编辑"
          >
            <Type className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">富文本</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('raw')}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
              mode === 'raw'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Markdown 源码编辑"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">源码</span>
          </button>
        </div>

        {/* 中间：上传 + 暗黑模式 */}
        <div className="flex items-center gap-0.5 ml-1">
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

        {/* 右侧填充 + 提示 + 预览按钮 */}
        <div className="flex-1 text-center">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:inline">
            支持 Markdown · 拖拽 .md 文件 · {mode === 'raw' ? '工具栏快速插入' : '实时渲染'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMode(mode === 'preview' ? (turndownError ? 'raw' : 'wysiwyg') : 'preview')}
          className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
            mode === 'preview'
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          title={mode === 'preview' ? '返回编辑' : '预览渲染效果'}
        >
          {mode === 'preview' ? <Edit3 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{mode === 'preview' ? '返回编辑' : '预览'}</span>
        </button>
      </div>

      {/* ===== 错误提示 ===== */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
          <FileText className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs text-amber-600 dark:text-amber-400">{error}</span>
        </div>
      )}

      {/* ===== WYSIWYG 模式 ===== */}
      {mode === 'wysiwyg' && (
        <div
          ref={wysiwygRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleWysiwygInput}
          onPaste={handleWysiwygPaste}
          className="wysiwyg-editor p-4 focus:outline-none"
          style={{ minHeight }}
          data-placeholder={placeholder}
        />
      )}

      {/* ===== Markdown 源码模式 ===== */}
      {mode === 'raw' && (
        <div className="flex flex-col">
          {mdToolbar}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full resize-y border-0 p-4 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none bg-white dark:bg-gray-900 font-mono leading-relaxed"
            style={{ minHeight }}
            onKeyDown={(e) => {
              // Tab 键插入缩进
              if (e.key === 'Tab') {
                e.preventDefault();
                insertAtCursor('  ');
              }
            }}
          />
        </div>
      )}

      {/* ===== 预览模式 ===== */}
      {mode === 'preview' && (
        <div
          className="p-4 overflow-auto preview-content"
          style={{ minHeight }}
          dangerouslySetInnerHTML={{
            __html: value ? mdToHtml(value) : '<p class="text-gray-400 dark:text-gray-500 italic">暂无内容</p>',
          }}
        />
      )}
    </div>
  );
}
