use thiserror::Error;

#[derive(Error, Debug)]
pub enum ChainError {
    #[error("存储错误: {0}")]
    Storage(String),

    #[error("序列化错误: {0}")]
    Serialization(String),

    #[error("加密错误: {0}")]
    Crypto(String),

    #[error("验证失败: {0}")]
    Validation(String),

    #[error("签名无效")]
    InvalidSignature,

    #[error("交易已存在: {0}")]
    DuplicateTransaction(String),

    #[error("余额不足: 需要 {required}, 当前 {available}")]
    InsufficientBalance { required: u64, available: u64 },

    #[error("XP 不足: 需要 {required}, 可用 {available}")]
    InsufficientXp { required: u64, available: u64 },

    #[error("nonce 无效: 期望 {expected}, 实际 {actual}")]
    InvalidNonce { expected: u64, actual: u64 },

    #[error("站点未注册: {0}")]
    SiteNotRegistered(String),

    #[error("验证者未找到: {0}")]
    ValidatorNotFound(String),

    #[error("共识错误: {0}")]
    Consensus(String),

    #[error("网络错误: {0}")]
    Network(String),

    #[error("配置错误: {0}")]
    Config(String),

    #[error("IO 错误: {0}")]
    Io(#[from] std::io::Error),

    #[error("P2P 错误: {0}")]
    P2P(String),

    #[error("同步错误: {0}")]
    Sync(String),
}

pub type ChainResult<T> = Result<T, ChainError>;
