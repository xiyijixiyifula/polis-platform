# 部署路径不匹配 — 修复配方

## 耗时：3 分钟

## 自动诊断脚本

```bash
#!/bin/bash
# 部署后运行，确认所有服务运行的是正确版本的二进制
echo "=== 检查 systemd ExecStart 路径 ==="
for s in polis-gateway polis-space polis-user polis-content polis-video polis-admin; do
  exec_path=$(systemctl cat $s 2>/dev/null | grep ExecStart | awk '{print $2}')
  echo "$s: $exec_path"
done

echo ""
echo "=== 对比部署目标路径 vs 实际运行路径 ==="
ps aux | grep -E "polis-(gateway|space|user|content|video|admin)" | grep -v grep | awk '{print $11}'
```

## 修复步骤

```bash
# 1. 停止所有服务
systemctl stop polis-gateway polis-space polis-user polis-content polis-video polis-admin

# 2. 获取 systemd 实际使用的路径
EXEC_PATH=$(systemctl cat polis-gateway | grep ExecStart | awk '{print $2}' | xargs dirname)

# 3. 复制新二进制到正确路径（禁止直接 cp 正在运行的二进制，必须先停服务）
cp /usr/local/bin/polis-* "$EXEC_PATH/"

# 4. 重启所有服务
systemctl restart polis-gateway polis-space polis-user polis-content polis-video polis-admin

# 5. 验证
systemctl status polis-gateway polis-space polis-admin | grep Active

# 6. 清理本机 tar 文件
rm -f /tmp/release-*.tar.gz
```

## 预防措施

1. **统一部署路径**：更新所有 systemd 服务使用 `/usr/local/bin/` 路径，或更新部署脚本写入 `/root/polis/target/release/`
2. **部署脚本自动化**：部署脚本自动读取 systemd ExecStart 路径并写入对应位置
3. **版本检查**：部署后 `curl -s http://localhost:8080/health` 检查网关版本号
