'use client';

import { useState, useEffect } from 'react';
import { Settings, X, MessageCircle, BarChart3, Megaphone, UserCheck } from 'lucide-react';

export interface SpaceModules {
  posts: boolean;      // 文章 - 默认开启不可关闭
  polls: boolean;      // 投票
  announcements: boolean; // 公告
  members: boolean;    // 成员
}

const defaultModules: SpaceModules = {
  posts: true,
  polls: false,
  announcements: false,
  members: false,
};

function getModulesKey(namespace: string) {
  return `polis_space_modules_${namespace}`;
}

export function loadModules(namespace: string): SpaceModules {
  try {
    const saved = localStorage.getItem(getModulesKey(namespace));
    if (saved) return { ...defaultModules, ...JSON.parse(saved), posts: true };
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

export function SpaceSettings({ namespace, modules, onChange, onClose }: SpaceSettingsProps) {
  const availableModules = [
    { key: 'posts' as const, label: '文章', icon: MessageCircle, locked: true, desc: '默认模块，始终可见' },
    { key: 'polls' as const, label: '投票', icon: BarChart3, locked: false, desc: '社区投票和问卷' },
    { key: 'announcements' as const, label: '公告', icon: Megaphone, locked: false, desc: '社区公告和通知' },
    { key: 'members' as const, label: '成员', icon: UserCheck, locked: false, desc: '社区成员列表' },
  ];

  const toggle = (key: keyof SpaceModules) => {
    if (key === 'posts') return;
    const next = { ...modules, [key]: !modules[key] };
    onChange(next);
    saveModules(namespace, next);
  };

  return (
    <div className="relative">
      <div className="absolute right-0 top-10 w-64 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg py-2 z-40">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Settings className="h-3.5 w-3.5" /> 模块设置
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="py-1">
          {availableModules.map((mod) => (
            <button
              key={mod.key}
              onClick={() => toggle(mod.key)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <mod.icon className="h-4 w-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{mod.label}</p>
                <p className="text-xs text-gray-400">{mod.desc}</p>
              </div>
              <div className={`w-9 h-5 rounded-full relative transition-colors ${
                modules[mod.key] ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
              } ${mod.locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  modules[mod.key] ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
