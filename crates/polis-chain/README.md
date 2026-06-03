# Polis Chain

**Polis Chain** 是 Polis 去中心化社交平台的独立区块链。它不是又一个通用 L1，而是一条**专为社交数据主权和经济激励设计的应用链 (Appchain)**。

代币符号: **$POL** | 链 ID: `polis-mainnet-1` | 共识: Istanbul BFT (IBFT) | 出块时间: 10s

---

## 引言：为什么社交网络需要一条链？

现代社交平台的核心矛盾是：**用户创造价值，平台捕获价值**。你发帖、互动、创作内容，产生的数据和社交资本被中心化公司垄断。你的身份和数据不属于你 — 它们属于运营数据库的实体。

Polis Chain 解决这个问题的路径不是"把社交数据全部上链"（那既不经济也不必要），而是设计了一条**锚定链 (Anchor Chain)**：

```
用户行为 → 本地 Polis 站点 → ActivityProof → Polis Chain → XP/代币/稀有币
                                  ↑                         ↑
                          密码学签名证明              不可篡改的经济记录
```

**链不存储你的帖子内容**，它只存储：
- **行为证明 (ActivityProof)** — 你在某个站点做了什么，赚了多少 XP
- **经济状态** — 你的 $POL 余额、稀有币、挖矿票
- **社区信任** — 站点的信誉分、验证者的质押

这类似于现实世界：银行不记录你的每一句话，但记录你的每一笔交易。Polis Chain 是社交世界的银行层。

核心设计原则：

| 原则 | 含义 |
|------|------|
| **锚定而非存储** | 链存证明不存内容，保持轻量和高性能 |
| **经济激励社交** | 有意义的社交行为通过 XP → 代币获得经济回报 |
| **社区自治** | 站点信誉、验证者选举、大奖池均由链上规则治理 |
| **门限不封顶** | 代币供应无上限，只要参与就有奖励，不设硬顶 |
| **应用链一体化** | 挖矿、奖池、信誉共用一条链，不依赖外部智能合约 |

---

## 系统架构

```
┌──────────────────────────────────────────────────────────────────┐
│                         Polis 社区站点                            │
│  发帖 · 评论 · 关注 · 打赏 · 投票 · 知识库 · 系列 · 小说          │
└──────────────────────────────┬───────────────────────────────────┘
                               │ ActivityProof (HTTP)
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Polis Chain 节点                             │
│                                                                  │
│  ┌─────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │   HTTP API      │  │  P2P 网络层     │  │  IBFT 共识引擎    │  │
│  │   :8545         │  │  libp2p :9732  │  │  PoA + 投票       │  │
│  └────────┬────────┘  └───────┬────────┘  └────────┬─────────┘  │
│           │                   │                     │            │
│           └───────────────────┼─────────────────────┘            │
│                               │                                  │
│  ┌────────────────────────────┼──────────────────────────────┐  │
│  │                    ConsensusBridge                         │  │
│  │            P2P 事件 ←→ 共识引擎 事件驱动胶水层              │  │
│  └────────────────────────────┼──────────────────────────────┘  │
│                               │                                  │
│  ┌──────────────┬─────────────┼─────────────┬────────────────┐  │
│  │  Mempool     │  挖矿引擎    │  大奖池      │  安全模块       │  │
│  │  交易排序    │  Proof-of-   │  炼金机制    │  罚没+信誉      │  │
│  │  去重+防重放 │  Luck 抽奖   │  稀有币铸造  │  +站点注册      │  │
│  └──────────────┴─────────────┼─────────────┴────────────────┘  │
│                               │                                  │
│  ┌────────────────────────────┼──────────────────────────────┐  │
│  │                    RocksDB 存储层 (11 列族)                 │  │
│  │  Blocks │ Txs │ State │ Activities │ Mining │ Pool │ ...  │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 四大子系统

| 子系统 | 职责 | 类比 |
|--------|------|------|
| **共识网络** | IBFT 多节点达成区块一致 | 议会投票 |
| **经济体系** | 代币发行、XP 积累、挖矿抽奖、奖池炼金 | 央行 + 彩票 + 金库 |
| **安全治理** | 验证者罚没、站点信誉、行为异常检测 | 法院 + 信用评级 |
| **锚定证明** | 接收站点 ActivityProof，写入不可篡改链 | 公证处 |

---

## 代币经济 ($POL)

### 设计哲学

传统区块链代币经济学通常设定硬顶（如比特币 2100 万），制造稀缺性预期。Polis 走的是另一条路：**激励持续参与，而非投机囤积**。

$POL 没有总供应上限。只要用户在 Polis 社区中持续创造有价值的内容和互动，系统就持续产出代币。代币是**行为证明的副产品**，不是稀缺投机的标的物。

### 代币流转全景

```
                     ┌──────────────────┐
                     │   挖矿奖励        │
                     │   40 $POL/小时    │
                     │   3 名中奖者      │
                     └────────┬─────────┘
                              │
                              ▼
    ┌─────────┐        ┌──────────┐       ┌──────────┐
    │  发帖    │──XP──→│  用户账户  │──$POL─→│  大奖池   │
    │  评论    │        │  (余额)    │       │  (众筹)   │
    │  关注    │        └──────────┘       └────┬─────┘
    │  打赏    │                                │
    │  投票    │                         满 100,000 $POL
    │  创作    │                                │
    └─────────┘                                ▼
                              ┌──────────────────────────┐
                              │       炼金 (Alchemy)       │
                              │  100,000 $POL 销毁         │
                              │  铸造: 1 金 + 2 银 + 3 铜   │
                              │  按存款权重加权抽奖          │
                              └──────────────────────────┘
