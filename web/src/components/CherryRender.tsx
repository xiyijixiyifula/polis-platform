'use client';

import { useEffect, useState, useRef } from 'react';
import DOMPurify from 'dompurify';

// ── Simple fallback renderer (used while Cherry loads or on error) ──
function fallbackRender(md: string): string {
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_: string, lang: string, code: string) =>
      '<pre class="cherry-code-block" data-lang="' + (lang || 'text') + '"><code>' + code.trim() + '</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="cherry-inline-code">$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr />')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br />');
  return '<p>' + html + '</p>';
}

// ── Eager module-level preload ──
const engineImport = import('cherry-markdown/dist/cherry-markdown.engine.core.esm.js');

// ── Cached engine singleton ──
let engineCache: any = null;
let enginePromise: Promise<any> | null = null;

async function getEngine() {
  if (engineCache) return engineCache;
  if (enginePromise) return enginePromise;

  enginePromise = (async () => {
    const mod = await engineImport;
    const CherryEngine = mod.default;
    engineCache = new CherryEngine({
      engine: {
        global: { classicBr: false },
        syntax: {
          header: { anchorStyle: 'none' },
          codeBlock: {
            lineNumber: true,
            copyCode: true,
            wrap: false,
            indentedCodeBlock: false,
          },
          table: { enableChart: false },
          link: { target: '_blank', rel: 'nofollow noopener noreferrer' },
          autoLink: { target: '_blank', rel: 'nofollow noopener noreferrer' },
        },
      },
    });
    return engineCache;
  })().catch((err: unknown) => {
    enginePromise = null;
    throw err;
  });

  return enginePromise;
}

export function cherryMakeHtml(md: string): string {
  if (engineCache) {
    try {
      return engineCache.makeHtml(md);
    } catch {
      return fallbackRender(md);
    }
  }
  return fallbackRender(md);
}

interface CherryRenderProps {
  markdown: string;
  className?: string;
}

export function CherryRender({ markdown, className = '' }: CherryRenderProps) {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const lastMdRef = useRef('');

  useEffect(() => {
    let mounted = true;

    async function render() {
      try {
        const engine = await getEngine();
        if (!mounted) return;

        try {
          const result = engine.makeHtml(markdown);
          if (mounted) {
            setHtml(result);
            lastMdRef.current = markdown;
          }
        } catch (renderErr) {
          console.warn('Cherry engine render failed, using fallback:', renderErr);
          if (mounted) setHtml(fallbackRender(markdown));
        }
      } catch (loadErr) {
        console.warn('Cherry engine failed to load, using fallback:', loadErr);
        if (mounted) setHtml(fallbackRender(markdown));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (markdown !== lastMdRef.current) {
      render();
    } else {
      setLoading(false);
    }

    return () => { mounted = false; };
  }, [markdown]);

  if (loading) {
    return (
      <div className={'cherry-preview-loading ' + className}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!html) {
    return <div className={'text-gray-400 italic text-sm py-4 ' + className}>📄 暂无内容</div>;
  }

  return (
    <div
      className={'cherry cherry-markdown cherry-render-root ' + className}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
}

export default CherryRender;
