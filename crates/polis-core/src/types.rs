use serde::{Deserialize, Serialize};

/// 社区可见性
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "varchar")]
pub enum Visibility {
    #[serde(rename = "public")]
    Public,
    #[serde(rename = "private")]
    Private,
    #[serde(rename = "unlisted")]
    Unlisted,
}

impl Default for Visibility {
    fn default() -> Self {
        Self::Public
    }
}

impl std::fmt::Display for Visibility {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Public => write!(f, "public"),
            Self::Private => write!(f, "private"),
            Self::Unlisted => write!(f, "unlisted"),
        }
    }
}

/// 社区状态
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "varchar")]
pub enum SpaceStatus {
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "archived")]
    Archived,
    #[serde(rename = "suspended")]
    Suspended,
}

impl Default for SpaceStatus {
    fn default() -> Self {
        Self::Active
    }
}

/// 成员角色
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "varchar")]
pub enum MemberRole {
    #[serde(rename = "owner")]
    Owner,
    #[serde(rename = "admin")]
    Admin,
    #[serde(rename = "moderator")]
    Moderator,
    #[serde(rename = "member")]
    Member,
    #[serde(rename = "banned")]
    Banned,
}

impl Default for MemberRole {
    fn default() -> Self {
        Self::Member
    }
}

/// 模块类型
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "varchar")]
pub enum ModuleType {
    #[serde(rename = "forum")]
    Forum,
    #[serde(rename = "article")]
    Article,
    #[serde(rename = "short_video")]
    ShortVideo,
    #[serde(rename = "long_video")]
    LongVideo,
    #[serde(rename = "code_repo")]
    CodeRepo,
    #[serde(rename = "qa")]
    Qa,
    #[serde(rename = "chat")]
    Chat,
    #[serde(rename = "novel")]
    Novel,
    #[serde(rename = "store")]
    Store,
    #[serde(rename = "course")]
    Course,
    #[serde(rename = "game")]
    Game,
    #[serde(rename = "mini_app")]
    MiniApp,
    #[serde(rename = "wiki")]
    Wiki,
    #[serde(rename = "paid_content")]
    PaidContent,
}

impl Default for ModuleType {
    fn default() -> Self {
        Self::Forum
    }
}

impl std::fmt::Display for ModuleType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Forum => write!(f, "forum"),
            Self::Article => write!(f, "article"),
            Self::ShortVideo => write!(f, "short_video"),
            Self::LongVideo => write!(f, "long_video"),
            Self::CodeRepo => write!(f, "code_repo"),
            Self::Qa => write!(f, "qa"),
            Self::Chat => write!(f, "chat"),
            Self::Novel => write!(f, "novel"),
            Self::Store => write!(f, "store"),
            Self::Course => write!(f, "course"),
            Self::Game => write!(f, "game"),
            Self::MiniApp => write!(f, "mini_app"),
            Self::Wiki => write!(f, "wiki"),
            Self::PaidContent => write!(f, "paid_content"),
        }
    }
}

/// 内容类型
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "varchar")]
pub enum ContentType {
    #[serde(rename = "text")]
    Text,
    #[serde(rename = "video")]
    Video,
    #[serde(rename = "image")]
    Image,
    #[serde(rename = "code")]
    Code,
    #[serde(rename = "file")]
    File,
}

impl Default for ContentType {
    fn default() -> Self {
        Self::Text
    }
}

impl std::fmt::Display for ContentType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Text => write!(f, "text"),
            Self::Video => write!(f, "video"),
            Self::Image => write!(f, "image"),
            Self::Code => write!(f, "code"),
            Self::File => write!(f, "file"),
        }
    }
}

/// 认证类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum VerifiedType {
    Personal,
    Enterprise,
}

/// 插件权限
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginPermission {
    pub http_request: Option<HttpRequestPermission>,
    pub storage_read: Option<StoragePermission>,
    pub storage_write: Option<StoragePermission>,
    pub user_profile_read: bool,
    pub space_content_read: bool,
    pub space_content_write: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpRequestPermission {
    pub allowed_domains: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoragePermission {
    pub max_bytes: u64,
}
