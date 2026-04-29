import { Metadata } from 'next';
export const metadata: Metadata = { title: '隐私政策' };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 prose prose-gray">
      <h1>隐私政策</h1>
      <p className="text-gray-500">最后更新：2026 年 4 月</p>
      <h2>1. 信息收集</h2>
      <p>我们只收集必要的账户信息（用户名、邮箱）。你发布的内容完全归你所有。</p>
      <h2>2. 数据主权</h2>
      <p>你可以随时在设置页面导出你的所有数据（Markdown + JSON 格式）。</p>
      <h2>3. Cookie</h2>
      <p>我们仅使用必要的 Cookie 用于身份验证，不会追踪你的浏览行为。</p>
      <h2>4. 第三方</h2>
      <p>我们不会将你的数据出售或分享给第三方。</p>
      <h2>5. 联系</h2>
      <p>如有隐私相关问题，请联系 privacy@polis.app</p>
    </div>
  );
}
