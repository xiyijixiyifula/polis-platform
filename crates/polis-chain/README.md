# Polis Chain

**Polis Chain** 是 Polis 去中心化社交平台的独立区块链节点，基于 **PoA + IBFT 共识**。

代币符号: **$POL** | 链 ID: `polis-mainnet-1` | 共识: Istanbul BFT (IBFT) | 出块时间: 10s

---

## 快速开始

### 下载二进制 (推荐)

从 [GitHub Releases](https://github.com/xiyijixiyifula/polis-platform/releases) 下载对应平台的二进制文件：

| 平台 | 文件 | 状态 |
|------|------|------|
| macOS (Apple Silicon) | `polis-chain-darwin-arm64.tar.gz` | 预编译 |
| Linux (x86_64) | `polis-chain-linux-x86_64.tar.gz` | 预编译 |
| Windows (x86_64) | `polis-chain-windows-x86_64.tar.gz` | 预编译 |

```bash
# macOS (Apple Silicon)
tar -xzf polis-chain-darwin-arm64.tar.gz
sudo mv polis-chain /usr/local/bin/polis-chain

# Linux (x86_64)
tar -xzf polis-chain-linux-x86_64.tar.gz
sudo mv polis-chain /usr/local/bin/polis-chain

# Windows (x86_64)
tar -xzf polis-chain-windows-x86_64.tar.gz
# 将 polis-chain.exe 添加到 PATH
```

### 启动节点

```bash
# 创世节点 (第一个启动的验证者)
export CHAIN_MODE=validator
export CHAIN_IS_GENESIS=true
polis-chain run

# 验证者节点 (加入已有网络)
export CHAIN_MODE=validator
export CHAIN_BOOTSTRAP_NODES="/ip4/1.2.3.4/tcp/9732/p2p/12D3KooW..."
polis-chain run

# 全节点 (同步但不参与出块)
export CHAIN_MODE=full
polis-chain run
```

### 钱包管理

```bash
# 创建钱包
polis-chain wallet create --password "your-password"

# 查看钱包信息
polis-chain wallet show --password "your-password"

# 查询余额
polis-chain wallet balance

# 转账 $POL
polis-chain wallet transfer --password "your-password" \
  --to "0xPOL_abcd1234..." \
  --amount 100

# 导出/导入私钥
polis-chain wallet export --password "your-password"
polis-chain wallet import --password "your-password" --key-hex "..."
```

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `CHAIN_MODE` | `full` | 节点模式: `validator` / `full` / `wallet` |
| `CHAIN_IS_GENESIS` | `false` | 是否为创世节点 |
| `CHAIN_API_HOST` | `127.0.0.1` | HTTP API 监听地址 |
| `CHAIN_API_PORT` | `8545` | HTTP API 端口 |
| `CHAIN_P2P_PORT` | `9732` | P2P 网络端口 |
| `CHAIN_BOOTSTRAP_NODES` | — | Bootstrap 节点 (逗号分隔) |
| `CHAIN_DATA_DIR` | `~/.polis-chain` | 数据目录 |
| `CHAIN_VALIDATOR_ADDRESS` | `node` | 验证者地址标识 |
| `CHAIN_NODE_KEY_PATH` | `~/.polis-chain/keys/node.key` | P2P 节点身份密钥路径 |
| `CHAIN_BLOCK_TIME` | `10` | 出块间隔 (秒) |
| `DATABASE_URL` | — | RocksDB 无需此配置 (文件存储) |

---

## 架构

```
┌──────────────────────────────────────────────┐
│                  HTTP API (:8545)              │
│  /api/v1/status, /blocks, /transactions, ...  │
├──────────────────────────────────────────────┤
│              ConsensusBridge                   │
│         P2P 事件 ← → IBFT 共识引擎             │
├──────────────┬────────────────────────────────┤
│  P2P 网络     │  核心组件                       │
│  - libp2p    │  - IbftEngine (PBFT变种)         │
│  - Gossipsub │  - Mempool (交易池)              │
│  - Kademlia  │  - ValidatorSet (验证者管理)     │
│  - mDNS      │  - BlockSynchronizer (区块同步)  │
├──────────────┴────────────────────────────────┤
│              RocksDB 存储层                     │
│  CF_BLOCKS | CF_TRANSACTIONS | CF_ACCOUNTS     │
│  CF_VALIDATORS | CF_POOL_STATE | ...           │
└──────────────────────────────────────────────┘
```

### 共识流程 (IBFT)

```
Proposer 提出区块
    ↓
所有验证者验证 → 广播 Prepare 投票
    ↓
收集 2/3+ Prepare → 广播 Commit 投票
    ↓
收集 2/3+ Commit → 区块最终确定
    ↓
写入 RocksDB → 推进到下一高度
```

### P2P Topic 结构

| Topic | 用途 |
|-------|------|
| `{chain_id}/consensus/1.0.0` | IBFT PrePrepare/Prepare/Commit/RoundChange |
| `{chain_id}/transactions/1.0.0` | 签名交易广播 |
| `{chain_id}/blocks/1.0.0` | 新区块公告 (高度+哈希) |

---

## 代币经济 ($POL)

| 参数 | 值 |
|------|-----|
| 挖矿奖励 | 40 $POL/小时 |
| 中奖人数 | 3 人/轮 (50%/30%/20%) |
| 购票成本 | 1 XP = 1 ticket |
| 单人限购 | 10 tickets/轮 |
| 大奖池门槛 | 100,000 $POL |
| 炼金奖励 | 1 金 + 2 银 + 3 铜 |
| 出块间隔 | 10 秒 |
| 挖矿轮次 | 1 小时 (360 块) |

---

## API 参考

### 节点状态
```bash
curl http://localhost:8545/api/v1/status
curl http://localhost:8545/api/v1/chain/info
curl http://localhost:8545/api/v1/peers
```

### 区块
```bash
curl "http://localhost:8545/api/v1/blocks?from=0&limit=10"
curl http://localhost:8545/api/v1/blocks/42
```

### 交易
```bash
curl -X POST http://localhost:8545/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{"tx":{...},"signer":"...","signature":"...","hash":"..."}'

curl http://localhost:8545/api/v1/transactions/pending
curl http://localhost:8545/api/v1/transactions/{hash}
```

### 钱包
```bash
curl -X POST http://localhost:8545/api/v1/wallet/create
curl http://localhost:8545/api/v1/wallet/{address}
```

### 大奖池
```bash
curl http://localhost:8545/api/v1/pool/status
curl http://localhost:8545/api/v1/pool/history
curl -X POST http://localhost:8545/api/v1/pool/deposit \
  -H "Content-Type: application/json" \
  -d '{"from_address":"0xPOL_...","amount":1000}'
```

### 挖矿
```bash
curl http://localhost:8545/api/v1/mining/rounds/current
curl -X POST http://localhost:8545/api/v1/mining/tickets \
  -H "Content-Type: application/json" \
  -d '{"user_address":"0xPOL_...","ticket_count":5}'
```

---

## 从源码构建

```bash
# 前置条件: Rust 1.78+, Cargo
git clone https://github.com/xiyijixiyifula/polis-platform.git
cd polis-platform

# 本机构建
cargo build --release -p polis-chain

# 运行
./target/release/polis-chain run
```

### 交叉编译 (macOS → Linux/Windows)

```bash
# 前置条件
brew install x86_64-unknown-linux-gnu-binutils mingw-w64
rustup target add x86_64-unknown-linux-gnu x86_64-pc-windows-gnu

# Linux x86_64
cargo build --release -p polis-chain --target x86_64-unknown-linux-gnu

# Windows x86_64
cargo build --release -p polis-chain --target x86_64-pc-windows-gnu
```

---

## 许可证

MIT License. 由 Polis Team 开发。
