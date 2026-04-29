'use client';

import { useState, useRef } from 'react';
import { Bold, Italic, Heading1, Heading2, Code, List, Link as LinkIcon, Image, Eye, Edit3 } from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

// 轻量级 Markdown 渲染（客户端）
function renderMarkdown(md: string): string {
  let html = md
    // 转义 HTML
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // 标题
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-5 mb-2 text-gray-900">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-2 text-gray-900">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3 text-gray-900">$1</h1>')
    // 粗体 + 斜体
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-primary-600 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-600 hover:underline" target="_blank">$1</a>')
    // 图片
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg max-w-full my-2" />')
    // 无序列表
    .replace(/^- (.+)$/gm, '<li class="text-gray-600 ml-5 list-disc">$1</li>')
    // 有序列表
    .replace(/^\d+\. (.+)$/gm, '<li class="text-gray-600 ml-5 list-decimal">$1</li>')
    // 代码块
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-gray-900 text-gray-100 rounded-lg p-4 my-3 overflow-x-auto text-sm"><code>$2</code></pre>')
    // 分割线
    .replace(/^---$/gm, '<hr class="my-6 border-gray-200" />')
    // 引用
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-primary-300 pl-4 py-1 my-2 text-gray-600 italic">$1</blockquote>')
    // 段落
    .replace(/\n\n/g, '</p><p class="text-gray-600 mb-2">')
    .replace(/\n/g, '<br />');

  return '<p class="text-gray-600 mb-2">' + html + '</p>';
}

// 工具栏按钮
type ToolAction = 'bold' | 'italic' | 'h1' | 'h2' | 'code' | 'list' | 'link' | 'image' | 'codeblock';

const tools: { action: ToolAction; icon: React.ReactNode; label: string; wrap: [string, string] }[] = [
  { action: 'bold', icon: <Bold className="h-4 w-4" />, label: '粗体', wrap: ['**', '**'] },
  { action: 'italic', icon: <Italic className="h-4 w-4" />, label: '斜体', wrap: ['*', '*'] },
  { action: 'h1', icon: <Heading1 className="h-4 w-4" />, label: '标题1', wrap: ['# ', ''] },
  { action: 'h2', icon: <Heading2 className="h-4 w-4" />, label: '标题2', wrap: ['## ', ''] },
  { action: 'code', icon: <Code className="h-4 w-4" />, label: '行内代码', wrap: ['`', '`'] },
  { action: 'codeblock', icon: <Code className="h-4 w-4" />, label: '代码块', wrap: ['```\n', '\n```'] },
  { action: 'list', icon: <List className="h-4 w-4" />, label: '列表', wrap: ['- ', ''] },
  { action: 'link', icon: <LinkIcon className="h-4 w-4" />, label: '链接', wrap: ['[', '](url)'] },
  { action: 'image', icon: <Image className="h-4 w-4" />, label: '图片', wrap: ['![', '](url)'] },
];

export function MarkdownEditor({ value, onChange, placeholder = '写下你的想法... (支持 Markdown)', minHeight = '300px' }: MarkdownEditorProps) {
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertWrap = (wrap: [string, string]) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.substring(start, end);
    const before = value.substring(0, start);
    const after = value.substring(end);
    const newText = before + wrap[0] + selected + wrap[1] + after;
    onChange(newText);
    // 恢复光标位置
    setTimeout(() => {
      ta.focus();
      const pos = start + wrap[0].length + selected.length + wrap[1].length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-3 py-1.5 flex-wrap">
        {tools.map((tool) => (
          <button key={tool.action} type="button" onClick={() => insertWrap(tool.wrap)}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
            title={tool.label}>
            {tool.icon}
          </button>
        ))}
        <div className="flex-1" />
        <button type="button" onClick={() => setPreview(!preview)}
          className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
            preview ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-200'
          }`}>
          {preview ? <Edit3 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {preview ? '编辑' : '预览'}
        </button>
      </div>

      {/* Editor / Preview */}
      {preview ? (
        <div className="p-4 overflow-auto prose prose-sm max-w-none" style={{ minHeight }}
          dangerouslySetInnerHTML={{ __html: value ? renderMarkdown(value) : '<p class="text-gray-400 italic">暂无内容</p>' }} />
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full resize-y border-0 p-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none font-mono leading-relaxed"
          style={{ minHeight, fontFamily: "'JetBrains Mono', 'SF Mono', monospace" }}
        />
      )}
    </div>
  );
}
