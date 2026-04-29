use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub mod resolve;

/// 解析结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpaceRef {
    pub space_id: Uuid,
    pub namespace: String,
    pub slug: String,
    pub owner_id: Option<Uuid>,
    pub is_root: bool,
    pub root_space_id: Option<Uuid>,
}

/// 从完整 namespace 中提取各个部分
pub fn parse_namespace(namespace: &str) -> NamespaceParts {
    let parts: Vec<&str> = namespace.split('/').collect();
    match parts.len() {
        1 => NamespaceParts {
            full: namespace.to_string(),
            username: None,
            slug: parts[0].to_string(),
            is_root: true,
        },
        _ => NamespaceParts {
            full: namespace.to_string(),
            username: Some(parts[0].to_string()),
            slug: parts[1..].join("/"),
            is_root: false,
        },
    }
}

/// 命名空间分解结果
#[derive(Debug, Clone)]
pub struct NamespaceParts {
    pub full: String,
    pub username: Option<String>,
    pub slug: String,
    pub is_root: bool,
}

/// 构建 namespace 字符串
pub fn build_namespace(username: &str, slug: &str) -> String {
    format!("{}/{}", username, slug)
}

/// 构建根社区 namespace
pub fn build_root_namespace(slug: &str) -> String {
    slug.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_parse_root_namespace() {
        let parts = parse_namespace("显卡吧");
        assert!(parts.is_root);
        assert_eq!(parts.slug, "显卡吧");
        assert!(parts.username.is_none());
    }
    #[test]
    fn test_parse_user_namespace() {
        let parts = parse_namespace("华硕/显卡吧");
        assert!(!parts.is_root);
        assert_eq!(parts.username.unwrap(), "华硕");
        assert_eq!(parts.slug, "显卡吧");
    }
    #[test]
    fn test_build_namespace() {
        assert_eq!(build_namespace("user", "slug"), "user/slug");
        assert_eq!(build_root_namespace("root"), "root");
    }
}
