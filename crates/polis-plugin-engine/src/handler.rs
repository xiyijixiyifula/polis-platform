use polis_core::error::AppError;
use sqlx::PgPool;
use uuid::Uuid;

use crate::runtime::PluginEngine;

/// 插件管理器 (HTTP API 层)
pub struct PluginHandler {
    pub(crate) pool: PgPool,
    engine: PluginEngine,
}

impl PluginHandler {
    pub fn new(pool: PgPool, engine: PluginEngine) -> Self {
        Self { pool, engine }
    }

    /// 安装插件到社区
    pub async fn install_plugin(
        &self,
        space_id: Uuid,
        author_id: Uuid,
        name: &str,
        description: &str,
        wasm_bytes: &[u8],
    ) -> Result<serde_json::Value, AppError> {
        let plugin_id = Uuid::new_v4();

        // 存储到数据库
        sqlx::query(
            r#"
            INSERT INTO plugins (id, space_id, author_id, name, description, wasm_bytes, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'active')
            "#,
        )
        .bind(plugin_id)
        .bind(space_id)
        .bind(author_id)
        .bind(name)
        .bind(description)
        .bind(wasm_bytes)
        .execute(&self.pool)
        .await?;

        // 加载到运行时
        self.engine
            .load_plugin(plugin_id, space_id, name, wasm_bytes, vec![])
            .await?;

        Ok(serde_json::json!({
            "id": plugin_id,
            "name": name,
            "status": "active",
            "message": "Plugin installed and loaded",
        }))
    }

    /// 卸载插件
    pub async fn uninstall_plugin(&self, plugin_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE plugins SET status = 'inactive' WHERE id = $1")
            .bind(plugin_id)
            .execute(&self.pool)
            .await?;

        self.engine.unload_plugin(plugin_id).await
    }

    /// 获取社区已安装插件
    pub async fn list_plugins(&self, space_id: Uuid) -> Result<Vec<serde_json::Value>, AppError> {
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            "SELECT row_to_json(p.*) FROM plugins p WHERE p.space_id = $1 AND p.status = 'active' ORDER BY p.created_at DESC",
        )
        .bind(space_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| r.0).collect())
    }
}
