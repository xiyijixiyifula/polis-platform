# Pattern: 交叉编译目标错误

## 分类

流程层 — 部署流程缺陷

## 症状

- 部署新版本后功能完全没有变化
- MD5 hash 对比服务器和本地二进制完全一致（说明部署了旧文件）
- `cargo build` 默认构建了 macOS (aarch64-apple-darwin) 二进制，但服务器需要 Linux (x86_64-unknown-linux-gnu)
- 服务器上的 Linux 二进制从未被更新

## 根因

`cargo build --release -p polis-space` 默认编译为 macOS 目标（开发机是 Mac），生成的二进制在 `target/release/` 下是 macOS 格式。Linux 交叉编译需要显式指定 `--target x86_64-unknown-linux-gnu`。

打包时从未检查二进制格式和目标是否正确，导致将 macOS 旧二进制打包上传，或直接跳过了实际需要更新的文件。

## 脆弱点

- 所有后端服务的编译命令
- 打包脚本中的文件路径（`target/release/` vs `target/x86_64-unknown-linux-gnu/release/`）
- 部署脚本没有校验二进制格式

## 预防方案

1. **编译命令固化** — 始终使用完整 target 参数
2. **打包前校验** — 检查二进制 ELF 格式是否为 Linux
3. **MD5 验证** — 部署后对比 checksum 确认文件已更新

## 已修复点位

| 日期 | 版本 | 服务 | 修复内容 |
|------|------|------|----------|
| 2026-05-28 | v1.0.32 | polis-space | 用 `--target x86_64-unknown-linux-gnu` 重新编译，确认 MD5 变化 |

## 复发次数

1（本事件）+ 历史上可能多次未察觉的无效部署

## 严重程度

🔴 高 — 修复看起来已完成但实际未部署，浪费大量排查时间

## 关联

- [deploy-path-mismatch](deploy-path-mismatch.md) — 同样是部署流程问题，二进制未到达正确位置
- [xattr-contamination](xattr-contamination.md) — macOS 特有的部署污染问题