```

### 经济参数一览

| 参数 | 值 | 说明 |
|------|-----|------|
| 出块间隔 | 10 秒 | 360 块/小时 |
| 挖矿轮次 | 1 小时 | 每 360 块结算一次 |
| 每轮奖励 | 40 $POL | 分配: 50% / 30% / 20% |
| 中奖人数 | 3 人 | 加权随机抽选 |
| 购票成本 | 1 XP = 1 ticket | 买入即销毁 XP |
| 单人限购 | 10 tickets/轮 | 防止垄断 |
| 大奖池目标 | 100,000 $POL | 触发炼金 |
| 炼金奖励 | 1 金 + 2 银 + 3 铜 | 链上唯一稀有币 |

### XP 系统

XP (Experience Points) 是 Polis 的核心创新 — 它是**社交价值的量化标尺**：

```
行为 → XP 值:
  发帖     = 10 XP
  评论     = 5 XP
  关注     = 2 XP
  打赏     = 20 XP
  投票     = 3 XP
  知识库   = 15 XP
  创作系列 = 25 XP
```

XP 有三个用途：
1. **兑换挖矿票** — 1 XP = 1 ticket，消耗后销毁
2. **信誉计算** — XP 曲线的稳定性是站点信誉的输入
3. **用户等级** — 累计 XP 等级影响社区权重

XP 不能被直接购买 — 只能通过真实的社交行为获得。这是 Polis 反女巫攻击的第一道防线。

---

## IBFT 共识机制

### 为什么选 IBFT？

Polis 采用 **Istanbul BFT (IBFT)**，它是 PBFT 的一种优化变体，专为**许可性 PoA (Proof of Authority) 网络**设计。选择 IBFT 而非 PoW/PoS 的理由：

| 考量 | PoW | PoS | IBFT (PoA) |
|------|-----|-----|------------|
| 能耗 | 极高 | 低 | 极低 |
| 终局性 | 概率性 | 概率性 | 即时终局 (instant finality) |
| 分叉 | 可能 | 可能 | 不存在 |
| 吞吐量 | 低 | 中 | 高 |
| 女巫抵抗 | 算力 | 质押 | 身份+信誉 |
| 适合应用链 | ❌ | 部分 | ✅ |

IBFT 的即时终局性意味着：一旦区块被 2/3 验证者确认，它就永远存在，不会回滚。这对社交数据的经济记录至关重要 — 你不想你的 XP 或代币因为分叉而消失。

### 共识流程

```
轮次 0 开始 (height=N, round=0)
        │
        ▼
