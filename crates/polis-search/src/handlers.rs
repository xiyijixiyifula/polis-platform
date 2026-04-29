use polis_core::error::AppError;
use serde::Deserialize;

use crate::meili::MeiliClient;

/// 搜索参数
#[derive(Debug, Deserialize)]
pub struct SearchParams {
    pub q: String,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub filter: Option<String>,
    #[serde(rename = "type")]
    pub search_type: Option<String>, // "post" | "space" | "user"
}

/// 搜索处理器
pub struct SearchHandler {
    pub meili: MeiliClient,
}

impl SearchHandler {
    pub fn new(meili: MeiliClient) -> Self {
        Self { meili }
    }

    /// 全局搜索
    pub async fn search(&self, params: SearchParams) -> Result<serde_json::Value, AppError> {
        let page = params.page.unwrap_or(1);
        let page_size = params.page_size.unwrap_or(20).min(50);
        let offset = (page - 1) * page_size;

        let search_type = params.search_type.as_deref().unwrap_or("post");

        let results = self.meili
            .search(search_type, &params.q, page_size, offset, params.filter.as_deref())
            .await?;

        Ok(serde_json::json!({
            "hits": results.hits,
            "total": results.estimated_total_hits,
            "page": page,
            "page_size": page_size,
            "total_pages": (results.estimated_total_hits as f64 / page_size as f64).ceil() as u32,
        }))
    }
}
