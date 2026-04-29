use std::path::PathBuf;

use polis_core::error::AppError;
use sqlx::PgPool;
use uuid::Uuid;

use crate::config::CodeServiceConfig;

pub struct CodeHandler {
    pool: PgPool,
    config: CodeServiceConfig,
}

impl CodeHandler {
    pub fn new(pool: PgPool, config: CodeServiceConfig) -> Self {
        Self { pool, config }
    }

    /// 创建仓库
    pub async fn create_repo(
        &self,
        space_id: Uuid,
        owner_id: Uuid,
        name: &str,
        description: &str,
        is_private: bool,
    ) -> Result<serde_json::Value, AppError> {
        // 验证仓库名
        if name.len() < 2 || name.len() > 100 {
            return Err(AppError::Validation(
                "Repository name must be between 2 and 100 characters".to_string(),
            ));
        }

        // 检查同名仓库
        let existing: Option<(Uuid,)> = sqlx::query_as(
            "SELECT id FROM repos WHERE space_id = $1 AND name = $2",
        )
        .bind(space_id)
        .bind(name)
        .fetch_optional(&self.pool)
        .await?;

        if existing.is_some() {
            return Err(AppError::Conflict("Repository already exists".to_string()));
        }

        // 创建数据库记录
        let repo_id: (Uuid,) = sqlx::query_as(
            r#"
            INSERT INTO repos (space_id, owner_id, name, description, is_private)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
            "#,
        )
        .bind(space_id)
        .bind(owner_id)
        .bind(name)
        .bind(description)
        .bind(is_private)
        .fetch_one(&self.pool)
        .await?;

        // 在文件系统上初始化 Git 仓库
        let repo_path = self.config.repos_root.join(repo_id.0.to_string());
        tokio::fs::create_dir_all(&repo_path).await
            .map_err(|e| AppError::Internal(format!("Failed to create repo directory: {}", e)))?;

        // 使用 git2 初始化 bare 仓库
        let bare_repo_path = repo_path.join("bare.git");
        git2::Repository::init_bare(&bare_repo_path)
            .map_err(|e| AppError::Internal(format!("Failed to init git repo: {}", e)))?;

        // 创建 worktree (用于 HTTP 推送)
        let worktree_path = repo_path.join("worktree");
        tokio::fs::create_dir_all(&worktree_path).await.ok();

        Ok(serde_json::json!({
            "id": repo_id.0,
            "name": name,
            "description": description,
            "is_private": is_private,
            "default_branch": "main",
            "clone_url": format!("/git/{}.git", repo_id.0),
        }))
    }

    /// 获取仓库信息
    pub async fn get_repo(&self, repo_id: Uuid) -> Result<serde_json::Value, AppError> {
        let row = sqlx::query_as::<_, (serde_json::Value,)>(
            "SELECT row_to_json(repos.*) FROM repos WHERE id = $1",
        )
        .bind(repo_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::NotFound("Repository not found".to_string()))?;

        Ok(row.0)
    }

    /// 获取仓库 README
    pub async fn get_readme(&self, repo_id: Uuid) -> Result<String, AppError> {
        let repo_path = self.config.repos_root.join(repo_id.to_string());
        let readme_path = repo_path.join("worktree").join("README.md");

        let content = tokio::fs::read_to_string(&readme_path).await
            .unwrap_or_else(|_| "# No README\n\nThis repository does not have a README yet.".to_string());

        Ok(content)
    }

    /// 列出仓库文件
    pub async fn list_files(
        &self,
        repo_id: Uuid,
        path: &str,
        branch: &str,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let repo_path = self.config.repos_root.join(repo_id.to_string());

        let git_repo = git2::Repository::open_bare(repo_path.join("bare.git"))
            .map_err(|e| AppError::Internal(format!("Failed to open git repo: {}", e)))?;

        let tree = git_repo
            .find_reference(&format!("refs/heads/{}", branch))
            .ok()
            .and_then(|r| r.peel_to_tree().ok())
            .and_then(|t| {
                if path.is_empty() || path == "/" || path == "." {
                    Some(t)
                } else {
                    t.get_path(std::path::Path::new(path))
                        .ok()
                        .and_then(|e| e.to_object(&git_repo).ok())
                        .and_then(|o| o.peel_to_tree().ok())
                }
            });

        match tree {
            Some(tree) => {
                let mut files = Vec::new();
                for i in 0..tree.len() {
                    if let Some(entry) = tree.get(i) {
                        files.push(serde_json::json!({
                            "name": entry.name().unwrap_or(""),
                            "type": if entry.kind() == Some(git2::ObjectType::Tree) { "dir" } else { "file" },
                            "mode": entry.filemode(),
                        }));
                    }
                }
                Ok(files)
            }
            None => Ok(Vec::new()),
        }
    }
}