┌─────────────────┐
│  Proposer =      │  提议者 = validators[(height + round) % N]
│  validators[轮换] │  N = 活跃验证者数量
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Proposer: 构建区块 → seal() → 广播 PrePrepare               │
│  非 Proposer: 启动超时定时器 (10s)，等待 PrePrepare           │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼  收到 PrePrepare
┌─────────────────┐
│  验证:            │
│  · 提议者是否正确 │  ← 验证阶段 (verify_proposal)
│  · 哈希是否匹配   │
│  · 高度是否一致   │
│  · 不违反锁定规则 │
└────────┬────────┘
         │
         ▼  验证通过
┌─────────────────┐
│  广播 Prepare    │  每个验证者用 Ed25519 私钥签名 block_hash
│  + 自我投票      │  → 投票附带 CommitSeal {validator, signature}
└────────┬────────┘
         │
         ▼  收集到 2/3+ Prepare?
┌─────────────────┐
│  锁定区块        │  locked_block = (round, block_hash)
│  广播 Commit     │  防止未来轮次提出冲突区块
└────────┬────────┘
         │
         ▼  收集到 2/3+ Commit?
┌─────────────────┐
│  最终确定区块     │  finalize_block():
│  写入 RocksDB    │  · 区块 + 交易持久化
│  推进 height++   │  · 清理 mempool
│  重置 round=0    │  · 广播 BlockAnnouncement
└────────┬────────┘
         │
         ▼
    下一个高度 (height=N+1)

超时处理:
  Idle/PrePrepared/Prepared 阶段超时
  → round++ → RoundChange 广播
  → start_new_round() → 回到 Idle
  → 新轮次新提议者
```

### 法定人数

```
quorum = ⌊2 × N_active / 3⌋ + 1

示例:
  1 个验证者 → quorum = 1 (自我投票即可)
  3 个验证者 → quorum = 3 (全票通过)
  4 个验证者 → quorum = 3 (可容忍 1 个宕机)
  7 个验证者 → quorum = 5 (可容忍 2 个拜占庭)
```
这严格满足拜占庭容错条件：`N ≥ 3f + 1`，其中 `f` 是可容忍的恶意节点数。

### 验证者管理

- 最大 21 个验证者
- 最低质押: 1,000 $POL
- 信誉低于 30 的验证者自动停用
- 提议者轮换: round-robin `(height + round) % N`
- 验证者集合存储在 RocksDB 中，重启时恢复

---

## P2P 网络层

基于 **libp2p** 构建，复用 Rust 生态中最成熟的对等网络栈。

### 协议栈

```
┌─────────────────────────────┐
│         应用层消息            │
│  Consensus / Tx / Block     │
├─────────────────────────────┤
│  Gossipsub (pub/sub 广播)    │
│  Request-Response (点对点)   │
├─────────────────────────────┤
│  Kademlia DHT (WAN 发现)     │
│  mDNS (LAN 自动发现)         │
│  Identify (节点信息交换)      │
│  Ping (连接健康检查)          │
├─────────────────────────────┤
│  Yamux (流多路复用)           │
│  Noise XX (加密+认证)        │
│  TCP (可靠传输)               │
└─────────────────────────────┘
```

### 三个 Gossipsub 频道

| 频道 | 消息类型 | 用途 |
|------|----------|------|
| `{chain_id}/consensus/1.0.0` | PrePrepare, Prepare, Commit, RoundChange | IBFT 共识消息 |
| `{chain_id}/transactions/1.0.0` | SignedTransaction | 交易全网广播 |
| `{chain_id}/blocks/1.0.0` | BlockAnnouncement | 新区块通知 |

### 节点发现

- **局域网**: mDNS 自动发现同网络内的 Polis 节点，无需手动配置
- **广域网**: Kademlia DHT 维护分布式路由表，通过 bootstrap 节点加入网络
- **持久化**: 已知对等点定期写入，重启后恢复连接

### 区块同步

新节点或落后节点启动时：

1. 收到 BlockAnnouncement → 检测到本地区块落后
2. 通过 Request-Response 协议请求缺失区块区间
3. 乱序到达的区块进入 BTreeMap 缓冲区
4. 验证 prev_hash 连续性 + 默克尔根 + 提交签名
5. 按序写入 RocksDB

这是一个**推拉结合**的同步模型：公告推动同步，请求拉取数据。

---

## 社区 — 链上交互体系

### 社区的锚定模型

Polis 平台上的每个社区站点通过 **site_id** 在链上注册。之后，该站点上发生的每一次有价值的用户行为，都会产生一条 **ActivityProof** 发送到 Polis Chain：

```
用户在站点发帖
    │
    ▼
