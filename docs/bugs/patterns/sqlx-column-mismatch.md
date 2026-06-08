# Pattern: sqlx::FromRow 字段与数据库列不匹配

## 标识符
`sqlx-column-mismatch`

## 症状
- API 返回 HTTP 500 错误
- 错误信息包含 `no column found for name: xxx` 或 `column "xxx" does not exist`
- 发生在查询使用了 `sqlx::FromRow` 的 struct 时

## 根因
1. `sqlx::FromRow` 默认按字段名匹配 DB 列名（snake_case 转换）
2. struct 字段名与 DB 列名不一致（如 `earned_at` vs `awarded_at`）
3. struct 包含 DB 表中不存在的字段（如 `id` 字段但表用其他主键）
4. 数据库迁移后 struct 未同步更新

## 修复配方
1. 用 `\d table_name` 在数据库中查看实际列名
2. 字段名不匹配：添加 `#[sqlx(rename = "actual_column_name")]`
3. 表中不存在的字段：添加 `#[sqlx(default)]` 或从 struct 中移除
4. SQL 查询中的列名也需要同步修正
5. 运行 `cargo check` 确认编译，再部署验证

## 预防措施
- 新增或修改数据库迁移后，必须验证所有相关 `sqlx::FromRow` struct
- CI 中运行集成测试验证 API 端点
- `SELECT *` 查询改为显式列名，更容易发现不匹配

## 已修复点位

| 版本 | 文件 | 问题 | 修复日期 |
|------|------|------|----------|
| v0.3.x | models/user.rs:210,253 | OnboardingQuest.id 映射缺失、UserBadge.earned_at vs awarded_at | 2026-06-08 |
| v1.1.0 | models.rs:1402 | UserLevel.xp_required vs DB required_xp | 2026-06-02 |
