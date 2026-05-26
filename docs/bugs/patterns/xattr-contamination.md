# macOS xattr 部署污染

## 元信息

- **首次出现**: v0.3.91
- **复发次数**: 2 次 (v0.3.91, v0.3.95)
- **最近一次**: v0.3.95
- **严重程度**: 🔴 高 — 部署后 UI 完全错乱，用户无法使用
- **影响范围**: macOS 开发机上打包的前端 release

## 根因

macOS 的 `tar` 命令在打包时会将扩展属性（xattr）和资源分叉（AppleDouble `._*` 文件）打包进 tar.gz。当这些文件被解压到 Linux 服务器的 Next.js `.next/` 目录时：
- `._*` 文件被 Next.js 当作合法文件加载
- xattr 扩展头干扰 CSS/JS 文件内容

表现为：服务器上 CSS 文件与本地不一致，UI 样式完全错乱。

## 典型症状

- 部署后页面 UI 错乱（布局崩溃、样式丢失）
- 首页/各个页面的 CSS 渲染异常
- 问题仅出现在前端部署后，后端正常
- 本地开发环境一切正常
- `md5sum` 对比本地和服务器 CSS 文件不一致

## 标准修复（7 步部署检查清单）

```bash
# 1. 本地打包（关键！COPYFILE_DISABLE=1）
COPYFILE_DISABLE=1 tar -czf release-web.tar.gz -C web/.next . --exclude='._*'

# 2. 上传到服务器
scp release-web.tar.gz root@47.253.123.3:/tmp/

# 3. 服务器解压前：删除旧 .next
ssh root@47.253.123.3 "rm -rf /opt/polis-web/.next"

# 4. 解压
ssh root@47.253.123.3 "tar -xzf /tmp/release-web.tar.gz -C /opt/polis-web/.next"

# 5. 清理残留 xattr 文件
ssh root@47.253.123.3 "find /opt/polis-web/.next -name '._*' -delete"

# 6. 清缓存
ssh root@47.253.123.3 "rm -rf /opt/polis-web/.next/cache"

# 7. 重启服务
ssh root@47.253.123.3 "systemctl restart polis-web"

# 8. 验证（可选但推荐）
# 对比本地和服务器 CSS md5：
md5 web/.next/static/css/*.css
ssh root@47.253.123.3 "md5sum /opt/polis-web/.next/static/css/*.css"
```

## 已修复点位

| 版本 | 文件 | 修复内容 | 日期 |
|------|------|----------|------|
| v0.3.91 | 部署脚本 | 首次遇到，添加 `COPYFILE_DISABLE=1` | ~2026-05-22 |
| v0.3.95 | 部署脚本 | 二次复现，增加 `--exclude='._*'` + `find -delete` | ~2026-05-22 |

## 诊断命令

```bash
# 检查服务器上是否有 ._* 残留文件
ssh root@47.253.123.3 "find /opt/polis-web/.next -name '._*' | head -20"

# 对比文件一致性
md5 web/.next/static/css/*.css  # 本地
ssh root@47.253.123.3 "md5sum /opt/polis-web/.next/static/css/*.css"  # 服务器
```

## 预防措施

1. `COPYFILE_DISABLE=1` 永远作为 macOS tar 打包的前缀
2. 部署脚本中包含 `find -name '._*' -delete` 步骤
3. 服务器上 `rm -rf .next` 再解压（不留任何旧文件）
