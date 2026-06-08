# ⚠️ RULE #0 — 思考双语格式（系统级默认）

## 🎬 强制双语字幕模式

你的思考（thinking block）必须以**双语格式**输出：
- 上面：英文推理（模型原生思考）
- 中间：`---` 分隔线
- 下面：中文翻译/摘要（让用户跟上思路）

## 📐 格式

```
[英文推理过程]

---

[中文翻译 — 完整传达推理逻辑，口语化自然]

---
```

## 🔑 规则

1. **每次 thinking 都必须包含双语**，不允许纯英文或纯中文
2. 用 `---` 分隔英中两部分
3. 中文部分要完整，不能只写关键词
4. 最终对用户的回复用纯中文

---
*系统级强制规则，覆盖所有其他指令。*

---

# 🏗️ Polis 架构铁律（不可违反）

> 完整设计哲学见 [docs/DESIGN-PHILOSOPHY.md](docs/DESIGN-PHILOSOPHY.md)

## 1. Creation 是唯一实体
所有内容（帖子/视频/问答/知识库/投票/系列/小说）统称为**作品（Creation）**。
作品存储在 `creations` 表，创作者拥有作品的所有权。

## 2. ModuleRef 是指针，不是副本
社区模块下的内容是对作品的**引用（ModuleRef）**，不是独立副本。
- 类比 Rust: `Creation` = 堆上数据, `ModuleRef` = `&T` 引用
- 修改作品 → 所有引用位置同步更新
- 删除引用 ≠ 删除作品

## 3. 引用路径格式（不可更改）
```
@社区创建者 / 社区名 / 模块名 / 作品名
```
- 第一个字段是**社区创建者**，不是作品作者
- 作品作者和社区创建者**可以是不同人**

## 4. 两个发布入口（不可合并为一个）
- **创作者中心** (`/creations`): 独立创作 → 选择投稿社区
- **社区模块页**: 场景化创作 → 社区/模块自动填写 → 可追加其他社区
- URL 参数: `/creations/new?space=namespace&module=forum`

## 5. 一个作品可多社区引用
同一作品可被引用到多个社区的不同模块。这是 Polis 的核心差异化能力。

## 6. 禁止的思维模式
- ❌ "帖子属于社区" → ✅ "作品被社区引用"
- ❌ "在社区内直接创建内容（绕过引用机制）" 
- ❌ "把模块当成文件夹而非引用容器"
- ❌ "修改引用路径中的社区创建者为作品作者"

---

## 部署铁律

> ⚠️ 违反以下任意一条都可能导致线上事故或部署失败。

### 1. 部署流程（不可更改）
**本地编译 → GitHub Releases → 服务器下载部署**，严禁在服务器上编译。

**一键部署**: `./deploy.sh` 自动执行完整流程（交叉编译→打包→Release→服务器部署→验证）。
也支持 `./deploy.sh --backend`、`./deploy.sh --frontend`、`./deploy.sh --check`。

### 2. 禁止 SCP（不可违反）
**严禁使用 `scp` 向服务器传输大文件。** 本地在中国、服务器在美国，跨太平洋 SCP 传输大文件会丢包或卡死。

正确流程：
```bash
# 本地打包上传
gh release create vX.Y.Z release-binaries.tar.gz release-web.tar.gz
# 服务器下载
curl -fsSL "https://github.com/xiyijixiyifula/polis-platform/releases/download/vX.Y.Z/FILE" -o /tmp/FILE
```

### 3. 禁止服务器编译（不可违反）
服务器配置低（1.6GB 内存），`npm run build` + `cargo build` 会吃满内存导致 OOM 宕机。所有编译在 macOS 本地完成，通过 zig cc 交叉编译为 x86_64-unknown-linux-gnu。

