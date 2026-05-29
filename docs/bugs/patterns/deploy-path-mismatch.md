---
symptoms: [部署后功能不生效, 服务行为像旧版, systemd路径不对]
keywords: [部署, 功能, 不生效, 服务, 旧版, systemd, ExecStart, 路径, 不一致]
severity: medium
recipe: docs/bugs/fix-recipes/deploy-path-mismatch.md
fix_time: 3min
diagnosis_cmd: for s in polis-gateway polis-space polis-user polis-content polis-video polis-admin; do systemctl cat $s 2>/dev/null | grep ExecStart; done
---

# 部署路径不匹配

## 症状

- 新版本部署后功能未生效
- 服务重启后日志仍显示旧版本行为
- API 返回数据不变
- `curl` 直接测试后端端口返回旧结果

## 根因

systemd 服务配置的 `ExecStart` 路径与部署脚本写入的目标路径不一致。常见情况：
- 部署写入 `/usr/local/bin/polis-gateway`
- systemd 使用 `/root/polis/target/release/polis-gateway`

代码优先读取 `admin_code.txt` 文件，导致环境变量 `ADMIN_CODE` 被覆盖。

## 诊断

```bash
# 1. 检查 systemd ExecStart 路径
for s in polis-gateway polis-space polis-user polis-content polis-video polis-admin; do
  echo "$s: $(systemctl cat $s 2>/dev/null | grep ExecStart)"
done

# 2. 检查实际运行的进程路径
ps aux | grep polis- | grep -v grep

# 3. 对比两个路径的文件大小和修改时间
ls -la /usr/local/bin/polis-admin /root/polis/target/release/polis-admin 2>/dev/null
```

## 已修复点位

| 日期 | 版本 | 文件 | 描述 |
|------|------|------|------|
| 2026-05-27 | v1.0.27 | systemd services | 统一部署流程：先 systemctl stop，再 cp 到 ExecStart 路径，然后 restart |
