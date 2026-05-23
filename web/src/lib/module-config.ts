/**
 * 模块配置 — 唯一权威数据源
 *
 * 核心原则：作品 = 唯一真实路径，列表 = 索引
 * 索引规则：用户 / 社区空间 / 模块 / 作品名称
 */

export interface ModuleInfo {
  label: string;
  route: string;
  emoji: string;
}

export const MODULE_CONFIG: Record<string, ModuleInfo> = {
  forum:        { label: '交流',     route: 'posts',         emoji: '📄' },
  article:      { label: '文章',     route: 'posts',         emoji: '📄' },
  post:         { label: '帖子',     route: 'posts',         emoji: '📄' },
  text:         { label: '交流',     route: 'posts',         emoji: '📄' },
  image:        { label: '交流',     route: 'posts',         emoji: '🖼️' },
  share:        { label: '分享',     route: 'share',         emoji: '🔖' },
  wiki:         { label: '知识库',   route: 'wiki',          emoji: '📚' },
  series:       { label: '系列',     route: 'series',        emoji: '📚' },
  membership:   { label: '会员',     route: 'membership',    emoji: '👑' },
  video:        { label: '视频',     route: 'video',         emoji: '🎬' },
  code_repo:    { label: '代码仓库', route: 'code_repo',     emoji: '💻' },
  qa:           { label: '问答',     route: 'qa',            emoji: '❓' },
  polls:        { label: '投票',     route: 'polls',         emoji: '📊' },
  poll:         { label: '投票',     route: 'polls',         emoji: '📊' },
  announcements:{ label: '公告',     route: 'announcements', emoji: '📢' },
  announcement: { label: '公告',     route: 'announcements', emoji: '📢' },
  chat:         { label: '聊天',     route: 'chat',          emoji: '💬' },
  store:        { label: '商城',     route: 'store',         emoji: '🛒' },
  course:       { label: '课程',     route: 'course',        emoji: '🎓' },
  novel:        { label: '小说',     route: 'novel',         emoji: '📖' },
  game:         { label: '游戏',     route: 'game',          emoji: '🎮' },
  mini_app:     { label: '小程序',   route: 'mini_app',      emoji: '🧩' },
  members:      { label: '成员',     route: 'members',       emoji: '👥' },
  files:        { label: '文件',     route: 'files',         emoji: '📁' },
  discussion:   { label: '讨论',     route: 'posts',         emoji: '💬' },
  activity:     { label: '活动',     route: 'posts',         emoji: '🎯' },
  knowledge:    { label: '知识库',   route: 'wiki',          emoji: '📚' },
  resource:     { label: '资源',     route: 'files',         emoji: '📁' },
};

export const VALID_MODULE_KEYS = Object.keys(MODULE_CONFIG);

export const ALL_SUB_ROUTES: string[] = Array.from(new Set(Object.values(MODULE_CONFIG).map(c => c.route)));

export const KNOWN_SUB_ROUTES = new Set(ALL_SUB_ROUTES);

export function getModuleLabel(moduleType?: string): string {
  if (!moduleType) return '交流';
  return MODULE_CONFIG[moduleType]?.label || '交流';
}

export function getModuleEmoji(moduleType?: string): string {
  if (!moduleType) return '📄';
  return MODULE_CONFIG[moduleType]?.emoji || '📄';
}

/** 模块类型别名组 — 这些类型在显示上应合并为同一模块 */
const MODULE_ALIASES: Record<string, string> = {
  text: 'forum',
  image: 'forum',
  article: 'forum',
  post: 'forum',
  discussion: 'forum',
};

export function normalizeModuleType(rawType?: string): string {
  if (!rawType) return 'forum';
  // 先查别名表，再查模块配置，最后降级到 forum
  if (MODULE_ALIASES[rawType]) return MODULE_ALIASES[rawType];
  return MODULE_CONFIG[rawType] ? rawType : 'forum';
}

export function getModuleLabelByContentType(contentType?: string, moduleType?: string): string {
  if (contentType === 'poll') return '投票';
  if (contentType === 'announcement') return '公告';
  if (contentType === 'video') return '视频';
  if (contentType === 'text' || contentType === 'image') return '交流';
  return getModuleLabel(moduleType);
}

export function buildPostLink(postId: string, spaceNs?: string): string {
  const base = `/post/${postId}`;
  if (spaceNs) return `${base}?space=${encodeURIComponent(spaceNs)}`;
  return base;
}
