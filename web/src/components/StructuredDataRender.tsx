'use client';

import React from 'react';

interface Props {
  content_type: string;
  body: string; // JSON string or Markdown
}

/** 结构化数据渲染组件 — 支持 json_data, table_data, yaml_data */
export function StructuredDataRender({ content_type, body }: Props) {
  if (content_type === 'json_data') {
    return <JsonDataView body={body} />;
  }
  if (content_type === 'table_data') {
    return <TableDataView body={body} />;
  }
  return null;
}

/** JSON 数据视图 */
function JsonDataView({ body }: { body: string }) {
  let parsed: any;
  try {
    parsed = JSON.parse(body);
  } catch {
    return <pre className="text-sm text-red-500 p-4">⚠️ 无法解析的 JSON 数据</pre>;
  }

  return (
    <div className="my-4 rounded-2xl border border-indigo-200/60 dark:border-indigo-700/30 overflow-hidden">
      <div className="bg-indigo-50/60 dark:bg-indigo-900/20 px-4 py-2 border-b border-indigo-100 dark:border-indigo-800/30 flex items-center gap-2">
        <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">📦 JSON DATA</span>
        {parsed.schema && (
          <span className="text-xs text-indigo-400 dark:text-indigo-500 font-mono">
            schema: {parsed.schema}
          </span>
        )}
      </div>
      <div className="p-4 bg-white/50 dark:bg-gray-900/30">
        <pre className="text-sm font-mono text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      </div>
    </div>
  );
}

/** 表格数据视图 — 支持 CSV/TSV/JSON-table */
function TableDataView({ body }: { body: string }) {
  interface Row {
    [key: string]: string;
  }

  let rows: Row[] = [];
  let headers: string[] = [];
  let format: string = '';

  try {
    // Try JSON table format first: [{...}, {...}]
    const parsed = JSON.parse(body);
    if (Array.isArray(parsed) && parsed.length > 0) {
      format = 'json';
      rows = parsed;
      headers = Object.keys(parsed[0]);
    } else if (parsed.headers && parsed.rows) {
      format = 'json';
      headers = parsed.headers;
      rows = parsed.rows.map((r: any) => {
        const obj: Row = {};
        headers.forEach((h: string, i: number) => { obj[h] = String(r[i] ?? ''); });
        return obj;
      });
    }
  } catch {
    // Try CSV/TSV format
    const lines = body.trim().split('\n');
    if (lines.length > 0) {
      const delimiter = body.includes('\t') ? '\t' : ',';
      format = delimiter === '\t' ? 'tsv' : 'csv';
      headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
      rows = lines.slice(1).map(line => {
        const vals = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
        const obj: Row = {};
        headers.forEach((h: string, i: number) => { obj[h] = vals[i] ?? ''; });
        return obj;
      });
    }
  }

  if (headers.length === 0 || rows.length === 0) {
    return <pre className="text-sm text-gray-400 p-4">📋 无表格数据</pre>;
  }

  return (
    <div className="my-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-700/30 overflow-hidden">
      <div className="bg-emerald-50/60 dark:bg-emerald-900/20 px-4 py-2 border-b border-emerald-100 dark:border-emerald-800/30 flex items-center gap-2">
        <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
          📊 TABLE DATA
        </span>
        <span className="text-xs text-emerald-400 dark:text-emerald-500 font-mono">
          {format.toUpperCase()} · {rows.length} 行 × {headers.length} 列
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              {headers.map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map((row, i) => (
              <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 border-b border-gray-50 dark:border-gray-800 last:border-b-0">
                {headers.map((h) => (
                  <td key={h} className="px-3 py-1.5 text-gray-700 dark:text-gray-300 font-mono text-xs whitespace-nowrap max-w-[300px] truncate">
                    {row[h] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 100 && (
          <div className="px-4 py-2 text-xs text-gray-400 text-center bg-gray-50 dark:bg-gray-800/30">
            ... 还有 {rows.length - 100} 行未显示
          </div>
        )}
      </div>
    </div>
  );
}
