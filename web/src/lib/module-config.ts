/**
 * 模块工具函数
 *
 * 所有模块都是自定义模块，由 space_modules 表管理。
 * 模块标签、图标、路由均来自 API 响应，不再有硬编码配置。
 */

export interface ModuleInfo {
  label: string;
  route: string;
  emoji: string;
}

/**
 * 模块标签 — 来自 API 的 module.name，此处仅做恒等映射
 * 当无数据时返回 moduleKey 本身作为 fallback
 */
export function getModuleLabel(moduleType?: string): string {
  if (!moduleType) return '';
  return moduleType;
}

/**
 * 模块图标 — 来自 API 的 module.icon，此处返回默认图标
 */
export function getModuleEmoji(_moduleType?: string): string {
  return '📄';
}

/**
 * 模块标签（按内容类型）— 简化版本
 */
export function getModuleLabelByContentType(contentType?: string, moduleType?: string): string {
  if (moduleType) return moduleType;
  if (!contentType) return '';
  return contentType;
}

/**
 * 构建帖子链接
 */
export function buildPostLink(postId: string, spaceNs?: string): string {
  const base = `/post/${postId}`;
  if (spaceNs) return `${base}?space=${encodeURIComponent(spaceNs)}`;
  return base;
}

/**
 * 已知的模块键集合 — 保留用于向后兼容的过渡期
 * 所有模块键现在都来自 API，这些仅作为合理的默认值
 */
export const KNOWN_MODULE_KEYS = [
  'forum', 'share', 'wiki', 'series', 'membership',
  'video', 'code_repo', 'qa', 'polls', 'announcements',
  'chat', 'store', 'course', 'novel', 'game', 'mini_app',
];