站点后端生成 ActivityProof {
    site_id:       "站点唯一标识",
    user_ref:      "用户去中心化标识",
    action_type:   "post | comment | follow | tip | vote | ...",
    target_ref:    "目标作品引用",
    xp_value:      10,
    timestamp:     当前时间,
    nonce:         防重放序列号,
}
    │
    ▼
站点使用自己的 Ed25519 签名密钥签名 ActivityProof
    │
    ▼
发送到 Polis Chain HTTP API: POST /api/v1/activities
    │
    ▼
链节点:
  1. 验证站点签名
  2. 验证 site_id 已注册且未被停用
  3. 检查用户 XP 获取频率 (反女巫)
  4. 构建 ActivityProof 交易 → 进入 mempool
  5. 下一个区块打包这笔交易
  6. 用户链上 XP 增加
```

### 为什么要这样设计？

**不存内容，存档证明 (Proof, not Content)**：

- **隐私**: 用户的内容在自己选择的站点上，链上看不到
- **可移植**: 用户换站点，XP 和代币跟着走 — 社交资本是可携带的
- **可审计**: 任何第三方可以验证 "用户 A 在站点 B 上有 5000 XP" 是真实的，不需要信任站点 B
- **抗审查**: 即使站点消失，用户的链上资产不受影响

### 站点注册与信誉

```
站点注册:
  POST /api/v1/sites/register
  → site_id = SHA-256(domain)
  → 初始信誉 = 100
  → 存储到 RocksDB，可被全网查询

站点信誉评分:
  · 用户多样性 (25分): 活跃用户分布的熵值
  · 行为质量 (30分): 内容长度、复杂度、时间分布
  · 历史一致性 (20分): CUSUM 突变检测
  · 链上承诺 (25分): 质押金额和时长

信誉等级:
  铂金 (90+) → XP 乘数 1.0x
  黄金 (70-89) → XP 乘数 0.9x
  白银 (50-69) → XP 乘数 0.75x
  青铜 (30-49) → XP 乘数 0.5x
  标记 (0-29) → 停用，产生的 XP 无效
```

这意味着：**低质量站点产生的 XP 会贬值**。这是用经济手段治理社区质量，而非中心化审核。

---

## 钱包体系

Polis Chain 使用 **Ed25519** 椭圆曲线进行密钥管理，地址格式为 `0xPOL_` + SHA-256(公钥)[:20] 的十六进制编码。

### 安全设计

```
密钥生成:
  OsRng (操作系统随机源) → Ed25519 SigningKey (32 bytes)
  → VerifyingKey → SHA-256 → [:20] → 0xPOL_xxxxxxxx

密钥存储:
  用户密码 → Argon2(password, salt, memory=4096, ops=3)
  → 派生 32-byte 加密密钥
  → 私钥 XOR 加密密钥 → 十六进制编码 → 写入文件

  文件路径: ~/.polis-chain/keys/wallet.key
  文件权限: 仅当前用户可读
```

**没有助记词 (BIP39)**。Polis Chain 的钱包设计是**极简化的密钥管理**，面向的是社交用户而非加密交易者。密钥是一段 64 字符的十六进制码，可以直接复制保存。

### CLI 钱包操作

```bash
# 创建身份
polis-chain wallet create --password "你的密码"
# 输出: 钱包地址: 0xPOL_a1b2c3...

# 查看资产
polis-chain wallet show --password "你的密码"
# 输出: 余额、XP、可用 XP、稀有币列表

