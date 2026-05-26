# 修复配方：macOS xattr 部署污染

## 症状

- 部署后网页 UI 错乱（CSS 不对、图标异常）
- `md5sum` 对比本地和服务器 CSS/JS 文件不一致
- 服务器上出现 `._*` 文件（如 `._chunk.css`）
- 常见于从 macOS 本地打包上传的场景

## 一键诊断

```bash
# SSH 到服务器后运行：
ls -la /opt/polis-web/.next/static/css/ | grep "\._"
# 或对比文件 hash：
md5sum /opt/polis-web/.next/static/css/*.css
# 与本地对比：
md5sum web/.next/static/css/*.css
```

## 标准修复（服务器端）

```bash
# 1. 清理污染文件
find /opt/polis-web/.next -name '._*' -delete

# 2. 清缓存
rm -rf /opt/polis-web/.next/cache

# 3. 重启服务
systemctl restart polis-web

# 4. 验证（强制刷新浏览器 Cmd+Shift+R）
```

## 根本修复（本地打包侧）

```bash
# ❌ 错误做法：
tar -czf release.tar.gz -C web .next/

# ✅ 正确做法：
COPYFILE_DISABLE=1 tar -czf release.tar.gz -C web .next/ standalone/ server.js package.json node_modules/
```

## 验证方法

1. `ssh root@47.253.123.3 "find /opt/polis-web/.next -name '._*' | wc -l"` → 应为 0
2. 浏览器强制刷新后 UI 正常
3. `md5sum` 本地和服务器关键 CSS 文件一致

## 预防

- 所有 `tar` 命令前加 `COPYFILE_DISABLE=1`
- 部署脚本中硬编码此参数
- auto-dev.sh 已内置此参数（v3.0+）

## 相关回归

- 每次手工打包都可能复发，必须检查 `COPYFILE_DISABLE=1` 是否在命令中
