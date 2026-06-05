import { getToken } from '@/lib/api';
'use client';

import { useState } from 'react';
import { File, Folder, Download, Link2, Copy, Lock, Clock } from 'lucide-react';

interface FileItem {
  id: string; filename: string; file_size: number; mime_type: string;
  download_count: number; created_at: string; is_folder?: boolean;
}

export function FileShare({ spaceId }: { spaceId: string }) {
  const [files] = useState<FileItem[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareResult, setShareResult] = useState<any>(null);

  const formatSize = (bytes: number) => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  };

  const handleShare = async (fileId: string) => {
    try {
      const token = getToken();
      const res = await fetch('/api/files/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ file_id: fileId, expires_hours: 168 }),
      });
      if (!res.ok) {
        alert('服务器错误，请稍后重试');
        return;
      }
      const data = await res.json();
      if (data.code === 0) {
        setShareResult(data.data);
        setShowShareModal(true);
      } else {
        alert(data.message || '生成分享链接失败');
      }
    } catch {
      alert('网络错误，请稍后重试');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <input type="file" className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
        <button className="btn-primary text-xs px-4 py-2">上传文件</button>
      </div>

      {files.length === 0 ? (
        <div className="card py-12 text-center">
          <Folder className="h-10 w-10 mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">暂无文件</p>
          <p className="text-xs text-gray-400 mt-1">上传文件后可生成分享链接，支持密码保护和过期时间</p>
        </div>
      ) : (
        <div className="space-y-1">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors">
              <File className="h-8 w-8 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{f.filename}</p>
                <p className="text-xs text-gray-400">{formatSize(f.file_size)} · {f.download_count} 次下载</p>
              </div>
              <button onClick={() => handleShare(f.id)} className="btn-secondary text-xs px-3 py-1.5 gap-1">
                <Link2 className="h-3 w-3" /> 分享
              </button>
              <button className="btn-secondary text-xs px-3 py-1.5">
                <Download className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Share Result Modal */}
      {showShareModal && shareResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-4">分享文件</h3>
            <div className="space-y-3">
              <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">分享链接已生成</span>
                </div>
                <div className="flex items-center gap-2">
                  <input readOnly value={`${window.location.origin}/share/${shareResult.code}`}
                    className="flex-1 text-xs bg-white border border-green-200 rounded px-2 py-1.5" />
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/share/${shareResult.code}`); }}
                    className="btn-secondary text-xs px-2 py-1.5"><Copy className="h-3 w-3" /></button>
                </div>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                {shareResult.password && <p className="flex items-center gap-1"><Lock className="h-3 w-3" /> 提取码：<strong>{shareResult.password}</strong></p>}
                {shareResult.expires_at && <p className="flex items-center gap-1"><Clock className="h-3 w-3" /> 过期时间：{new Date(shareResult.expires_at).toLocaleString('zh-CN')}</p>}
              </div>
            </div>
            <button onClick={() => setShowShareModal(false)} className="btn-primary w-full mt-4">关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}
