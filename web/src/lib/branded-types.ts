/**
 * Branded Types — 编译期防止 internal-id-leak Pattern 复发。
 *
 * 问题: title: string 和 slug: string 在 TypeScript 中都是 string，
 *      编译器无法阻止开发者误将 slug 当作标题显示 (已复发3次)。
 *
 * 解决: DisplayString 和 InternalId 是不兼容的类型，
 *      编译器强制在 API→组件边界做显式转换。
 *
 * 使用:
 *   <h1>{toDisplay(space.title)}</h1>
 *   <Link href={toInternal(space.namespace)}>
 */

declare const DISPLAY: unique symbol;
declare const INTERNAL: unique symbol;

export type DisplayString = string & { [DISPLAY]: true };
export type InternalId = string & { [INTERNAL]: true };

/** 标记为显示名称 — 可安全渲染到 UI */
export function toDisplay(s: string): DisplayString {
  return s as unknown as DisplayString;
}

/** 标记为内部标识符 — 仅用于 URL/API，不可渲染 */
export function toInternal(s: string): InternalId {
  return s as unknown as InternalId;
}
