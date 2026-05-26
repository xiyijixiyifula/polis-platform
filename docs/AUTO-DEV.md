# AI 自驱动开发循环

> 本文件描述 Polis 平台的 AI 自主开发流程。人工开发者也适用。

## 核心原则

- **本地编译 → GitHub Releases → 服务器下载部署** — 绝不在服务器上编译
- 版本号递增、更新日志同步、测试通过才部署
- 每次完成后更新本文档的版本号和进度

## 工作循环

### 阶段 1: 读取当前状态
1. 访问 https://www.mzgw.com/changelog 获取最新版本
2. 检查服务器服务: `ssh root@speedtest.mzgw.com "systemctl is-active polis-gateway polis-web polis-user polis-space polis-content polis-admin"`
3. 快速冒烟测试: `curl -sk https://www.mzgw.com/` 确认在线

### 阶段 2: 开发实现
1. `git pull origin main` 拉取最新代码
2. 实现功能代码
3. 本地构建验证 (`cargo check` / `npm run build`)
4. 修复编译错误直到通过

### 阶段 3: 测试
核心测试项:
| # | 测试 | 方法 |
|---|------|------|
| 1 | Gateway | `curl -s http://localhost:8080/health` |
| 2 | 前端首页 | `curl -sk -o /dev/null -w "%{http_code}" https://www.mzgw.com/` |
| 3 | Trending API | `curl -s http://localhost:8080/api/spaces/trending` |
| 4 | 完整流程 | 注册→登录→发布→互动 |

### 阶段 4: 部署

```bash
# === 1. 推送代码 ===
git push origin main

# === 2. 本地交叉编译后端 ===
CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_LINKER=x86_64-unknown-linux-gnu-gcc \
  cargo build --release --target x86_64-unknown-linux-gnu

# === 3. 构建前端 ===
cd web && npm run build && cd ..

# === 4. 打包 (重要: 使用 COPYFILE_DISABLE=1 避免 macOS xattr 污染) ===
VERSION="v0.3.$(date +%Y%m%d-%H%M)"
RELEASE_DIR="polis-release-${VERSION}"
mkdir -p "$RELEASE_DIR/rust" "$RELEASE_DIR/frontend"

# 复制 Rust 二进制
for svc in polis-gateway polis-user polis-space polis-content polis-admin polis-video; do
  cp target/x86_64-unknown-linux-gnu/release/$svc "$RELEASE_DIR/rust/"
done

# 复制前端
cp -r web/.next "$RELEASE_DIR/frontend/.next"

# 打包 (macOS 兼容)
COPYFILE_DISABLE=1 tar -czf "polis-release-${VERSION}.tar.gz" -C "$RELEASE_DIR" .

# === 5. 上传 GitHub Release ===
gh release create "$VERSION" "polis-release-${VERSION}.tar.gz" \
  --repo xiyijixiyifula/polis-platform \
  --title "$VERSION" \
  --notes "$(git log --oneline -5 | sed 's/^/- /')"

# === 6. 服务器部署 (一键脚本) ===
ssh root@speedtest.mzgw.com "VERSION='$VERSION' bash -s" << 'DEPLOY_SCRIPT'
set -e
BACKUP_DIR="/root/polis/target/release/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
for svc in polis-gateway polis-user polis-space polis-content polis-admin polis-video; do
  [ -f "/root/polis/target/release/$svc" ] && cp "/root/polis/target/release/$svc" "$BACKUP_DIR/"
done

DOWNLOAD_URL="https://github.com/xiyijixiyifula/polis-platform/releases/download/${VERSION}/polis-release-${VERSION}.tar.gz"
cd /tmp
wget -q -O polis-release.tar.gz "$DOWNLOAD_URL"
mkdir -p /tmp/polis-deploy
tar -xzf polis-release.tar.gz -C /tmp/polis-deploy/

# 部署后端
cp /tmp/polis-deploy/rust/* /root/polis/target/release/
chmod +x /root/polis/target/release/polis-*

# 部署前端 (必须先清空避免残留)
rm -rf /opt/polis-web/.next
cp -r /tmp/polis-deploy/frontend/.next /opt/polis-web/.next
find /opt/polis-web/.next -name '._*' -delete
rm -rf /opt/polis-web/.next/cache

rm -rf /tmp/polis-release.tar.gz /tmp/polis-deploy

systemctl restart --no-block polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web
sleep 3
systemctl is-active polis-gateway polis-web polis-user polis-space polis-content polis-admin polis-video
DEPLOY_SCRIPT

# === 7. 快速验证 ===
curl -sk -o /dev/null -w "HTTP %{http_code}\n" https://www.mzgw.com/

# === 8. 清理本地打包文件 ===
rm -rf "$RELEASE_DIR" "polis-release-${VERSION}.tar.gz"
```

## 部署铁律

1. **绝不**在服务器上执行 `cargo build` / `npm run build` / `npm install`
2. 本地打包必须 `COPYFILE_DISABLE=1` 避免 macOS xattr 污染
3. 服务器部署前端必须 `rm -rf /opt/polis-web/.next` 再复制
4. 部署后运行 `systemctl is-active` 确认所有服务正常

## 已知限制

- 无蓝绿/滚动部署（重启时有 ~3 秒中断）
- 日志无自动轮转（待配置 logrotate）
- GitHub Actions CI/CD 尚未配置（纯手动触发）
