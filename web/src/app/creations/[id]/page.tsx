'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import CreationCard, { type CreationPublic } from '@/components/CreationCard';
import SubmitDialog from '@/components/SubmitDialog';
import { getToken } from '@/lib/api';

export default function ViewCreationPage() {
  const params = useParams();
  const id = params.id as string;

  const [creation, setCreation] = useState<CreationPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);

  // 动态返回链接：优先使用来源页面，兜底为创作中心
  const returnUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/creations';
    try {
      const ref = document.referrer;
      if (ref) {
        const refUrl = new URL(ref);
        if (refUrl.origin === window.location.origin && !refUrl.pathname.startsWith('/creations/')) {
          return ref;
        }
      }
    } catch {}
    return '/creations';
  }, []);

  useEffect(() => {
    if (!id) return;
    const token = getToken() || '';
    fetch(`/api/creations/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.data) setCreation(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (!creation) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-gray-500 dark:text-gray-400">创作不存在或已删除</p>
        <Link href={returnUrl} className="text-primary-600 hover:underline text-sm mt-2 inline-block">
          返回我的创作
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* 导航 */}
      <div className="flex items-center justify-between mb-6">
        <Link href={returnUrl}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition">
          <ArrowLeft size={18} /> 返回
        </Link>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setSubmitOpen(true)}
            className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition">
            <Send size={14} /> 投稿到社区
          </button>
        </div>
      </div>

      {/* 创作详情 */}
      <CreationCard
        creation={creation}
        showSource={true}
        isOwner={true}
        onEdit={(cid) => { window.location.href = `/creations/${cid}/edit`; }}
        onSubmit={(cid) => {
          setSubmitOpen(true);
        }}
      />

      {/* 投稿弹窗 */}
      {submitOpen && (
        <SubmitDialog
          creationId={id}
          onClose={() => setSubmitOpen(false)}
          onSubmit={() => {
            setSubmitOpen(false);
          }}
        />
      )}
    </div>
  );
}
