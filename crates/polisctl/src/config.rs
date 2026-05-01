use std::env;
use std::fs;
use std::path::PathBuf;

pub struct Config {
    pub base_url: String,
    pub format: OutputFormat,
    pub config_dir: PathBuf,
    pub token_file: PathBuf,
    pub user_file: PathBuf,
    pub admin_token_file: PathBuf,
}

#[derive(Clone, Copy, PartialEq)]
pub enum OutputFormat {
    Json,
    Table,
}

impl Config {
    pub fn new() -> Self {
        let base_url = env::var("POLIS_BASE_URL")
            .unwrap_or_else(|_| "https://speedtest.mzgw.com".to_string())
            .trim_end_matches('/')
            .to_string();

        let format = match env::var("POLIS_FORMAT").as_deref() {
            Ok("table") => OutputFormat::Table,
            _ => OutputFormat::Json,
        };

        let config_dir = dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join(".polis");

        fs::create_dir_all(&config_dir).ok();

        let token_file = config_dir.join("token");
        let user_file = config_dir.join("user");
        let admin_token_file = config_dir.join("admin_token");

        Config { base_url, format, config_dir, token_file, user_file, admin_token_file }
    }

    pub fn get_token(&self) -> Option<String> {
        fs::read_to_string(&self.token_file).ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
    }

    pub fn get_user(&self) -> Option<String> {
        fs::read_to_string(&self.user_file).ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
    }

    pub fn get_admin_token(&self) -> Option<String> {
        fs::read_to_string(&self.admin_token_file).ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
    }

    pub fn save_session(&self, token: &str, user: &str) {
        fs::write(&self.token_file, token).ok();
        fs::write(&self.user_file, user).ok();
        // Set permissions
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&self.token_file, fs::Permissions::from_mode(0o600)).ok();
            fs::set_permissions(&self.user_file, fs::Permissions::from_mode(0o600)).ok();
        }
    }

    pub fn save_admin_token(&self, token: &str) {
        fs::write(&self.admin_token_file, token).ok();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&self.admin_token_file, fs::Permissions::from_mode(0o600)).ok();
        }
    }

    pub fn require_auth(&self) -> Result<String, anyhow::Error> {
        self.get_token()
            .ok_or_else(|| anyhow::anyhow!("Not logged in. Run: polisctl auth login <email> <password>"))
    }

    pub fn require_admin(&self) -> Result<String, anyhow::Error> {
        self.get_admin_token()
            .ok_or_else(|| anyhow::anyhow!("Admin not logged in. Run: polisctl admin login"))
    }
}