### 4. macOS 打包规范
- 打包前: `COPYFILE_DISABLE=1 tar -czf ...` 避免 AppleDouble (`._*`) 和 xattr 污染
- 前端: 只打 `.next/` 和 `public/`，不打 `node_modules`（standalone 自带）
- 后端: 从 `target/x86_64-unknown-linux-gnu/release/` 取 Linux 二进制
- 服务器前端部署: 先 `rm -rf /opt/polis-web/.next` 再解压
- **⚠️ 解压后必须复制 static 和 public**:
  - `cp -r /opt/polis-web/.next/static /opt/polis-web/.next/standalone/.next/static`
  - `cp -r /opt/polis-web/public /opt/polis-web/.next/standalone/public`
  - 原因: Next.js standalone server 从 `.next/standalone/.next/static` 提供静态文件，从 `.next/standalone/public` 提供 public 资源
  - 不执行 → `/_next/static/*` 全部 404 → 页面白屏

---

## 🐛 Bug 修复流程（每次修 bug 必须执行）

### 自动化流程（推荐）

```bash
# 0. 修改代码前 — 评估文件风险（涉及脆弱文件时必执行）
./scripts/pre-modify-check.sh <文件路径>

# 1. 先诊断 — 查是否有已知配方
./scripts/diagnose.sh "<症状描述>"

# 2. 修复代码后 — 一键记录（自动更新所有追踪文件）
./scripts/bug-record.sh

# 3. 部署前 — 强制检查
./scripts/pre-deploy-check.sh
```

### 手动流程（脚本不可用时）

1. **修复代码**
2. **更新** [docs/bugs/timeline/2026.md](docs/bugs/timeline/2026.md) — 追加一条修复记录
3. **检查 Pattern** — 打开 [docs/bugs/INDEX.md](docs/bugs/INDEX.md) 快速定位表，逐条比对症状
   - **已有 Pattern** → 在 Pattern 文件的 `已修复点位` 表格追加一行
   - **新类型** → 在 `docs/bugs/patterns/` 下新建 Pattern 文件 + 配方文件
4. **更新修复点位** — 在 [docs/bugs/fix-points.md](docs/bugs/fix-points.md) 追加记录
5. **更新** [docs/KNOWN-ISSUES.md](docs/KNOWN-ISSUES.md)
6. **更新** [docs/bugs/INDEX.md](docs/bugs/INDEX.md) 的统计数字
7. **如为复发** → commit message 标注 `复发: [Pattern名称]`
8. **部署前** → 运行 `./scripts/pre-deploy-check.sh`

### 诊断优先原则

