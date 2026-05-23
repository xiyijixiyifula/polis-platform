'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Code, GitBranch, Folder, File, Plus, RefreshCw, ExternalLink, Clock, Lock, Globe, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Repo {
  id: string;
  name: string;
  description?: string;
  is_private?: boolean;
  default_branch?: string;
  clone_url?: string;
  created_at?: string;
  updated_at?: string;
  owner_id?: string;
}

interface FileEntry {
  name: string;
  type: 'file' | 'dir';
  mode: number;
}

export default function SpaceCodeRepo({ namespace }: { namespace: string }) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrivate, setNewPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [readme, setReadme] = useState<string | null>(null);
  const [filesLoading, setFilesLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/spaces/${namespace}/repos`);
      const data = await res.json();
      if (data.code === 0) {
        setRepos(Array.isArray(data.data) ? data.data : data.data?.items || []);
      } else {
        setError(data.message || '加载仓库列表失败');
      }
    } catch (e: any) {
      setError(e.message || '网络错误');
    } finally {
      setLoading(false);
    }
  }, [namespace]);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  const handleCreate = async () => {
    if (!newName.trim() || newName.length < 2) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/spaces/${namespace}/repos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim(), is_private: newPrivate }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setShowCreate(false);
        setNewName('');
        setNewDesc('');
        setNewPrivate(false);
        fetchRepos();
      } else {
        setError(data.message || '创建仓库失败');
      }
    } catch (e: any) {
      setError(e.message || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const viewRepo = async (repo: Repo) => {
    setSelectedRepo(repo);
    setFilesLoading(true);
    setReadme(null);
    try {
      const [filesRes, readmeRes] = await Promise.all([
        fetch(`/api/spaces/${namespace}/repos/${repo.id}/tree`),
        fetch(`/api/spaces/${namespace}/repos/${repo.id}/readme`),
      ]);
      const filesData = await filesRes.json();
      const readmeData = await readmeRes.json();
      if (filesData.code === 0) setFiles(Array.isArray(filesData.data) ? filesData.data : []);
      if (readmeData.code === 0) setReadme(typeof readmeData.data === 'string' ? readmeData.data : null);
    } catch (e: any) {
      // ignore
    } finally {
      setFilesLoading(false);
    }
  };

  const copyCloneUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="glass-card py-12 text-center text-gray-400 animate-pulse">
        <Code className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>加载仓库列表...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Code className="h-5 w-5 text-primary-600" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            代码仓库
            {repos.length > 0 && <span className="ml-2 text-xs font-normal text-gray-400">({repos.length})</span>}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchRepos} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="刷新">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => setShowCreate(!showCreate)}
            className="btn-primary text-xs px-3 py-1.5 gap-1 flex items-center">
            <Plus className="h-3.5 w-3.5" /> 新建仓库
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="glass-card p-4 mb-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">创建新仓库</h4>
          <div className="space-y-2">
            <input type="text" placeholder="仓库名称 (2-100字符)"
              value={newName} onChange={e => setNewName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
            <input type="text" placeholder="仓库描述（可选）"
              value={newDesc} onChange={e => setNewDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              <input type="checkbox" checked={newPrivate} onChange={e => setNewPrivate(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600" />
              {newPrivate ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
              私有仓库
            </label>
            <div className="flex gap-2 pt-1">
              <button onClick={handleCreate} disabled={creating || newName.length < 2}
                className="btn-primary text-xs px-4 py-1.5">{creating ? '创建中...' : '创建仓库'}</button>
              <button onClick={() => setShowCreate(false)}
                className="btn-secondary text-xs px-4 py-1.5">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Repo List or Detail */}
      {selectedRepo ? (
        <div>
          <button onClick={() => { setSelectedRepo(null); setFiles([]); setReadme(null); }}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline mb-3 inline-flex items-center gap-1">
            ← 返回仓库列表
          </button>

          {/* Repo Info */}
          <div className="glass-card p-4 mb-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <GitBranch className="h-4 w-4 text-gray-400" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">{selectedRepo.name}</h3>
                  {selectedRepo.is_private ? (
                    <Lock className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <Globe className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                </div>
                {selectedRepo.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedRepo.description}</p>
                )}
              </div>
              {selectedRepo.clone_url && (
                <button onClick={() => copyCloneUrl(selectedRepo.clone_url!)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? '已复制' : '复制克隆地址'}
                </button>
              )}
            </div>
          </div>

          {/* Files */}
          <div className="glass-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <Folder className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">文件列表</span>
            </div>
            {filesLoading ? (
              <div className="py-8 text-center text-gray-400 text-sm animate-pulse">加载文件列表中...</div>
            ) : files.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    {f.type === 'dir' ? (
                      <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                    ) : (
                      <File className="h-4 w-4 text-blue-400 shrink-0" />
                    )}
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{f.name}</span>
                    <span className="ml-auto text-[10px] text-gray-400 uppercase">{f.type}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400 text-sm">仓库为空</div>
            )}
          </div>

          {/* README */}
          {readme && (
            <div className="glass-card mt-3 p-4">
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">README.md</div>
              <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">{readme}</pre>
            </div>
          )}
        </div>
      ) : repos.length > 0 ? (
        <div className="space-y-2">
          {repos.map(repo => (
            <button key={repo.id} onClick={() => viewRepo(repo)}
              className="glass-card w-full text-left p-4 flex items-center gap-3 hover:border-primary-400 dark:hover:border-primary-600 transition-colors group">
              <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center">
                <Code className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                    {repo.name}
                  </span>
                  {repo.is_private ? (
                    <EyeOff className="h-3 w-3 text-gray-400 shrink-0" />
                  ) : (
                    <Eye className="h-3 w-3 text-gray-400 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                  {repo.description && <span className="truncate max-w-[200px]">{repo.description}</span>}
                  {repo.default_branch && (
                    <span className="inline-flex items-center gap-0.5">
                      <GitBranch className="h-2.5 w-2.5" /> {repo.default_branch}
                    </span>
                  )}
                  {repo.created_at && <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatDate(repo.created_at)}</span>}
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-primary-500 transition-colors shrink-0" />
            </button>
          ))}
        </div>
      ) : (
        <div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500 rounded-2xl">
          <Code className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-base font-medium text-gray-500 dark:text-gray-400">暂无代码仓库</p>
          <p className="text-sm mt-1">创建第一个 Git 仓库，开始协作编程</p>
          <button onClick={() => setShowCreate(true)}
            className="btn-primary inline-flex items-center gap-1.5 mt-4 px-5 py-2 text-sm">
            <Plus className="h-4 w-4" /> 创建仓库
          </button>
        </div>
      )}
    </div>
  );
}
