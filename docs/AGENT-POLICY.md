# Agent 内容审查策略与操作手册

> 本文档是 AI Agent 执行内容审查的权威参考。Agent 应在每次扫描前读取本文档和相关审查规则。

## 1. 系统概述

Polis 平台使用 AI Agent 进行自动化内容审查。Agent 通过专用 API 端点与平台交互：

| 端点 | 用途 |
|------|------|
| `POST /api/admin/agent/login` | Agent 认证（使用 agent_id + api_key） |
| `GET /api/admin/agent/policy` | 获取当前启用的审查规则 |
| `GET /api/admin/agent/new-content?hours=N` | 获取最近 N 小时的新内容 |
| `POST /api/admin/agent/review` | 提交审查决策 |
| `GET /api/admin/agent/stats` | 获取审查统计 |

## 2. 违规类型定义

Agent 应根据以下分类判断内容是否违规：

### 2.1 色情/低俗内容 (NSFW)
- 明显的性行为描写或暗示
- 露骨的色情词汇和场景
- 性器官的直接描述
- 儿童相关的性暗示（零容忍，L4 处置）

### 2.2 暴力/恐怖内容 (Violence)
- 详细的血腥暴力描写
- 对他人施加暴力伤害的威胁
- 恐怖主义宣传或美化
- 自残/自杀的方法指导或鼓励

### 2.3 仇恨言论 (Hate Speech)
- 基于种族、民族、国籍的歧视和攻击
- 基于宗教信仰的诋毁
- 基于性别、性取向的侮辱
- 基于地域的歧视（如"地域黑"）
- 基于残疾、疾病的歧视

### 2.4 垃圾信息 (Spam)
- 纯无意义字符/表情灌水
- 重复发布相同内容（3 次以上）
- 明显的商业广告/SEO 垃圾
- 诱导点击的标题党
- 机器人批量发布的低质量内容

### 2.5 违法违规 (Illegal)
- 诈骗信息（投资骗局、钓鱼链接）
- 赌博相关（推广赌博网站、赌博策略）
- 毒品相关（制作方法、购买渠道、美化吸毒）
- 侵权内容（明确侵犯他人版权/商标）
- 个人信息买卖（身份证、银行卡、手机号）

### 2.6 骚扰/网络暴力 (Harassment)
- 针对特定个人的持续人身攻击
- 人肉搜索（发布他人隐私信息如地址、电话）
- 网络暴力（煽动群体攻击特定目标）
- 恶意造谣、诽谤

## 3. 处置措施分级

| 级别 | 适用场景 | 处置方式 | API 操作 |
|------|---------|---------|---------|
| **L1 轻** | 边界模糊、首次违规、无明显恶意 | 隐藏内容 24h | `hide` + `duration_hours: 24` |
| **L2 中** | 明显违规、但非极端内容 | 隐藏内容 7d | `hide` + `duration_hours: 168` |
| **L3 重** | 严重违规、恶意发布 | 隐藏内容 30d + 封禁用户 7d | `hide` + `duration_hours: 720` + `ban_user` |
| **L4 极重** | 零容忍内容（儿童色情、恐怖主义、人身安全威胁） | 隐藏所有内容 + 永久封禁 | `hide` + `ban_user`（mark permanent） |

## 4. 时间窗口策略

| 扫描频率 | 时间窗口 | 适用场景 | Cron 示例 |
|---------|---------|---------|----------|
| 高频 | 最近 1 小时 | 新发布内容快速筛查 | `*/60 * * * *` |
| 日常 | 最近 24 小时 | 日常全量审查 | `0 2 * * *` (每天凌晨 2 点) |
| 深度 | 指定时间范围 | 特定社区/用户专项审查 | 按需触发 |

## 5. 置信度与人工审核分流

Agent 必须为每条审查决策标注置信度（0.0-1.0）：

| 置信度 | 行为 | 说明 |
|--------|------|------|
| >= 0.9 | **自动执行** | 系统直接执行处置，写入 audit_log |
| 0.6 - 0.9 | **标记人工审核** | 创建 report (pending 状态)，进入管理后台审查队列 |
| < 0.6 | **跳过** | 仅记录审计日志 (action=skipped)，不执行操作 |

## 6. API 调用示例

### 6.1 Agent 登录

```bash
curl -X POST https://www.mzgw.com/api/admin/agent/login \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "uuid-here", "api_key": "agent-api-key"}'

# 返回: { "code": 0, "data": { "access_token": "jwt...", "user_type": "agent" } }
```

### 6.2 获取审查规则

```bash
curl https://www.mzgw.com/api/admin/agent/policy \
  -H "Authorization: Bearer <agent-jwt>"

# 返回: { "code": 0, "data": { "rules": [...], "violation_categories": {...}, "action_levels": {...}, "confidence_thresholds": {...} } }
```

### 6.3 获取待审内容

```bash
curl "https://www.mzgw.com/api/admin/agent/new-content?hours=24&limit=100" \
  -H "Authorization: Bearer <agent-jwt>"

# 返回: { "code": 0, "data": { "items": [{ "id", "title", "content", "author", "space", "created_at", "visibility" }], "total": N } }
```

### 6.4 提交审查决策

```bash
curl -X POST https://www.mzgw.com/api/admin/agent/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <agent-jwt>" \
  -d '{
    "decisions": [
      {
        "target_type": "post",
        "target_id": "post-uuid",
        "action": "hide",
        "duration_hours": 168,
        "reason": "包含仇恨言论",
        "confidence": 0.95,
        "violation_type": "hate_speech"
      },
      {
        "target_type": "post",
        "target_id": "post-uuid-2",
        "action": "approve",
        "reason": "内容正常",
        "confidence": 0.85,
        "violation_type": null
      }
    ]
  }'

# 返回: { "code": 0, "data": { "total": 2, "auto_executed": 1, "flagged_for_review": 1, "skipped": 0 } }
```

## 7. 审查流程最佳实践

### 7.1 每轮扫描流程
1. 登录获取 JWT token
2. 读取当前审查规则 (`GET /api/admin/agent/policy`)
3. 获取待审内容 (`GET /api/admin/agent/new-content?hours=N`)
4. 逐条评估内容（基于规则 + 本文件第 2 节违规类型）
5. 生成审查决策（含置信度）
6. 批量提交决策 (`POST /api/admin/agent/review`)
7. 记录本轮扫描统计

### 7.2 去重机制
系统自动排除已被审查的内容（基于 audit_logs）。Agent 不需要维护已审查列表。

### 7.3 内容截断
`new-content` API 返回的 `content` 字段仅包含前 5000 字符。Agent 应基于可用内容判断，标注 `content_truncated: true` 时提醒可能需要人工复查。

### 7.4 上下文判断
- 技术讨论中的敏感词汇（如安全研究）不应标记为违规
- 新闻转述中的暴力描述需要结合整体语境判断
- 用户间的日常调侃与真正的骚扰需要区分

## 8. 违规类型 → 处置级别映射

| 违规类型 | 首次违规 | 重复违规 | 备注 |
|---------|---------|---------|------|
| 色情/低俗 | L1-L2 | L2-L3 | 儿童相关 → 直接 L4 |
| 暴力/恐怖 | L2-L3 | L3-L4 | 恐怖主义 → 直接 L4 |
| 仇恨言论 | L2 | L3 | 基于严重程度调整 |
| 垃圾信息 | L1 | L2 | 批量机器人 → L3 |
| 违法违规 | L3 | L4 | 诈骗/毒品 → 直接 L4 |
| 骚扰/网暴 | L1-L2 | L2-L3 | 人肉搜索 → 直接 L3 |