# 转账 $POL
polis-chain wallet transfer \
  --password "你的密码" \
  --to "0xPOL_recipient..." \
  --amount 100 \
  --memo "打赏你的好文章"

# 签名验证
polis-chain wallet sign --password "你的密码" --message "hello polis"
# 输出: Ed25519 签名 (128 字符十六进制)

# 导入导出
polis-chain wallet export --password "你的密码"
polis-chain wallet import --password "你的密码" --key-hex "..."
```

### 节点内钱包

启动 Polis Chain 节点时，系统会自动生成 `node.key`（P2P 身份密钥）和（如果是创世验证者）`validator.key`：

```
~/.polis-chain/
├── keys/
│   ├── node.key        # P2P libp2p 身份密钥 (自动生成)
│   ├── validator.key   # 验证者签名密钥 (创世时生成)
│   └── wallet.key      # 用户钱包 (手动创建)
├── data/               # RocksDB 数据
└── logs/               # 日志文件
```

---

## 大奖池与炼金 (Alchemy)

### 机制设计

大奖池是 Polis Chain 最特殊的机制 — 它把**代币通缩**和**游戏化抽奖**结合在一起。

```
流程:
  1. 用户将 $POL 存入奖池 → POST /api/v1/pool/deposit
  2. 奖池余额 + 存款金额，deposited_count++
  3. 当前余额 ≥ 100,000 $POL?
      否 → 继续累积
      是 → 触发炼金

炼金过程:
  4. 100,000 $POL 从奖池销毁 (通缩)
  5. 按存款权重加权抽奖:
     · 存款越多 → 中奖概率越大
     · 之前未中过奖的存款人优先 (流动性因子)
  6. 产生奖品:
     · 1 枚 金币 (GOLD-0001)
     · 2 枚 银币 (SILVER-0001, SILVER-0002)
     · 3 枚 铜币 (BRONZE-0001, BRONZE-0002, BRONZE-0003)
  7. 稀有币写入中奖者账户 (premium_coins)
  8. 奖池重置 → 下一个 100,000 的累积
  9. 整个过程写入区块 → 永久可查
```

### 为什么叫"炼金"？

中世纪炼金术追求将贱金属转化为黄金。Polis 的炼金将普通 $POL 代币转化为稀有币：
- **物质转换**: 100,000 个同质化代币 → 6 个非同质化稀有币
- **价值浓缩**: 数量减少，独特性增加
- **永久记录**: 每枚稀有币的铸造历史、所有者链，全部在链上不可篡改

### 稀有币

```
PremiumCoin:
  coin_id:        "GOLD-0003"
  coin_type:      Gold | Silver | Bronze
  serial_number:  全局递增编号
  pool_id:        产生此币的炼金池 ID
  winner_address: 中奖者地址
  minted_at_block:铸造区块高度
  previous_owner: 前任所有者 (如被转让)
```

稀有币可以转让、展示在用户个人页面上，作为社区地位的象征。它不是通过购买获得的 — 只能通过参与大奖池的炼金抽奖获得。

---

## 挖矿系统 (Proof-of-Luck)

### 为什么不是 PoW 挖矿？

传统 PoW 挖矿消耗的是电力和算力，产生的价值与社交生态系统完全无关。Polis 的"挖矿"是一个比喻 — 实际上是一个**基于 XP 的门限抽奖系统**，其哲学内核是：

> **运气是社交参与的随机红利，不是算力竞赛的副产品。**

### 机制

```
每 1 小时 = 1 个挖矿轮次 (360 个区块)

轮次结构:
  round_id = current_timestamp / 3600
  start_time = round_id × 3600
  end_time = start_time + 3600
  total_reward = 40 $POL

购票:
  · 1 XP = 1 ticket (XP 被销毁)
  · 每人每轮最多 10 ticket
  · ticket 越多 → 中奖概率越高

开奖 (settle_round):
  · 种子 = SHA-256(prev_block_hash || round_id || timestamp || tickets_root)
  · 使用种子 + 计数器扩展随机性 → SHA-256(seed || counter)
  · Fisher-Yates 无放回抽取
  · 选出 3 名中奖者
  · 第 1 名: 20 $POL (50%), 第 2 名: 12 $POL (30%), 第 3 名: 8 $POL (20%)

