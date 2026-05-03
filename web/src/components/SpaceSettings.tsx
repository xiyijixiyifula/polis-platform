'use client';

import { useState } from 'react';
import {
  Settings, X, MessageCircle, BarChart3, Megaphone,
  UserCheck, Video, Code, HelpCircle, MessageSquare,
  ShoppingBag, GraduationCap, BookOpen, Crown,
} from 'lucide-react';

export interface SpaceModules {
  posts: boolean;          // 交流 - 默认开启不可关闭
  share: boolean;          // 分享 - 仅创建者可发布
  series: boolean;         // 系列/专栏
  video: boolean;          // 视频
  code_repo: boolean;      // 代码仓库
  qa: boolean;             // 问答
  polls: boolean;          // 投票
  announcements: boolean;  // 公告
  chat: boolean;           // 聊天
  store: boolean;          // 商城
  course: boolean;         // 课程
  members: boolean;        // 成员
  membership: boolean;     // 付费会员
}

const defaultModules: SpaceModules = {
  posts: true,
  share: false,
  series: false,
  video: false,
  code_repo: false,
  qa: false,
  polls: false,
  announcements: false,
  chat: false,
  store: false,
  course: false,
  members: false,
  membership: false,
};

function getModulesKey(namespace: string) {
  return `polis_space_modules_${namespace}`;
}

export function loadModules(namespace: string): SpaceModules {
  try {
    // Try decoded namespace key first (new format)
    let saved = localStorage.getItem(getModulesKey(namespace));
    // Fallback: try URL-encoded key (old format, for backward compatibility)
    if (!saved) {
      saved = localStorage.getItem(getModulesKey(encodeURIComponent(namespace)));
    }
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure share has a default value if missing in old data
      if (parsed.share === undefined) parsed.share = false;
      return { ...defaultModules, ...parsed, posts: true };
    }
  } catch {}
  return { ...defaultModules };
}

export function saveModules(namespace: string, modules: SpaceModules) {
  localStorage.setItem(getModulesKey(namespace), JSON.stringify(modules));
}

interface SpaceSettingsProps {
  namespace: string;
  modules: SpaceModules;
  onChange: (modules: SpaceModules) => void;
  onClose: () => void;
}

interface ModuleDef {
  key: keyof SpaceModules;
  label: string;
  icon: React.ElementType;
  desc: string;
  locked: boolean;
  comingSoon: boolean;
}

export function SpaceSettings({ namespace, modules, onChange, onClose }: SpaceSettingsProps) {
  const availableModules: ModuleDef[] = [
    { key: 'posts', label: '交流', icon: MessageCircle, locked: true, comingSoon: false, desc: '社区交流与讨论板块，所有成员可发帖互动' },
    { key: 'share', label: '分享', icon: MessageSquare, locked: false, comingSoon: false, desc: '个人内容分享空间，仅社区创建者可发布' },
    { key: 'series', label: '系列', icon: BookOpen, locked: false, comingSoon: false, desc: '内容系列/专栏，组织帖子合集' },
    { key: 'membership', label: '会员', icon: Crown, locked: false, comingSoon: false, desc: '付费会员等级与订阅管理' },
    { key: 'video', label: '视频', icon: Video, locked: false, comingSoon: true, desc: '视频内容发布与播放' },
    { key: 'code_repo', label: '代码仓库', icon: Code, locked: false, comingSoon: true, desc: 'Git 代码仓库托管' },
    { key: 'qa', label: '问答', icon: HelpCircle, locked: false, comingSoon: false, desc: '提问与回答' },
    { key: 'polls', label: '投票', icon: BarChart3, locked: false, comingSoon: false, desc: '社区投票和问卷调查' },
    { key: 'announcements', label: '公告', icon: Megaphone, locked: false, comingSoon: false, desc: '社区公告和通知' },
    { key: 'chat', label: '聊天', icon: MessageSquare, locked: false, comingSoon: true, desc: '即时通讯聊天室' },
    { key: 'store', label: '商城', icon: ShoppingBag, locked: false, comingSoon: true, desc: '商品发布与交易' },
    { key: 'course', label: '课程', icon: GraduationCap, locked: false, comingSoon: true, desc: '在线课程与学习' },
    { key: 'members', label: '成员', icon: UserCheck, locked: false, comingSoon: false, desc: '社区成员列表' },
  ];

  const toggle = (key: keyof SpaceModules) => {
    const mod = availableModules.find(m => m.key === key);
    if (!mod || mod.locked || mod.comingSoon) return;
    const next = { ...modules, [key]: !modules[key] };
    onChange(next);
    saveModules(namespace, next);
  };

  return (
    <div className="absolute right-0 top-12 w-72 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg py-2 z-40 max-h-[70vh] overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-700">
        <span className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
          <Settings className="h-3.5 w-3.5" /> 模块设置
        </span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="py-1">
        {availableModules.map((mod) => {
          const Icon = mod.icon;
          const isOn = modules[mod.key];
          const disabled = mod.locked || mod.comingSoon;

          return (
            <button
              key={mod.key}
              onClick={() => toggle(mod.key)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer'
              }`}
              disabled={disabled}
            >
              <Icon className="h-4 w-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  {mod.label}
                  {mod.comingSoon && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1 rounded">
                      即将推出
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400">{mod.desc}</p>
              </div>
              <div className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${
                isOn ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
              } ${disabled ? 'opacity-60' : ''}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  isOn ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
