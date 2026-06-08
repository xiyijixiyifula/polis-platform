'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Check, SkipForward, Camera, User, MessageSquare, ArrowRight, Sparkles, Zap } from 'lucide-react';
import { toastSuccess } from '@/stores/toastStore';
import { getToken, users, spaces, posts, Space } from '@/lib/api';

// ─── Step type ──────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

// ─── Popular topics for Step 1 ──────────────────────────────────────

const POPULAR_TOPICS = [
  { emoji: '💻', label: '技术', color: 'from-blue-500 to-cyan-500' },
  { emoji: '🎨', label: '设计', color: 'from-pink-500 to-rose-500' },
  { emoji: '📚', label: '阅读', color: 'from-amber-500 to-orange-500' },
  { emoji: '🎮', label: '游戏', color: 'from-purple-500 to-violet-500' },
  { emoji: '🎵', label: '音乐', color: 'from-green-500 to-emerald-500' },
  { emoji: '🏃', label: '运动', color: 'from-red-500 to-orange-500' },
  { emoji: '🍳', label: '美食', color: 'from-yellow-500 to-amber-500' },
  { emoji: '✈️', label: '旅行', color: 'from-sky-500 to-blue-500' },
  { emoji: '🧠', label: 'AI', color: 'from-indigo-500 to-purple-500' },
  { emoji: '🎬', label: '影视', color: 'from-rose-500 to-pink-500' },
];