确定性:
  · 相同种子 → 完全相同的抽奖结果
  · 任何节点都可以独立验证
  · 防止矿工操纵
```

### 与大奖池的关系

```
挖矿:         持续产出 40 $POL/小时
              ↓
用户获得 $POL ─→ 可以选择存入奖池
              ↓
大奖池:       累积到 100,000 $POL 触发炼金
              ↓
炼金:         铸造 6 枚稀有币 (1 金 2 银 3 铜)
```

挖矿产出代币 → 代币流入奖池 → 奖池触发炼金 → 产生稀有币。这是一个**自我循环的游戏化经济**。

---

## 安全机制

### 罚没引擎 (Slashing)

针对恶意行为的链上惩罚系统：

| 违规行为 | 严重级别 | 信誉扣除 | 暂停 | 黑名单 |
|----------|----------|----------|------|--------|
| XP Farming (刷分) | 轻微 | -8 | 0 天 | 否 |
| Fake Activity (虚假行为) | 中等 | -20 | 7 天 | 否 |
| Content Abuse (内容滥用) | 中等 | -20 | 7 天 | 否 |
| Sybil Attack (女巫攻击) | 严重 | -40 | 30 天 | 否 |
| Consensus Violation (共识违规) | 极严重 | -100 | 永久 | 是 |

### 异常检测

系统自动检测行为异常模式：

- **频率检测**: 单用户单日超过 500 XP → 标记为可疑
- **站点级别检测**: 单站点单日超过 50,000 XP → 触发全站检查
- **突变检测**: CUSUM (Cumulative Sum Control Chart) 算法检测 XP 获取速率的突变
- **时间分布**: 检测行为时间的均匀性 — 真实人类不会精确每隔固定时间做一件事

### 信誉乘数效应

用户信誉直接影响 XP 的**经济价值**：

```
铂金用户 (90+分): 发帖 = 10 XP × 1.0 = 10 XP
黄金用户 (70-89):  发帖 = 10 XP × 0.9 = 9 XP
白银用户 (50-69):  发帖 = 10 XP × 0.75 = 7.5 XP
青铜用户 (30-49):  发帖 = 10 XP × 0.5 = 5 XP
标记用户 (0-29):   发帖 = 10 XP × 0.0 = 0 XP (收益归零)
```

这让刷分行为的经济回报递减 — 一旦被检测到并被降级，之前的努力全部贬值。

---

## 快速开始

### 下载预编译二进制 (推荐)

从 [GitHub Releases](https://github.com/xiyijixiyifula/polis-platform/releases) 下载：

| 平台 | 文件 |
|------|------|
| macOS (Apple Silicon) | `polis-chain-darwin-arm64.tar.gz` |
| Linux (x86_64) | `polis-chain-linux-x86_64.tar.gz` |
| Windows (x86_64) | `polis-chain-windows-x86_64.tar.gz` |

```bash
# macOS
tar -xzf polis-chain-darwin-arm64.tar.gz
sudo mv polis-chain /usr/local/bin/polis-chain

# Linux
tar -xzf polis-chain-linux-x86_64.tar.gz
sudo mv polis-chain /usr/local/bin/polis-chain

# Windows
tar -xzf polis-chain-windows-x86_64.tar.gz
# 将 polis-chain.exe 添加到 PATH
```

### 启动节点

```bash
# 创世节点 (网络中的第一个节点)
export CHAIN_MODE=validator
export CHAIN_IS_GENESIS=true
polis-chain run

# 验证者节点 (加入已有网络)
export CHAIN_MODE=validator
export CHAIN_BOOTSTRAP_NODES="/ip4/对等ip/tcp/9732/p2p/12D3KooW..."
polis-chain run

# 全节点 (同步但不参与共识)
export CHAIN_MODE=full
polis-chain run

# 仅钱包模式 (不同步区块，只管理资产)
export CHAIN_MODE=wallet
polis-chain run
```

### 钱包管理

```bash
# 创建钱包
polis-chain wallet create --password "你的密码"

