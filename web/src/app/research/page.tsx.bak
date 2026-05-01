import { Metadata } from 'next';
import { readFileSync } from 'fs';

export const metadata: Metadata = { title: 'AI 研究报告 - Polis' };

export default function ResearchPage() {
  let reportContent = '';
  let reportTime = '';
  let currentVer = '';

  try {
    const report = readFileSync('/root/polis/research-reports/latest-summary.md', 'utf-8');
    const lines = report.split('\n');
    reportContent = report;
    
    for (const line of lines) {
      if (line.includes('生成时间')) reportTime = line.replace('**生成时间**: ', '').trim();
      if (line.includes('当前版本')) currentVer = line.replace('**当前版本**: ', '').trim();
    }
  } catch (e) {
    reportContent = '# 暂无研究报告\n\n研究报告将在每小时整点自动生成。';
  }

  const sections = reportContent.split('## ').filter(s => s.trim());

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI 研究报告</h1>
          <p className="text-sm text-gray-500 mt-1">
            {reportTime ? `更新时间: ${reportTime}` : '每小时自动更新'}
            {currentVer ? ` | ${currentVer}` : ''}
          </p>
        </div>
        <a href="/changelog" className="text-sm text-primary-600 hover:text-primary-700">
          ← 查看更新日志
        </a>
      </div>

      <div className="space-y-6">
        {sections.map((section, idx) => {
          const lines = section.split('\n');
          const title = lines[0].trim();
          const body = lines.slice(1).join('\n').trim();
          if (!title) return null;

          const sectionColors: Record<string, string> = {
            '🔥': 'from-orange-50 to-red-50 border-orange-200',
            '📱': 'from-blue-50 to-indigo-50 border-blue-200',
            '💡': 'from-green-50 to-emerald-50 border-green-200',
            '🏥': 'from-purple-50 to-violet-50 border-purple-200',
            '🎯': 'from-primary-50 to-blue-50 border-primary-200',
          };

          const emoji = title.charAt(0);
          const bgColor = sectionColors[emoji] || 'from-gray-50 to-gray-50 border-gray-200';

          return (
            <div key={idx} className={`rounded-xl border bg-gradient-to-br ${bgColor} p-6`}>
              <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
              <div className="text-sm text-gray-700 leading-relaxed space-y-1">
                {body.split('\n').map((line, i) => {
                  if (line.startsWith('### ')) {
                    return <h3 key={i} className="font-semibold text-gray-800 mt-3 mb-2">{line.replace('### ', '')}</h3>;
                  }
                  if (line.startsWith('- **[')) {
                    const match = line.match(/- \*\*\[(.+?)\]\((.+?)\)\*\*(.+)/);
                    if (match) {
                      return <div key={i} className="flex items-start gap-2 py-0.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                        <span><a href={match[2]} target="_blank" className="font-medium text-primary-600 hover:text-primary-800">{match[1]}</a>{match[3]}</span>
                      </div>;
                    }
                  }
                  if (line.startsWith('- [')) {
                    const match = line.match(/- \[(.+?)\]\((.+?)\)/);
                    if (match) {
                      return <div key={i} className="flex items-start gap-2 py-0.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                        <span><a href={match[2]} target="_blank" className="text-primary-600 hover:text-primary-800">{match[1]}</a></span>
                      </div>;
                    }
                  }
                  if (line.startsWith('- **')) {
                    const clean = line.replace(/\*\*/g, '');
                    return <div key={i} className="flex items-start gap-2 py-0.5">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                      <span>{clean}</span>
                    </div>;
                  }
                  if (/^[1-5]\./.test(line)) {
                    return <div key={i} className="flex items-start gap-2 py-0.5">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                      <span>{line.replace(/^\d+\.\s*/, '')}</span>
                    </div>;
                  }
                  if (line.startsWith('> ')) {
                    return <p key={i} className="text-gray-500 italic ml-4">{line.replace('> ', '')}</p>;
                  }
                  if (line.startsWith('---')) {
                    return <hr key={i} className="my-4 border-gray-300" />;
                  }
                  if (line.trim() === '') {
                    return <div key={i} className="h-1" />;
                  }
                  return <div key={i} className="py-0.5">{line}</div>;
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center text-xs text-gray-400">
        <p>🤖 由 Polis AI 自动研究系统每小时生成</p>
        <p className="mt-1">数据来源: GitHub Trending, GitHub Blog, Rust Blog, GitHub API</p>
      </div>
    </div>
  );
}
