use polis_core::error::AppError;
use serde::{Deserialize, Serialize};

/// Meilisearch 客户端封装
#[derive(Clone)]
pub struct MeiliClient {
    base_url: String,
    api_key: String,
    client: reqwest::Client,
}

impl MeiliClient {
    pub fn new(base_url: &str, api_key: &str) -> Self {
        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            api_key: api_key.to_string(),
            client: reqwest::Client::new(),
        }
    }

    /// 创建/更新索引
    pub async fn create_index(&self, uid: &str, primary_key: &str) -> Result<(), AppError> {
        let url = format!("{}/indexes", self.base_url);

        // Check if index exists first
        let check_url = format!("{}/indexes/{}", self.base_url, uid);
        let check_resp = self.client.get(&check_url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await
            .map_err(|e| AppError::External(format!("Meili check error: {}", e)))?;

        if check_resp.status().is_success() {
            return Ok(()); // Index already exists
        }

        let body = serde_json::json!({
            "uid": uid,
            "primaryKey": primary_key,
        });

        let resp = self.client.post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::External(format!("Meili create error: {}", e)))?;

        let status_code = resp.status().as_u16();
        if !resp.status().is_success() && status_code != 201 {
            let text = resp.text().await.unwrap_or_default();
            if status_code != 409 {
                return Err(AppError::External(format!("Meili create index failed: {}", text)));
            }
        }

        Ok(())
    }

    /// 添加文档
    pub async fn add_documents<T: Serialize>(
        &self,
        index_uid: &str,
        documents: &[T],
    ) -> Result<(), AppError> {
        let url = format!("{}/indexes/{}/documents", self.base_url, index_uid);

        let resp = self.client.post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&documents)
            .send()
            .await
            .map_err(|e| AppError::External(format!("Meili add docs error: {}", e)))?;

        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(AppError::External(format!("Meili add documents failed: {}", text)));
        }

        Ok(())
    }

    /// 删除文档
    pub async fn delete_documents(&self, index_uid: &str, ids: &[String]) -> Result<(), AppError> {
        let url = format!("{}/indexes/{}/documents/delete-batch", self.base_url, index_uid);

        let resp = self.client.post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&ids)
            .send()
            .await
            .map_err(|e| AppError::External(format!("Meili delete error: {}", e)))?;

        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(AppError::External(format!("Meili delete failed: {}", text)));
        }

        Ok(())
    }

    /// 搜索
    pub async fn search(
        &self,
        index_uid: &str,
        query: &str,
        limit: u32,
        offset: u32,
        filter: Option<&str>,
    ) -> Result<SearchResults, AppError> {
        let url = format!("{}/indexes/{}/search", self.base_url, index_uid);

        let mut body = serde_json::json!({
            "q": query,
            "limit": limit,
            "offset": offset,
        });

        if let Some(f) = filter {
            body["filter"] = serde_json::json!([f]);
        }

        let resp = self.client.post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::External(format!("Meili search error: {}", e)))?;

        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(AppError::External(format!("Meili search failed: {}", text)));
        }

        let results: SearchResults = resp
            .json()
            .await
            .map_err(|e| AppError::External(format!("Meili parse error: {}", e)))?;

        Ok(results)
    }

    /// 更新索引设置
    pub async fn update_settings(
        &self,
        index_uid: &str,
        settings: &serde_json::Value,
    ) -> Result<(), AppError> {
        let url = format!("{}/indexes/{}/settings", self.base_url, index_uid);

        let resp = self.client.patch(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(settings)
            .send()
            .await
            .map_err(|e| AppError::External(format!("Meili settings error: {}", e)))?;

        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(AppError::External(format!("Meili update settings failed: {}", text)));
        }

        Ok(())
    }
}

/// 搜索结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResults {
    pub hits: Vec<serde_json::Value>,
    pub query: String,
    pub processing_time_ms: u64,
    pub limit: u32,
    pub offset: u32,
    pub estimated_total_hits: u64,
}

/// 索引文档类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostDocument {
    pub id: String,
    pub space_id: String,
    pub title: String,
    pub body: String,
    pub author_name: String,
    pub tags: Vec<String>,
    pub like_count: i64,
    pub comment_count: i64,
    pub created_at: i64,
}

impl PostDocument {
    pub fn from_post(post: &polis_core::models::Post, author_name: &str) -> Self {
        let tags: Vec<String> = serde_json::from_value(post.tags.clone()).unwrap_or_default();
        Self {
            id: post.id.to_string(),
            space_id: post.space_id.to_string(),
            title: post.title.clone(),
            body: post.body.clone(),
            author_name: author_name.to_string(),
            tags,
            like_count: post.like_count,
            comment_count: post.comment_count,
            created_at: post.created_at.timestamp(),
        }
    }
}