# 查看钱包 (地址、余额、XP、稀有币)
polis-chain wallet show --password "你的密码"

# 查询余额
polis-chain wallet balance

# 转账
polis-chain wallet transfer \
  --password "你的密码" \
  --to "0xPOL_abcd1234..." \
  --amount 100 \
  --memo "备注信息"

# 导出私钥 (备份)
polis-chain wallet export --password "你的密码"

# 导入私钥 (恢复)
polis-chain wallet import --password "你的密码" --key-hex "导出的十六进制私钥"

# 签名消息
polis-chain wallet sign --password "你的密码" --message "hello polis"
```

---

## API 参考

### 节点与链信息

```bash
# 节点状态
curl http://localhost:8545/api/v1/status
# → { block_height, peer_count, uptime_secs, mode, version, chain_id, sync_status }

# 链配置信息
curl http://localhost:8545/api/v1/chain/info
# → { chain_id, genesis_hash, latest_block, total_supply }

# 已连接对等节点
curl http://localhost:8545/api/v1/peers
```

### 区块

```bash
# 最新 N 个区块
curl "http://localhost:8545/api/v1/blocks?from=0&limit=20"

# 按高度查询
curl http://localhost:8545/api/v1/blocks/42
```

### 交易

```bash
# 提交已签名交易
curl -X POST http://localhost:8545/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{"tx":{...},"signer":"...","signature":"...","hash":"..."}'

# 待处理交易数
curl http://localhost:8545/api/v1/transactions/pending

# 按哈希查交易
curl http://localhost:8545/api/v1/transactions/{hash}
```

### 活动证明 (核心交互)

```bash
# 提交用户行为证明 (站点后端调用)
curl -X POST http://localhost:8545/api/v1/activities \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "a1b2c3...",
    "user_ref": "d4e5f6...",
    "action_type": "post",
    "target_ref": "@creator/community/module/post-title",
    "xp_value": 10,
    "timestamp": 1780473386,
    "signature": "..."
  }'

# 查询用户活动记录
curl http://localhost:8545/api/v1/activities/{user_ref}

# 查询用户 XP 和资产
curl http://localhost:8545/api/v1/activities/{user_ref}/xp
```

### 钱包 API

```bash
# 创建钱包
curl -X POST http://localhost:8545/api/v1/wallet/create

# 查询钱包
curl http://localhost:8545/api/v1/wallet/{address}
```

### 挖矿 API

```bash
# 当前轮次
curl http://localhost:8545/api/v1/mining/rounds/current

# 历史轮次
curl http://localhost:8545/api/v1/mining/rounds/{round_id}

# 购买挖矿票
curl -X POST http://localhost:8545/api/v1/mining/tickets \
  -H "Content-Type: application/json" \
  -d '{"user_address":"0xPOL_...","ticket_count":5}'
```

### 大奖池 API

```bash
# 奖池状态
curl http://localhost:8545/api/v1/pool/status
# → { current_amount, target_amount: 100000, progress_percent, top_depositors }

# 存入 $POL
curl -X POST http://localhost:8545/api/v1/pool/deposit \
  -H "Content-Type: application/json" \
  -d '{"from_address":"0xPOL_...","amount":1000}'

# 炼金历史
curl http://localhost:8545/api/v1/pool/history
```

### 站点注册

```bash
# 注册站点
curl -X POST http://localhost:8545/api/v1/sites/register \
  -H "Content-Type: application/json" \
  -d '{"domain":"myblog.polis.me","site_name":"我的博客","admin_address":"0xPOL_..."}'