// ─── Main component ─────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // ─── Step 1 state ─────────────────────────────────────────────────

  const [trendingSpaces, setTrendingSpaces] = useState<Space[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  // ─── Step 2 state ─────────────────────────────────────────────────

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // ─── Step 3 state ─────────────────────────────────────────────────

  const [postBody, setPostBody] = useState('');

  // ─── Load trending spaces ─────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const token = getToken();
        if (!token) {
          setInitialLoading(false);
          return;
        }
        const res = await spaces.trending();
        if (res.code === 0 && res.data) {
          setTrendingSpaces(res.data.slice(0, 12));
        }
      } catch (e) {
        console.error('[Onboarding] Failed to load trending spaces:', e);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  // ─── Actions ──────────────────────────────────────────────────────

  const toggleFollow = useCallback(async (space: Space) => {
    try {
      if (followedIds.has(space.id)) {
        await spaces.unfollow(space.namespace);
        setFollowedIds((prev) => {
          const next = new Set(prev);
          next.delete(space.id);
          return next;
        });
      } else {
        await spaces.follow(space.namespace);
        setFollowedIds((prev) => new Set(prev).add(space.id));
      }
    } catch (e) {
      console.error('[Onboarding] Follow error:', e);
    }
  }, [followedIds]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      let avatarUrl: string | undefined;

      if (avatarFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(avatarFile);
        });
        try {
          const uploadRes = await fetch('/api/files/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify({
              filename: avatarFile.name,
              data_base64: base64,
              mime_type: avatarFile.type,
            }),
          });
          const uploadData = await uploadRes.json();
          if (uploadData.code === 0 && uploadData.data) {
            avatarUrl = `/api/files/${uploadData.data.id}`;
          }
        } catch (e) {
          console.error('[Onboarding] Avatar upload failed:', e);
        }
      }

      const updateData: { display_name?: string; bio?: string; avatar_url?: string } = {};
      if (displayName.trim()) updateData.display_name = displayName.trim();
      if (bio.trim()) updateData.bio = bio.trim();
      if (avatarUrl) updateData.avatar_url = avatarUrl;

      if (Object.keys(updateData).length > 0) {
        await users.updateProfile(updateData);
      }
    } catch (e) {
      console.error('[Onboarding] Profile update failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!postBody.trim() || trendingSpaces.length === 0) return;
    try {
      await posts.create(trendingSpaces[0].namespace, {
        title: postBody.slice(0, 30) || '我的第一篇帖子',
        body: postBody,
        module_type: 'forum',
      });
    } catch (e) {
      console.error('[Onboarding] Create post failed:', e);
    }
  };

  const goToNextStep = async () => {
    if (step === 2) {
      await handleUpdateProfile();
    }
    if (step === 3) {
      if (postBody.trim()) {
        await handleCreatePost();
      }
      finishOnboarding();
      return;
    }
    setStep((s) => (s + 1) as Step);
  };

  const skipStep = async () => {
    if (step === 2) {
      if (displayName.trim() || bio.trim() || avatarFile) {
        await handleUpdateProfile();
      }
    }
    if (step === 3) {
      finishOnboarding();
      return;
    }
    setStep((s) => (s + 1) as Step);
  };

  const finishOnboarding = () => {
    toastSuccess('🎉 欢迎加入 Polis！开始探索你的社区吧');
    router.push('/');
  };

  // ─── Not logged in ────────────────────────────────────────────────

  if (!initialLoading && !getToken()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/20 mb-6">
          <Sparkles className="h-4 w-4 text-primary-500" />
          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">欢迎加入</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          欢迎加入 Polis
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          请先登录以完成新手引导
        </p>
        <button
          onClick={() => router.push('/login')}
          className="btn-primary text-base px-8 py-3 rounded-xl"
        >
          前往登录
        </button>
      </div>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────

  if (initialLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-full max-w-md mx-auto" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto" />
          <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  // ─── Step labels ──────────────────────────────────────────────────

  const stepLabels: Record<Step, string> = { 1: '选择兴趣', 2: '完善资料', 3: '发布第一帖' };

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      {/* ── Progress Bar ─────────────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-center justify-between max-w-md mx-auto mb-4">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all duration-300 ${
                  s < step
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                    : s === step
                    ? 'bg-primary-500 text-white ring-4 ring-primary-200 dark:ring-primary-800 shadow-lg shadow-primary-500/30'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {s < step ? <Check className="w-5 h-5" /> : <span>{s}</span>}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  s <= step ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-600'
                }`}
              >
                {stepLabels[s]}
              </span>
            </div>
          ))}
        </div>
        <div className="max-w-md mx-auto h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Step 1: 选择兴趣 ─────────────────────────────────────── */}
      {step === 1 && (
        <StepCard
          emoji="🌟"
          title="选择你感兴趣的社区"
          subtitle="关注你喜欢的社区，我们会为你推荐相关内容"
          gradient="from-indigo-500 via-purple-500 to-pink-500"
        >
          {/* Topic tags */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-2">
            {POPULAR_TOPICS.map((topic) => (
              <div
                key={topic.label}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 cursor-default hover:scale-105 hover:shadow-md transition-all duration-200"
              >
                <span className="text-3xl">{topic.emoji}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {topic.label}
                </span>
              </div>
            ))}
          </div>

          {/* Trending spaces to follow */}
          {trendingSpaces.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                热门社区
              </h3>
              <div className="grid gap-2 max-h-64 overflow-y-auto pr-1">
                {trendingSpaces.map((space) => {
                  const isFollowed = followedIds.has(space.id);
                  return (
                    <button
                      key={space.id}
                      onClick={() => toggleFollow(space)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left ${
                        isFollowed
                          ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                        {space.icon_url ? (
                          <img src={space.icon_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          space.title.charAt(0)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {space.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          @{space.namespace} · {space.member_count} 成员
                        </p>
                      </div>
                      <div
                        className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                          isFollowed
                            ? 'bg-primary-500 text-white'
                            : 'border-2 border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {isFollowed && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <StepActions onNext={goToNextStep} onSkip={skipStep} nextLabel="下一步" skipLabel="跳过" />
        </StepCard>
      )}

      {/* ── Step 2: 完善资料 ─────────────────────────────────────── */}
      {step === 2 && (
        <StepCard
          emoji="✨"
          title="完善你的个人资料"
          subtitle="让大家更好地认识你"
          gradient="from-emerald-500 via-teal-500 to-cyan-500"
        >
          <div className="space-y-5">
            {/* Avatar upload */}
            <div className="flex flex-col items-center gap-3">
              <label className="relative cursor-pointer group">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center overflow-hidden shadow-md group-hover:shadow-lg transition-shadow">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="头像预览" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
                <div className="absolute inset-0 rounded-2xl bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                  aria-label="上传头像"
                />
              </label>
              <span className="text-xs text-gray-400 dark:text-gray-500">点击上传头像</span>
            </div>

            {/* Display name */}
            <div>
              <label
                htmlFor="onboard-display-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                显示名称
              </label>
              <input
                id="onboard-display-name"
                type="text"
                placeholder="你的显示名称"
                className="input-field rounded-xl"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            {/* Bio */}
            <div>
              <label
                htmlFor="onboard-bio"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                个人简介
              </label>
              <textarea
                id="onboard-bio"
                placeholder="写一句介绍自己..."
                rows={3}
                className="input-field rounded-xl resize-none"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </div>

          <StepActions
            onNext={goToNextStep}
            onSkip={skipStep}
            nextLabel="下一步"
            skipLabel="跳过"
            loading={loading}
          />
        </StepCard>
      )}

      {/* ── Step 3: 发布第一帖 ───────────────────────────────────── */}
      {step === 3 && (
        <StepCard
          emoji="🚀"
          title="发布你的第一篇帖子"
          subtitle="大声说出你的想法，让世界看见"
          gradient="from-orange-500 via-red-500 to-pink-500"
        >
          <div className="space-y-4">
            <textarea
              placeholder="写下你的第一篇帖子..."
              rows={5}
              className="input-field rounded-xl resize-none"
              value={postBody}
              onChange={(e) => setPostBody(e.target.value)}
            />
            {trendingSpaces.length > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                将发布到{' '}
                <strong className="text-gray-600 dark:text-gray-300">{trendingSpaces[0].title}</strong>
              </p>
            )}
          </div>

          <StepActions
            onNext={goToNextStep}
            onSkip={finishOnboarding}
            nextLabel={postBody.trim() ? '发布并完成' : '先跳过，完成引导'}
            skipLabel="稍后再说"
            loading={loading}
          />
        </StepCard>
      )}

      {/* ── Skip all ──────────────────────────────────────────────── */}
      <div className="text-center mt-6">
        <button
          onClick={finishOnboarding}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1 mx-auto"
        >
          <SkipForward className="w-3.5 h-3.5" />
          跳过全部引导
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function StepCard({
  emoji,
  title,
  subtitle,
  gradient,
  children,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  gradient: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50">
      {/* Gradient header */}
      <div className={`bg-gradient-to-r ${gradient} px-6 py-8 sm:px-8 text-center`}>
        <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm text-4xl mb-3">
          {emoji}
        </span>
        <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
        <p className="text-sm text-white/80">{subtitle}</p>
      </div>

      {/* Content */}
      <div className="px-6 py-6 sm:px-8">{children}</div>
    </div>
  );
}

function StepActions({
  onNext,
  onSkip,
  nextLabel,
  skipLabel,
  loading = false,
}: {
  onNext: () => void;
  onSkip: () => void;
  nextLabel: string;
  skipLabel: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
      <button
        onClick={onSkip}
        disabled={loading}
        className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1 font-medium disabled:opacity-50"
      >
        <SkipForward className="w-3.5 h-3.5" />
        {skipLabel}
      </button>
      <button
        onClick={onNext}
        disabled={loading}
        className="btn-primary rounded-xl text-sm px-5 py-2.5 flex items-center gap-1.5"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            保存中...
          </>
        ) : (
          <>
            {nextLabel}
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}
