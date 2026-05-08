use polis_core::error::AppError;

use crate::aggregator::Aggregator;

/// 聚合服务 HTTP 处理器
pub struct AggregateHandler {
    pub aggregator: Aggregator,
}

impl AggregateHandler {
    pub fn new(aggregator: Aggregator) -> Self {
        Self { aggregator }
    }

    /// 获取根社区精选
    pub async fn get_featured(
        &self,
        slug: &str,
        page: u32,
        page_size: u32,
    ) -> Result<serde_json::Value, AppError> {
        let offset = (page - 1) * page_size;
        let posts = self.aggregator.get_featured_posts(slug, page_size, offset).await?;
        Ok(serde_json::json!({ "posts": posts, "page": page, "page_size": page_size }))
    }

    /// 获取根社区热榜
    pub async fn get_trending(
        &self,
        slug: &str,
        page: u32,
        page_size: u32,
    ) -> Result<serde_json::Value, AppError> {
        let offset = (page - 1) * page_size;
        let posts = self.aggregator.get_trending_posts(slug, page_size, offset).await?;
        Ok(serde_json::json!({ "posts": posts, "page": page, "page_size": page_size }))
    }

    /// 获取根社区关联的子社区
    pub async fn get_sub_spaces(
        &self,
        slug: &str,
        page: u32,
        page_size: u32,
    ) -> Result<serde_json::Value, AppError> {
        let offset = (page - 1) * page_size;
        let spaces = self.aggregator.get_sub_spaces(slug, page_size, offset).await?;
        Ok(serde_json::json!({ "spaces": spaces, "page": page, "page_size": page_size }))
    }
}