# 查询站点信息
curl http://localhost:8545/api/v1/sites/{site_id}
```

所有 API 返回统一格式：`{"code": 0, "message": "ok", "data": {...}}`。

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `CHAIN_MODE` | `full` | 节点模式: `validator` / `full` / `wallet` |
| `CHAIN_IS_GENESIS` | `false` | 是否为创世节点 (设为 `true` 或 `1`) |
| `CHAIN_API_HOST` | `127.0.0.1` | HTTP API 监听地址 |
| `CHAIN_API_PORT` | `8545` | HTTP API 端口 |
| `CHAIN_P2P_PORT` | `9732` | P2P libp2p 监听端口 |
| `CHAIN_BOOTSTRAP_NODES` | — | 逗号分隔的 bootstrap 多地址 |
| `CHAIN_DATA_DIR` | `~/.polis-chain` | 数据根目录 |
| `CHAIN_VALIDATOR_ADDRESS` | `node` | 验证者标识名 |
| `CHAIN_NODE_KEY_PATH` | `~/.polis-chain/keys/node.key` | P2P 身份密钥路径 |
| `CHAIN_SITE_ID` | — | 关联的站点 ID (用于 ActivityProof 签名) |
| `CHAIN_SITE_KEY_PATH` | — | 站点签名密钥路径 |
| `CHAIN_BLOCK_TIME` | `10` | 出块间隔 (秒) |
| `CHAIN_ID` | `polis-mainnet-1` | 链 ID (同一网络必须一致) |

---

## 交易类型

Polis Chain 原生支持 9 种交易类型，覆盖社交平台的全部链上需求：

| # | 交易类型 | 发起者 | 用途 |
|---|----------|--------|------|
| 1 | `SiteRegister` | 站点管理员 | 将 Polis 站点注册到链上 |
| 2 | `ActivityProof` | 站点后端 | 用户行为证明 (发帖/评论/关注等) |
| 3 | `MiningTicket` | 用户 | 用 XP 兑换挖矿票 |
| 4 | `MiningReward` | 系统 | 挖矿奖励分配 (系统交易) |
| 5 | `TokenTransfer` | 用户 | $POL 转账 |
| 6 | `PoolDeposit` | 用户 | 向大奖池存入 $POL |
| 7 | `PoolAlchemy` | 系统 | 炼金事件记录 (系统交易) |
| 8 | `ValidatorStake` | 验证者 | 质押成为/增加验证者权重 |
| 9 | `ValidatorUnstake` | 验证者 | 解除质押 |

---

## 从源码构建

```bash
# 前置: Rust 1.78+, Cargo
git clone https://github.com/xiyijixiyifula/polis-platform.git
cd polis-platform

# 本机构建
cargo build --release -p polis-chain

# 运行
./target/release/polis-chain run
```

### 交叉编译 (macOS → Linux/Windows)

```bash
# 安装交叉编译工具链
brew install x86_64-unknown-linux-gnu-binutils mingw-w64
rustup target add x86_64-unknown-linux-gnu x86_64-pc-windows-gnu

# Linux x86_64
cargo build --release -p polis-chain --target x86_64-unknown-linux-gnu

# Windows x86_64
cargo build --release -p polis-chain --target x86_64-pc-windows-gnu
```

---

## 设计哲学

### 1. 锚定链 (Anchor Chain)，非存储链

Polis Chain 不存储用户内容。链是"锚"，社区是"船"。锚提供稳定性和信任根，但船可以自由航行。

### 2. 行为即挖矿 (Behavior-as-Mining)

传统区块链中，挖矿和用户行为是两个独立系统。Polis 将它们统一：你在社区中的每一次有意义的互动，都是在为网络的去中心化和安全性做贡献，并获得经济回报。

### 3. 信誉通证化 (Reputation Tokenization)

信誉不是写在中心化数据库中的抽象数字，而是链上可验证的资产。低信誉 → XP 贬值 → 经济惩罚。高信誉 → XP 增值 → 经济奖励。信誉市场自发调节行为质量。

### 4. 游戏化通缩 (Gamified Deflation)

大奖池炼金机制将代币从流通中移除（销毁 100,000 $POL），同时创造不可替代的稀有资产（稀有币）。这是**自愿通缩** — 用户因为稀有币的独特价值而主动将代币送入销毁池。

### 5. 可携带身份 (Portable Identity)

`user_ref = SHA-256(site_id + ":" + username)` 的设计意味着用户在不同站点上有不同引用，但用户的 $POL 地址是统一的。你拥有你的资产 — 无论你用哪个社区站点。

---

## 许可证

MIT License. 由 Polis Team 开发。
