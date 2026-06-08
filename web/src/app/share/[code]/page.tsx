'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Lock, Download, File, AlertCircle } from 'lucide-react';

export default function SharePage() {
  const params = useParams();
  const code = params.code as string;
  const [password, setPassword] = useState('');
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);

  const handleAccess = async () => {
    setLoading(true);
    setError('');
    try {
      const query = password ? `?password=${encodeURIComponent(password)}` : '';
      const res = await fetch(`/api/share/${code}${query}`);
      const data = await res.json();
      if (data.code === 0) {
        setFileInfo(data.data);
      } else if (data.code === 1003 && data.message.includes('提取码')) {
        setNeedsPassword(true);
        setError('请输入提取码');
      } else {
        setError(data.message || '文件不存在或链接已失效');
      }
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    return bytes + ' B';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {!fileInfo ? (
          <div className="card text-center">
            <div className="text-5xl mb-4">📁</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">查看分享文件</h1>
            <p className="text-sm text-gray-500 mb-6">分享码：{code}</p>

            {needsPassword && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                  <Lock className="h-4 w-4" /> 此文件需要提取码
                </div>
                <input type="text" className="input-field text-center" placeholder="输入提取码"
                  value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            )}

            {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

            <button onClick={handleAccess} disabled={loading} className="btn-primary w-full py-2.5 gap-2">
              {loading ? <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>加载中...</span> : <><Download className="h-4 w-4" /> 查看文件</>}
            </button>
          </div>
        ) : (
          <div className="card text-center">
            <div className="text-5xl mb-4">
              {fileInfo.file?.mime_type?.startsWith('image/') ? '🖼️' : fileInfo.file?.mime_type?.startsWith('video/') ? '🎬' : '📄'}
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{fileInfo.file?.filename || '未知文件'}</h2>
            <p className="text-sm text-gray-500 mt-1">{fileInfo.file?.file_size ? formatSize(fileInfo.file.file_size) : ''}</p>
            <a href={`/api/files/${fileInfo.file?.id}/download`}
              className="btn-primary w-full mt-6 py-2.5 gap-2 inline-flex items-center justify-center">
              <Download className="h-4 w-4" /> 下载文件
            </a>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-gray-400">
          由 Polis 文件分享提供 · 分享给你的朋友
        </p>
      </div>
    </div>
  );
}
