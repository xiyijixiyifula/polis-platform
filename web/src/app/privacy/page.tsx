import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '隐私政策',
  description: 'Polis 平台隐私政策 — 了解我们如何收集、使用和保护你的个人信息。',
};

const sections = [
  {
    id: 'collection',
    title: '1. 信息收集',
    content: (
      <div className="space-y-3">
        <p>
          当你注册和使用 Polis 平台时，我们会收集以下类型的信息：
        </p>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">1.1 账户信息</h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>必填信息：</strong>用户名（username）、邮箱地址（email）、密码（加密存储）。</li>
          <li><strong>选填信息：</strong>显示名称（display_name）、头像（avatar）、个人简介（bio）。</li>
        </ul>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">1.2 区块链相关数据</h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>钱包地址：</strong>当你绑定加密钱包时，我们会存储你的钱包公钥地址。</li>
          <li><strong>链上活动：</strong>XP 挖矿记录、$POL 代币交易记录等链上数据。</li>
        </ul>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">1.3 内容数据</h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>你创建的所有作品（帖子、视频、投票、系列、知识库文章等）。</li>
          <li>你发表的评论、点赞记录、收藏记录。</li>
          <li>你创建的社区空间及其配置信息。</li>
        </ul>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">1.4 活动数据</h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>XP 经验值、等级、徽章等活动参与数据。</li>
          <li>社区加入/退出记录、关注/取关记录。</li>
          <li>浏览器推送通知订阅状态。</li>
        </ul>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">1.5 自动收集的技术数据</h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>服务器日志（IP 地址、请求时间、User-Agent）。</li>
          <li>基本访问统计（页面浏览量，匿名化处理）。</li>
        </ul>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          我们<strong>不会</strong>收集：精确地理位置、设备通讯录、相册内容、或其他与平台功能无关的个人隐私数据。
        </p>
      </div>
    ),
  },
  {
    id: 'usage',
    title: '2. 信息使用',
    content: (
      <div className="space-y-3">
        <p>我们收集的信息用于以下目的：</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>身份认证与账户管理：</strong>
            使用邮箱和密码进行登录验证，JWT Token 管理会话状态。
          </li>
          <li>
            <strong>内容交付与展示：</strong>
            根据你的账户信息展示你的作品、社区和个人主页内容。
          </li>
          <li>
            <strong>区块链操作：</strong>
            处理钱包绑定、XP 挖矿、$POL 代币奖励等 Web3 功能。
          </li>
          <li>
            <strong>通知服务：</strong>
            向你发送社区动态、互动提醒、系统通知（可在设置中管理偏好）。
          </li>
          <li>
            <strong>社区运营：</strong>
            计算社区等级、经验值，展示排行榜和社区活跃度。
          </li>
          <li>
            <strong>安全与合规：</strong>
            检测和防范恶意行为、垃圾信息、滥用行为，保障平台安全。
          </li>
          <li>
            <strong>服务改进：</strong>
            分析匿名的聚合数据以改进平台功能和用户体验。
          </li>
        </ul>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          我们<strong>不会</strong>将你的个人数据出售给任何第三方。我们<strong>不会</strong>使用你的内容数据训练 AI 模型。
        </p>
      </div>
    ),
  },
  {
    id: 'storage',
    title: '3. 信息存储',
    content: (
      <div className="space-y-3">
        <p>你的数据存储在以下系统中：</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>PostgreSQL 数据库：</strong>
            用户账户、作品内容、社区数据、社交关系等核心数据持久化存储在 PostgreSQL 中。
            数据库服务器位于受控访问的数据中心。
          </li>
          <li>
            <strong>Redis 缓存：</strong>
            会话状态、访问频率限制、临时缓存数据存储在 Redis 中，定期过期清理。
          </li>
          <li>
            <strong>服务器日志：</strong>
            HTTP 请求日志按日志轮转策略保存，定期自动清理旧日志。
          </li>
        </ul>
        <p>
          我们采取合理的物理、技术和管理措施来保护你的数据安全。数据存储位于受严格访问控制的服务器环境中。
        </p>
      </div>
    ),
  },
  {
    id: 'cookies',
    title: '4. Cookie 使用',
    content: (
      <div className="space-y-3">
        <p>Polis 平台使用以下类型的 Cookie 和本地存储：</p>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">4.1 必要 Cookie（Essential）</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>认证 Token（polis_access_token）：</strong>
            JWT 格式的认证令牌，存储在 localStorage 中，用于识别你的登录身份。
            登录时生成，登出时清除。选择"记住我"时有效期为 30 天，否则为 1 天。
          </li>
          <li>
            <strong>主题偏好（polis_theme）：</strong>
            存储你的深色/浅色模式偏好，非个人身份信息。
          </li>
        </ul>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">4.2 我们不使用的 Cookie</h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>❌ 第三方广告追踪 Cookie</li>
          <li>❌ 跨站追踪 Cookie</li>
          <li>❌ 社交媒体追踪像素</li>
        </ul>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          Polis 不使用任何第三方追踪或广告 Cookie。你的浏览行为不会被追踪或分析用于商业目的。
        </p>
      </div>
    ),
  },
  {
    id: 'third-party',
    title: '5. 第三方服务',
    content: (
      <div className="space-y-3">
        <p>为提供平台功能，我们使用了以下第三方服务：</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>区块链节点：</strong>
            钱包绑定和链上交互通过公共或自建区块链节点进行。钱包公钥地址会在链上公开可见
            （这是区块链技术的基本特性，公开地址不关联你的其他个人信息）。
          </li>
          <li>
            <strong>图片 CDN：</strong>
            用户上传的图片等静态资源通过 CDN 分发加速，CDN 提供商仅处理静态文件传输。
          </li>
          <li>
            <strong>邮件服务：</strong>
            系统通知邮件（如密码重置）通过第三方邮件服务发送，我们仅向邮件服务商传输
            收件地址和邮件内容本身。
          </li>
        </ul>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          我们仅与符合数据保护要求的第三方服务合作，且仅传输实现功能所必需的最小数据量。
        </p>
      </div>
    ),
  },
  {
    id: 'security',
    title: '6. 数据安全',
    content: (
      <div className="space-y-3">
        <p>我们采取多层次安全措施保护你的数据：</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>密码加密：</strong>
            用户密码使用 Argon2 算法哈希存储（目前公认最安全的密码哈希算法之一），
            平台任何人员均无法获知你的明文密码。
          </li>
          <li>
            <strong>传输加密：</strong>
            所有数据传输通过 HTTPS/TLS 加密，防止中间人攻击。
          </li>
          <li>
            <strong>Token 安全：</strong>
            JWT Token 包含过期时间和签名验证，支持 Refresh Token 机制和
            JTI 黑名单撤销。
          </li>
          <li>
            <strong>访问控制：</strong>
            基于角色的访问控制（RBAC），API 限流防护，CORS 策略限制。
          </li>
          <li>
            <strong>钱包安全：</strong>
            钱包私钥数据（如有存储）使用 AES-256-GCM 加密，密钥不落盘。
          </li>
          <li>
            <strong>输入安全：</strong>
            前端使用 DOMPurify 防范 XSS 攻击，后端参数化查询防范 SQL 注入。
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'rights',
    title: '7. 用户权利',
    content: (
      <div className="space-y-3">
        <p>
          根据《中华人民共和国个人信息保护法》（个保法）和欧盟《通用数据保护条例》（GDPR），
          你享有以下权利：
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>访问权：</strong>
            你可以随时查看你的个人资料和发布的内容。通过设置页面和
            <Link href="/export" className="text-primary-500 hover:text-primary-600 underline mx-1">
              数据导出
            </Link>
            功能获取完整数据。
          </li>
          <li>
            <strong>数据导出权：</strong>
            你可以导出你的所有数据（包括帖子、评论、个人资料），支持 Markdown + JSON 格式。
          </li>
          <li>
            <strong>更正权：</strong>
            你可以随时在设置页面修改你的显示名称、头像、个人简介等信息。
          </li>
          <li>
            <strong>删除权（被遗忘权）：</strong>
            你可以删除你创建的作品和评论。如需彻底删除账户及所有关联数据，请通过下方联系方式
            联系我们，我们将在 30 个工作日内处理。
          </li>
          <li>
            <strong>数据可携带权：</strong>
            你可以通过数据导出功能将你的数据迁移到其他平台。
          </li>
          <li>
            <strong>撤回同意权：</strong>
            你可以在设置中管理通知偏好、取消推送订阅、断开钱包绑定。
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'minors',
    title: '8. 未成年人保护',
    content: (
      <div className="space-y-3">
        <p>
          根据《中华人民共和国未成年人保护法》和《儿童个人信息网络保护规定》：
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Polis 平台<strong>不面向 14 周岁以下</strong>的未成年人提供服务。
          </li>
          <li>
            14 周岁以上未满 18 周岁的用户，建议在监护人指导下使用本平台。
          </li>
          <li>
            如果我们发现无意中收集了 14 周岁以下儿童的个人信息，将立即删除相关数据。
          </li>
          <li>
            监护人如发现被监护人未经同意向我们提供了个人信息，请通过下方联系方式联系我们。
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'updates',
    title: '9. 政策更新',
    content: (
      <div className="space-y-3">
        <p>
          我们可能会不时更新本隐私政策。当政策发生重大变更时，我们将通过以下方式通知你：
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>在平台上发布醒目的公告通知。</li>
          <li>通过注册邮箱发送政策更新通知。</li>
          <li>更新本页面顶部的"最后更新"日期。</li>
        </ul>
        <p>
          重大变更包括但不限于：收集新的数据类型、将数据用于新的目的、向新的第三方分享数据等。
          继续使用我们的服务即表示你同意更新后的隐私政策。
        </p>
      </div>
    ),
  },
  {
    id: 'contact',
    title: '10. 联系方式',
    content: (
      <div className="space-y-3">
        <p>如你对本隐私政策有任何疑问、建议或投诉，请通过以下方式联系我们：</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>电子邮箱：</strong>
            <a href="mailto:admin@mzgw.com" className="text-primary-500 hover:text-primary-600 underline ml-1">
              admin@mzgw.com
            </a>
          </li>
          <li>
            <strong>网站：</strong>
            <a href="https://www.mzgw.com" className="text-primary-500 hover:text-primary-600 underline ml-1">
              www.mzgw.com
            </a>
          </li>
        </ul>
        <p>我们将在收到请求后 15 个工作日内回复处理。</p>
      </div>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 md:py-16">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-3">
            隐私政策
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            最后更新日期：2026 年 6 月 17 日 &nbsp;|&nbsp; 生效日期：2026 年 6 月 17 日
          </p>
        </div>

        {/* Intro */}
        <div className="mb-10 p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Polis 平台（以下简称"我们"）深知个人信息对你的重要性。本隐私政策旨在清晰、透明地向你说明：
            我们收集哪些信息、如何使用这些信息、如何保护你的数据，以及你享有的权利。
            使用 Polis 平台即表示你同意本隐私政策的内容。
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.id} id={section.id}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                {section.title}
              </h2>
              <div className="text-gray-700 dark:text-gray-300 leading-relaxed text-[15px]">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <p className="text-gray-400 dark:text-gray-500">
              &copy; 2026 Polis Platform. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/about" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                关于 Polis
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                服务条款
              </Link>
              <Link href="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                首页
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
