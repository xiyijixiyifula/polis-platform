'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Users, FileText } from 'lucide-react';
import { formatCount } from '@/lib/utils';

interface SpaceCardProps {
  space: {
    id: string;
    namespace: string;
    title: string;
    description: string;
    icon_url: string | null;
    member_count: number;
    post_count: number;
    is_root?: boolean;
    owner_id?: string | null;
    owner_name?: string;
    level?: number;
    xp?: number;
  };
}

const LEVEL_BADGES: Record<number, { emoji: string; label: string; color: string }> = {
  1: { emoji: '🥉', label: '新社区', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  2: { emoji: '🥈', label: '成长中', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
  3: { emoji: '🥇', label: '活跃', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
  4: { emoji: '💎', label: '热门', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  5: { emoji: '👑', label: '顶级', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
};

// ========== 根据 slug 生成唯一几何图标 ==========
const SHAPES = [
  // 六边形
  (color: string) => (
    <svg viewBox="0 0 48 48" className="w-full h-full">
      <polygon points="24,4 44,14 44,34 24,44 4,34 4,14" fill={color} opacity="0.9"/>
      <polygon points="24,10 38,17 38,31 24,38 10,31 10,17" fill="white" opacity="0.2"/>
    </svg>
  ),
  // 齿轮
  (color: string) => (
    <svg viewBox="0 0 48 48" className="w-full h-full">
      <circle cx="24" cy="24" r="18" fill={color} opacity="0.9"/>
      <circle cx="24" cy="24" r="10" fill="white" opacity="0.3"/>
      <circle cx="24" cy="24" r="5" fill={color}/>
      {[0,45,90,135,180,225,270,315].map(deg => {
        const rad = deg * Math.PI / 180;
        const x1 = 24 + Math.cos(rad) * 12;
        const y1 = 24 + Math.sin(rad) * 12;
        const x2 = 24 + Math.cos(rad) * 22;
        const y2 = 24 + Math.sin(rad) * 22;
        return <rect key={deg} x={x2-2} y={y2-4} width="4" height="8" fill={color} transform={`rotate(${deg} ${x2} ${y2})`}/>;
      })}
    </svg>
  ),
  // 花瓣
  (color: string) => (
    <svg viewBox="0 0 48 48" className="w-full h-full">
      {[0,72,144,216,288].map(deg => (
        <ellipse key={deg} cx="24" cy="14" rx="8" ry="14" fill={color} opacity="0.85"
          transform={`rotate(${deg} 24 24)`}/>
      ))}
      <circle cx="24" cy="24" r="6" fill="white" opacity="0.9"/>
    </svg>
  ),
  // 立方体
  (color: string) => (
    <svg viewBox="0 0 48 48" className="w-full h-full">
      <polygon points="24,8 40,18 40,34 24,44 8,34 8,18" fill={color} opacity="0.6"/>
      <polygon points="24,8 40,18 24,28 8,18" fill={color} opacity="0.9"/>
      <polygon points="24,28 40,18 40,34 24,44" fill={color} opacity="0.8"/>
      <polygon points="24,28 8,18 8,34 24,44" fill={color} opacity="0.5"/>
    </svg>
  ),
  // 画板
  (color: string) => (
    <svg viewBox="0 0 48 48" className="w-full h-full">
      <rect x="6" y="8" width="36" height="28" rx="4" fill={color} opacity="0.9"/>
      <rect x="10" y="12" width="28" height="20" rx="2" fill="white" opacity="0.25"/>
      <circle cx="16" cy="19" r="3" fill="white" opacity="0.5"/>
      <rect x="22" y="17" width="12" height="2" rx="1" fill="white" opacity="0.5"/>
      <rect x="22" y="22" width="8" height="2" rx="1" fill="white" opacity="0.5"/>
    </svg>
  ),
  // 灯泡
  (color: string) => (
    <svg viewBox="0 0 48 48" className="w-full h-full">
      <path d="M24 4 C14 4, 8 14, 8 22 C8 28, 12 32, 14 34 L14 40 C14 42, 16 44, 18 44 L30 44 C32 44, 34 42, 34 40 L34 34 C36 32, 40 28, 40 22 C40 14, 34 4, 24 4Z" fill={color} opacity="0.9"/>
      <ellipse cx="24" cy="38" rx="6" ry="2" fill="white" opacity="0.4"/>
      <line x1="24" y1="16" x2="24" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      <line x1="20" y1="20" x2="28" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
  // 盾牌
  (color: string) => (
    <svg viewBox="0 0 48 48" className="w-full h-full">
      <path d="M24 4 L40 10 L40 24 C40 34, 32 42, 24 44 C16 42, 8 34, 8 24 L8 10 Z" fill={color} opacity="0.9"/>
      <path d="M24 14 L32 20 L29 28 L24 32 L19 28 L16 20 Z" fill="white" opacity="0.3"/>
    </svg>
  ),
  // 闪电
  (color: string) => (
    <svg viewBox="0 0 48 48" className="w-full h-full">
      <polygon points="28,4 16,22 26,22 20,44 36,24 26,24" fill={color} opacity="0.9"/>
    </svg>
  ),
];

// 渐变色板
const GRADIENTS = [
  ['#10b981', '#059669'],  // emerald
  ['#f59e0b', '#d97706'],  // amber
  ['#3b82f6', '#1d4ed8'],  // blue
  ['#ec4899', '#a855f7'],  // pink-purple
  ['#14b8a6', '#0d9488'],  // teal
  ['#8b5cf6', '#6d28d9'],  // violet
  ['#22c55e', '#16a34a'],  // green
  ['#f97316', '#ea580c'],  // orange
];

export function getSpaceVisual(namespace: string) {
  let hash = 0;
  for (let i = 0; i < namespace.length; i++) {
    hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
    hash = hash & hash;
  }
  const shapeIdx = Math.abs(hash) % SHAPES.length;
  const gradIdx = Math.abs(hash >> 3) % GRADIENTS.length;
  const [c1, c2] = GRADIENTS[gradIdx];
  return { shape: SHAPES[shapeIdx], gradient: `linear-gradient(135deg, ${c1}, ${c2})` };
}

export function SpaceCard({ space }: SpaceCardProps) {
  const nsParts = space.namespace.split('/');
  const hasOwner = nsParts.length >= 2;
  const ownerName = space.owner_name || (hasOwner ? nsParts[0] : null);
  const communitySlug = hasOwner ? nsParts[nsParts.length - 1] : nsParts[0];

  const visual = getSpaceVisual(space.namespace);

  return (
    <Link href={`/space/${space.namespace}`}>
      <div className="glass-card group cursor-pointer p-4">
        <div className="flex items-start gap-3">
          {/* ========== 升级：几何SVG图标 ========== */}
          <div
            className="h-12 w-12 shrink-0 rounded-xl flex items-center justify-center overflow-hidden"
            style={{ background: visual.gradient }}
          >
            {space.icon_url ? (
              <Image src={space.icon_url!} alt="" width={48} height={48} className="h-full w-full rounded-xl object-cover" unoptimized />
            ) : (
              <div className="w-7 h-7">
                {visual.shape('white')}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                {space.title}
              </h3>
              {space.level && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${LEVEL_BADGES[space.level]?.color || ''}`}>
                  {LEVEL_BADGES[space.level]?.emoji} Lv{space.level}
                </span>
              )}
            </div>

            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
              {ownerName ? (
                <span>
                  <span className="text-primary-600 dark:text-primary-400">@{ownerName}</span>
                </span>
              ) : (
                <span className="font-mono text-gray-700 dark:text-gray-300">{communitySlug}</span>
              )}
            </p>

            {space.description && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                {space.description}
              </p>
            )}

            <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {formatCount(space.member_count)} 成员
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {formatCount(space.post_count)} 帖子
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
