# 修复配方: 交叉编译目标错误

## 症状

- 部署新版本后功能完全没有变化，但编译和打包都报告成功
- 服务器上运行 `file /path/to/binary` 显示 Mach-O 而非 ELF
- 或者 MD5 对比显示服务器二进制和本地 macOS 二进制一致

## 一键诊断

```bash
# 在服务器上检查二进制格式
file /root/polis/target/release/polis-space
# 预期输出: ELF 64-bit LSB executable, x86-64
# 异常输出: Mach-O 64-bit executable arm64 (表示编译了 macOS 版本)

# 对比 MD5
md5 -q target/x86_64-unknown-linux-gnu/release/polis-space
ssh root@47.253.123.3 "md5sum /root/polis/target/release/polis-space"
# 如果不一致 → 文件不同；一致但功能不变 → 可能是其他问题
```

## 标准修复

```bash
# 1. 用正确的 target 重新编译
cargo build --release --target x86_64-unknown-linux-gnu -p polis-space

# 2. 验证二进制格式
file target/x86_64-unknown-linux-gnu/release/polis-space
# 必须输出: ELF 64-bit LSB executable, x86-64

# 3. 打包并上传（从 x86_64 target 目录取文件）
cd target/x86_64-unknown-linux-gnu/release/
COPYFILE_DISABLE=1 tar -czf /tmp/polis-space-linux.tar.gz polis-space

# 4. 创建 Release 并部署
gh release create vX.Y.Z /tmp/polis-space-linux.tar.gz

# 5. 服务器上下载后验证
ssh root@47.253.123.3 "file /root/polis/target/release/polis-space"
# 确认是 ELF 格式后再重启服务
```

## 验证方法

```bash
# 部署后验证 MD5
md5 -q target/x86_64-unknown-linux-gnu/release/polis-space
# 记录输出
ssh root@47.253.123.3 "md5sum /root/polis/target/release/polis-space"
# 对比两者是否一致
```

## 相关回归

- 每次编译后端服务时，必须指定 `--target x86_64-unknown-linux-gnu`
- 打包时必须从 `target/x86_64-unknown-linux-gnu/release/` 取文件，非 `target/release/`
- 与 [deploy-path-mismatch](deploy-path-mismatch.md) 复合时会导致最严重的部署失败

## 修复耗时

3 分钟（重新编译）+ 5 分钟（打包部署）
