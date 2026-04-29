use std::env;

#[derive(Debug, Clone)]
pub struct PayServiceConfig {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub nats_url: String,
    pub platform_fee_percent: f64, // 平台抽成百分比
    pub alipay_app_id: Option<String>,
    pub wechat_mch_id: Option<String>,
}

impl Default for PayServiceConfig {
    fn default() -> Self {
        Self {
            host: env::var("PAY_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("PAY_PORT")
                .unwrap_or_else(|_| "3008".to_string())
                .parse()
                .expect("PAY_PORT must be a number"),
            database_url: env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),
            nats_url: env::var("NATS_URL").unwrap_or_else(|_| "nats://localhost:4222".to_string()),
            platform_fee_percent: env::var("PLATFORM_FEE_PERCENT")
                .unwrap_or_else(|_| "5.0".to_string())
                .parse()
                .unwrap_or(5.0),
            alipay_app_id: env::var("ALIPAY_APP_ID").ok(),
            wechat_mch_id: env::var("WECHAT_MCH_ID").ok(),
        }
    }
}

impl PayServiceConfig {
    pub fn from_env() -> Self {
        Self::default()
    }
}