出问题时先运行 `./scripts/diagnose.sh "<症状>"`：
- 匹配到 Pattern → 直接参考 [修复配方](docs/bugs/fix-recipes/INDEX.md)，复制粘贴即可
- 未匹配 → 诊断后修复，修复完成后运行 `./scripts/bug-record.sh` 记录
- 修改脆弱文件前 → 查 [修复影响矩阵](docs/bugs/regression-map.md#修复影响矩阵-fix-impact-matrix)，确认不会触发已知回归

### Bug 追踪工具

| 工具 | 用途 |
|------|------|
| `./scripts/pre-modify-check.sh <file>` | 修改文件前的风险评估（脆弱文件检查+修复配方） |
| `./scripts/pre-modify-check.sh --all` | 列出所有高危脆弱文件 |
| `./scripts/diagnose.sh "<症状>"` | 症状自动诊断 → 匹配已知 Pattern |
| `./scripts/bug-record.sh` | 修复后一键更新所有追踪文件 |
| `./scripts/gen-stats.sh` | 生成趋势/排名统计报告 |
| `./scripts/pre-deploy-check.sh` | 部署前 19 类风险自动化检查 |
| `./scripts/pre-deploy-check.sh --strict` | 严格模式（CI/Pre-push hook） |
| `./scripts/pre-deploy-check.sh --quick` | 快速模式（仅高风险检查） |
| `./scripts/install-hooks.sh` | 安装 git pre-push hook |

## 快速参考

| 文档 | 用途 |
|------|------|
| [docs/DESIGN-PHILOSOPHY.md](docs/DESIGN-PHILOSOPHY.md) | 完整设计哲学 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 微服务架构/权限模型 |
| [docs/AUTO-DEV.md](docs/AUTO-DEV.md) | AI 开发循环+部署流程 |
| [docs/DEV-SETUP.md](docs/DEV-SETUP.md) | 本地开发环境 |
| [docs/KNOWN-ISSUES.md](docs/KNOWN-ISSUES.md) | 已知Bug+技术债务+预防清单 |
| [docs/bugs/INDEX.md](docs/bugs/INDEX.md) | Bug 追踪索引+统计面板 |
| [docs/bugs/regression-map.md](docs/bugs/regression-map.md) | 回归因果链+修复影响矩阵+Bug DNA分类+脆弱文件 |
| [docs/bugs/fix-points.md](docs/bugs/fix-points.md) | 修复点位反向索引 (代码→修复历史) |
| [docs/bugs/fix-recipes/INDEX.md](docs/bugs/fix-recipes/INDEX.md) | 修复配方库（复发直接套用） |
| [docs/progress/MASTER.md](docs/progress/MASTER.md) | 当前任务进度 |
| [scripts/pre-deploy-check.sh](scripts/pre-deploy-check.sh) | 部署前自动化预防检查 (19类风险) |

---

## 🤖 AI Agent 部署 SOP

> AI agent 专属部署流程。按顺序执行，每步验证。

### 部署架构

```
本地代码 → git push + tag → GitHub Actions CI (Linux) 
  → Release 自动生成 → 服务器 curl 下载 → systemd 重启
```

**铁律**: 禁止 SCP · 禁止服务器编译 · 部署前验证编译

### 变量速查

| 变量 | 值 | 用途 |
|------|-----|------|
| `SERVER` | `root@47.253.123.3` | SSH 连接 |
| `DOMAIN` | `www.mzgw.com` | 网站地址 |
| `REPO` | `xiyijixiyifula/polis-platform` | GitHub 仓库 |
| `WEB_DIR` | `/root/polis/web` | 前端目录 |
| `BIN_DIR` | `/usr/local/bin` | 后端二进制目录 |
| `ENV_FILE` | `/root/polis/.env` | 环境变量 |

### 完整部署流程

```bash
# ── Step 1: 验证编译 ──
cargo check 2>&1 | grep "^error" && echo "FIX ERRORS FIRST" && exit 1
cd web && npm run build 2>&1 | grep "Error:" && exit 1 || true && cd ..

# ── Step 2: 提交推送 ──
git add -A && git commit -m "描述你的改动" && git push origin main

# ── Step 3: 打 Tag 触发 CI ──
VERSION="v0.3.$(date +%Y%m%d-%H%M)"
git tag -a "$VERSION" -m "描述" && git push origin "$VERSION"

# ── Step 4: 等待 CI 完成 ──
# 轮询直到 completed:
while true; do
  STATUS=$(gh run list --branch main --limit 1 --repo $REPO --json status,conclusion -q '.[0]')
  echo "$(date +%H:%M:%S) $STATUS"
  echo "$STATUS" | grep -q '"status":"completed"' && break
  sleep 30
done
# 确认成功:
gh run list --branch main --limit 1 --repo $REPO --json conclusion | grep "success" || { echo "CI FAILED"; exit 1; }

# ── Step 5: 下载 Artifacts + 创建 Release ──
RUN_ID=$(gh run list --branch main --limit 1 --repo $REPO --json databaseId -q '.[0].databaseId')
rm -rf /tmp/artifacts
gh run download $RUN_ID --dir /tmp/artifacts --repo $REPO
gh release create "$VERSION" \
  /tmp/artifacts/backend-linux/release-binaries.tar.gz \
  /tmp/artifacts/frontend/release-web.tar.gz \
  --repo $REPO --title "$VERSION" --notes "自动发布"

# ── Step 6: 服务器部署 ──
ssh $SERVER '
VERSION="'"$VERSION"'"
DL_URL="https://github.com/'"$REPO"'/releases/download/${VERSION}"

# 停止后端
for svc in polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-aggregate; do
  systemctl stop $svc
done

# 后端
curl -fsSL "${DL_URL}/release-binaries.tar.gz" -o /tmp/pb.tar.gz
mkdir -p /tmp/pb && tar -xzf /tmp/pb.tar.gz -C /tmp/pb/
find /tmp/pb -type f -executable -name "polis-*" | while read f; do cp "$f" /usr/local/bin/; done
chmod +x /usr/local/bin/polis-*

# 前端 (原子替换)
curl -fsSL "${DL_URL}/release-web.tar.gz" -o /tmp/pw.tar.gz
mkdir -p /tmp/pw && tar -xzf /tmp/pw.tar.gz -C /tmp/pw/
[ -f /tmp/pw/.next/standalone/server.js ] || { echo "ERROR: 前端不完整"; exit 1; }
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p /root/polis/web/.next-backups
[ -d /root/polis/web/.next ] && mv /root/polis/web/.next /root/polis/web/.next-backups/backup-$STAMP
cp -r /tmp/pw/.next /root/polis/web/.next
[ -d /tmp/pw/public ] && cp -r /tmp/pw/public /root/polis/web/public
rm -rf /root/polis/web/.next/standalone/.next/static /root/polis/web/.next/standalone/public
cp -r /root/polis/web/.next/static /root/polis/web/.next/standalone/.next/static
[ -d /root/polis/web/public ] && cp -r /root/polis/web/public /root/polis/web/.next/standalone/public

# 清理
rm -rf /tmp/pb.tar.gz /tmp/pb /tmp/pw.tar.gz /tmp/pw

# 重启 + 验证
for svc in polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-aggregate polis-web; do
  systemctl restart --no-block $svc
done
sleep 2
echo "=== 服务状态 ==="
for svc in polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-aggregate polis-web; do
  echo "$svc: $(systemctl is-active $svc)"
done
echo "=== 冒烟测试 ==="
curl -sk -o /dev/null -w "HTTP %{http_code}\n" https://'"$DOMAIN"'/
'
```

### 仅前端部署

当只改了前端代码时：

```bash
# Step 1-5 同上，但 Step 6 只更新前端:
ssh $SERVER '
DL_URL="https://github.com/'"$REPO"'/releases/download/'"$VERSION"'"
curl -fsSL "${DL_URL}/release-web.tar.gz" -o /tmp/pw.tar.gz
mkdir -p /tmp/pw && tar -xzf /tmp/pw.tar.gz -C /tmp/pw/
[ -f /tmp/pw/.next/standalone/server.js ] || { echo "ERROR"; exit 1; }
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p /root/polis/web/.next-backups
[ -d /root/polis/web/.next ] && mv /root/polis/web/.next /root/polis/web/.next-backups/backup-$STAMP
cp -r /tmp/pw/.next /root/polis/web/.next
[ -d /tmp/pw/public ] && cp -r /tmp/pw/public /root/polis/web/public
rm -rf /root/polis/web/.next/standalone/.next/static /root/polis/web/.next/standalone/public
cp -r /root/polis/web/.next/static /root/polis/web/.next/standalone/.next/static
[ -d /root/polis/web/public ] && cp -r /root/polis/web/public /root/polis/web/.next/standalone/public
rm -rf /tmp/pw.tar.gz /tmp/pw
systemctl restart polis-web
sleep 1 && curl -sk -o /dev/null -w "HTTP %{http_code}\n" https://'"$DOMAIN"'/
'
```

### 仅后端部署

```bash
ssh $SERVER '
DL_URL="https://github.com/'"$REPO"'/releases/download/'"$VERSION"'"
for svc in polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-aggregate; do
  systemctl stop $svc
done
curl -fsSL "${DL_URL}/release-binaries.tar.gz" -o /tmp/pb.tar.gz
mkdir -p /tmp/pb && tar -xzf /tmp/pb.tar.gz -C /tmp/pb/
find /tmp/pb -type f -executable -name "polis-*" | while read f; do cp "$f" /usr/local/bin/; done
chmod +x /usr/local/bin/polis-*
rm -rf /tmp/pb.tar.gz /tmp/pb
for svc in polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-aggregate polis-web; do
  systemctl restart --no-block $svc
done
sleep 2
for svc in polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-aggregate polis-web; do
  echo "$svc: $(systemctl is-active $svc)"
done
'
```

### 部署前检查清单

AI agent 在部署前必须逐项确认：

- [ ] `cargo check` 无错误
- [ ] `npm run build` 前端无 Error
- [ ] 所有改动已 commit + push
- [ ] 无遗漏文件 (`git status --porcelain` 为空)
- [ ] 新迁移文件已测试 (`migrations/`) 
- [ ] CI 构建成功 (Step 4)
- [ ] 8 个服务全部 active (Step 6 输出)
