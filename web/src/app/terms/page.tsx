import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '服务条款',
  description: 'Polis 平台服务条款 — 了解使用 Polis 平台的权利、义务和规则。',
};

const sections = [
  {
    id: 'service',
    title: '1. 服务说明',
    content: (
      <div className="space-y-3">
        <p>
          Polis 平台（以下简称"本平台"或"Polis"，域名为 www.mzgw.com）是一个去中心化的社区创造与管理平台。
          我们提供以下核心服务：
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>社区创建与管理：</strong>用户可自由创建和管理自己的社区空间，自定义模块和权限。</li>
          <li><strong>内容创作与发布：</strong>支持帖子、视频、投票、系列、知识库文章等多种内容形式（统称"作品"）。</li>
          <li><strong>社交互动：</strong>评论、点赞、收藏、关注、私信等社交功能。</li>
          <li><strong>Web3 集成：</strong>钱包绑定、XP 经验值系统、$POL 平台代币奖励等功能。</li>
          <li><strong>会员订阅：</strong>社区创建者可设置会员等级和订阅机制。</li>
        </ul>
        <p>
          本服务条款（以下简称"条款"）构成你与 Polis 平台之间的法律协议。使用本平台即表示你同意本条款的全部内容。
          如果你不同意本条款的任何部分，请停止使用本平台。
        </p>
      </div>
    ),
  },
  {
    id: 'registration',
    title: '2. 用户注册',
    content: (
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">2.1 注册条件</h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>你必须年满 <strong>14 周岁</strong>（根据《中华人民共和国未成年人保护法》）。</li>
          <li>你必须提供一个有效的电子邮箱地址用于账户验证。</li>
          <li>你必须提供真实、准确的注册信息，不得冒充他人。</li>
          <li>每人仅限注册一个账户（除非获得平台明确许可）。</li>
        </ul>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">2.2 账户安全</h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>你对自己账户下的所有活动负责。</li>
          <li>你应妥善保管密码，不得将账户出借或转让给他人。</li>
          <li>如发现账户遭到未授权使用，应立即通过联系方式通知我们。</li>
        </ul>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">2.3 账户终止</h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>你可随时在设置中注销账户。</li>
          <li>我们保留因违反本条款而暂停或终止账户的权利。</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'conduct',
    title: '3. 用户行为规范',
    content: (
      <div className="space-y-3">
        <p>使用本平台时，你同意不会从事以下行为：</p>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">3.1 违法内容</h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>发布违反中华人民共和国法律法规的内容。</li>
          <li>传播煽动颠覆国家政权、分裂国家、破坏国家统一的内容。</li>
          <li>传播恐怖主义、极端主义内容。</li>
          <li>传播淫秽、色情、赌博、暴力内容。</li>
        </ul>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">3.2 有害行为</h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>骚扰、欺凌、威胁、诽谤其他用户。</li>
          <li>基于种族、民族、宗教、性别、性取向、残疾等的歧视或仇恨言论。</li>
          <li>发布虚假、误导性信息或恶意谣言。</li>
          <li>人肉搜索或公开他人隐私信息。</li>
        </ul>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">3.3 滥用行为</h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>发布垃圾信息（spam）、重复内容或恶意广告。</li>
          <li>操纵平台机制（如刷点赞、虚假关注、机器人行为）。</li>
          <li>未经授权访问他人账户或系统数据。</li>
          <li>上传恶意代码、病毒或进行网络攻击。</li>
          <li>对平台服务进行逆向工程、爬取超出合理范围的数据。</li>
        </ul>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">3.4 知识产权侵权</h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>发布侵犯他人著作权、商标权、专利权等知识产权的内容。</li>
          <li>未经许可复制、传播他人的原创作品。</li>
        </ul>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          违反上述行为规范可能导致内容被删除、账户被冻结或永久封禁。我们保留向执法机构报告严重违法行为的权利。
        </p>
      </div>
    ),
  },
  {
    id: 'ownership',
    title: '4. 内容所有权',
    content: (
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">4.1 你的作品，你的权利</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>你保留所有权：</strong>
            你在 Polis 平台上创作的原创内容（作品），其所有权完全归属于你（创作者）。
            Polis 不会主张对你原创内容的所有权。
          </li>
          <li>
            <strong>引用机制：</strong>
            当你将作品发布到某个社区模块时，平台创建的是对作品的"引用"（ModuleRef），
            而非副本。修改原始作品后，所有引用位置会同步更新。
          </li>
        </ul>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">4.2 你授予平台的许可</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            为提供平台服务（展示、分发、搜索你的内容），你授予 Polis 一项<strong>非独占、全球范围、免版税</strong>的许可，
            用于在你的内容存在于平台期间展示和分发这些内容。
          </li>
          <li>
            此许可仅限于平台运营所必需的使用范围，不包括将你的内容用于 AI 训练、出售给第三方等目的。
          </li>
          <li>
            当你删除内容时，此许可随即终止（合理保留的备份副本除外）。
          </li>
        </ul>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">4.3 你对他人的责任</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>你声明并保证你发布的内容不侵犯任何第三方的权利。</li>
          <li>你对你发布的所有内容承担全部法律责任。</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'ip',
    title: '5. 知识产权保护',
    content: (
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">5.1 平台知识产权</h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Polis 平台的名称、Logo、界面设计、源代码（开源协议除外）属于平台的知识产权。</li>
          <li>Polis 后端核心代码以开源协议发布（详见项目仓库 LICENSE 文件）。</li>
        </ul>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">5.2 侵权投诉（DMCA / 中文通知删除）</h3>
        <p>如果你认为平台上的内容侵犯了你的知识产权，请发送包含以下信息的书面通知至 admin@mzgw.com：</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>被侵权作品的描述及其原始发布位置。</li>
          <li>涉嫌侵权内容在平台上的具体 URL。</li>
          <li>你的联系方式（姓名、地址、电话、邮箱）。</li>
          <li>善意声明：你确信该使用未经权利人授权。</li>
          <li>准确性声明：通知中的信息是准确的，你是权利人本人或经权利人授权。</li>
          <li>你的电子或亲笔签名。</li>
        </ul>
        <p>我们在收到符合条件的侵权通知后，将在合理时间内处理并可能移除相关内容。</p>
      </div>
    ),
  },
  {
    id: 'token',
    title: '6. 代币相关声明',
    content: (
      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-4">
          <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
            ⚠️ 重要声明：以下内容涉及 $POL 平台代币，请仔细阅读。
          </p>
        </div>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>$POL 是平台实用代币：</strong>
            $POL 代币是 Polis 平台生态内的实用代币（Utility Token），用于社区治理、
            会员订阅、内容激励等平台内场景。$POL <strong>不是</strong>证券、投资产品或金融工具。
          </li>
          <li>
            <strong>不保证价值：</strong>
            $POL 代币的价值取决于平台生态的发展和市场供需，平台<strong>不承诺</strong> $POL 代币
            的任何价格、价值回报或投资收益。
          </li>
          <li>
            <strong>非投资建议：</strong>
            平台上的任何内容均不构成投资建议。获取 $POL 代币（通过 XP 挖矿或平台分发）
            不应被视为投资行为。
          </li>
          <li>
            <strong>风险自担：</strong>
            你理解并接受与区块链技术和加密代币相关的所有风险，包括但不限于市场波动、
            技术漏洞、监管政策变化等。
          </li>
          <li>
            <strong>合规声明：</strong>
            $POL 代币在中华人民共和国境内仅作为平台内虚拟积分使用，不涉及法币兑换、
            不得用于非法交易、不得炒作投机。
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'termination',
    title: '7. 服务变更与终止',
    content: (
      <div className="space-y-3">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>服务变更：</strong>
            我们保留随时修改、暂停或终止部分或全部服务的权利。对于重大变更，
            我们将提前通过平台公告或邮件通知你。
          </li>
          <li>
            <strong>账户终止：</strong>
            我们可在以下情况下终止你的账户：(a) 违反本条款；(b) 应法律或执法机构要求；
            (c) 长期不活跃账户；(d) 平台业务调整需要。
          </li>
          <li>
            <strong>你的权利：</strong>
            你可以在服务终止前导出你的数据。服务终止不影响已经产生的权利义务。
          </li>
          <li>
            <strong>数据保留：</strong>
            账户终止后，你的公开内容可能因已备份或已被其他用户引用而保留副本。
            我们将在合理时间内清理你的个人数据。
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'disclaimer',
    title: '8. 免责声明',
    content: (
      <div className="space-y-3">
        <p>本平台按"现状"（AS IS）提供，不作任何明示或默示的保证：</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>我们不保证服务不中断、及时、安全或没有错误。</li>
          <li>我们不保证平台内容的准确性、完整性或可靠性（用户生成内容不代表平台立场）。</li>
          <li>我们不保证通过平台获得的任何产品、服务或信息符合你的期望。</li>
          <li>对于因不可抗力（自然灾害、战争、网络攻击、政府行为等）导致的服务中断，我们不承担责任。</li>
          <li>第三方链接内容由第三方负责，我们不对其内容或隐私实践负责。</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'liability',
    title: '9. 责任限制',
    content: (
      <div className="space-y-3">
        <p>在法律允许的最大范围内：</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Polis 平台及其运营方对你使用或无法使用本平台所产生的任何<strong>间接、附带、特殊、惩罚性或结果性损害</strong>
            不承担责任，包括但不限于利润损失、数据丢失、商誉损失等。
          </li>
          <li>
            在任何情况下，Polis 平台对你承担的总责任金额<strong>不超过</strong>你在责任事件发生前 12 个月内
            向平台支付的金额（如适用），或 1000 元人民币（以较高者为准）。
          </li>
          <li>
            上述责任限制不适用于因平台故意或重大过失造成的人身伤害或法律不允许限制的责任。
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'law',
    title: '10. 管辖法律',
    content: (
      <div className="space-y-3">
        <p>本条款的订立、解释、执行和争议解决适用<strong>中华人民共和国法律</strong>。</p>
        <p>
          如果本条款的任何部分被有管辖权的法院认定为无效或不可执行，该部分应被限制或消除至最小必要范围，
          条款的其余部分将继续完全有效。
        </p>
      </div>
    ),
  },
  {
    id: 'dispute',
    title: '11. 争议解决',
    content: (
      <div className="space-y-3">
        <p>我们希望通过友好协商解决与用户的争议：</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>优先协商：</strong>
            发生争议时，双方应首先通过友好协商解决。请通过下方联系方式与我们联系。
          </li>
          <li>
            <strong>调解/仲裁：</strong>
            协商不成的，任何一方可将争议提交至平台运营方所在地有管辖权的仲裁委员会
            按照其仲裁规则进行仲裁。仲裁裁决是终局的，对双方均有约束力。
          </li>
          <li>
            <strong>诉讼：</strong>
            如仲裁条款不适用，双方同意由平台运营方所在地有管辖权的人民法院管辖。
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'contact',
    title: '12. 联系方式',
    content: (
      <div className="space-y-3">
        <p>如你对本服务条款有任何疑问、建议或投诉，请通过以下方式联系我们：</p>
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

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 md:py-16">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-3">
            服务条款
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            最后更新日期：2026 年 6 月 17 日 &nbsp;|&nbsp; 生效日期：2026 年 6 月 17 日
          </p>
        </div>

        {/* Intro */}
        <div className="mb-10 p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            欢迎使用 Polis 平台。本服务条款是你与 Polis 平台（域名为 www.mzgw.com）之间的法律协议。
            请在使用平台前仔细阅读本条款。使用 Polis 平台即表示你已阅读、理解并同意受本条款的约束。
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
              <Link href="/privacy" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                隐私政策
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
