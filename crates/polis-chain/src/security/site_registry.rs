//! 站点注册与验证
//!
//! 站点通过 DNS TXT 记录验证域名所有权后注册到链上。
//! site_id = SHA256(domain)，作为链上唯一标识。

use crate::error::{ChainError, ChainResult};
use crate::state::SiteInfo;
use crate::storage::rocks::Storage;

/// 站点注册管理器
pub struct SiteRegistry;

impl SiteRegistry {
    /// 注册站点 (需要在 DNS 配置 TXT 记录)
    pub fn register(
        storage: &Storage,
        domain: &str,
        site_name: &str,
        admin_address: &str,
    ) -> ChainResult<SiteInfo> {
        let site_id = crate::crypto::derive_site_id(domain);

        // 检查是否已注册
        let existing: Option<SiteInfo> = storage
            .get_deserialized(crate::storage::rocks::CF_SITE_REGISTRY, site_id.as_bytes())?;

        if let Some(site) = existing {
            if site.is_active {
                return Err(ChainError::Validation("站点已注册".into()));
            }
        }

        let latest_block = storage.latest_block_number().unwrap_or(0);

        let site = SiteInfo {
            site_id: site_id.clone(),
            domain: domain.to_string(),
            site_name: site_name.to_string(),
            admin_address: admin_address.to_string(),
            registered_at: latest_block,
            reputation_score: 100, // 初始满分
            is_active: true,
        };

        storage.put_serialized(
            crate::storage::rocks::CF_SITE_REGISTRY,
            site_id.as_bytes(),
            &site,
        )?;

        tracing::info!(
            "站点注册: {} (domain={}, admin={})",
            site_id,
            domain,
            &admin_address[..12.min(admin_address.len())]
        );

        Ok(site)
    }

    /// 获取站点信息
    pub fn get(storage: &Storage, site_id: &str) -> ChainResult<Option<SiteInfo>> {
        storage.get_deserialized(crate::storage::rocks::CF_SITE_REGISTRY, site_id.as_bytes())
    }

    /// 停用站点
    pub fn deactivate(storage: &Storage, site_id: &str) -> ChainResult<()> {
        let mut site = Self::get(storage, site_id)?
            .ok_or_else(|| ChainError::SiteNotRegistered(site_id.to_string()))?;

        site.is_active = false;
        storage.put_serialized(
            crate::storage::rocks::CF_SITE_REGISTRY,
            site_id.as_bytes(),
            &site,
        )?;

        tracing::warn!("站点已停用: {}", site_id);
        Ok(())
    }

    /// 重新激活站点
    pub fn reactivate(storage: &Storage, site_id: &str) -> ChainResult<()> {
        let mut site = Self::get(storage, site_id)?
            .ok_or_else(|| ChainError::SiteNotRegistered(site_id.to_string()))?;

        if site.reputation_score < 30 {
            return Err(ChainError::Validation("信誉分过低, 无法重新激活".into()));
        }

        site.is_active = true;
        storage.put_serialized(
            crate::storage::rocks::CF_SITE_REGISTRY,
            site_id.as_bytes(),
            &site,
        )?;

        Ok(())
    }

    /// 列出所有活跃站点
    pub fn list_active(storage: &Storage) -> ChainResult<Vec<SiteInfo>> {
        let entries = storage.scan_prefix(crate::storage::rocks::CF_SITE_REGISTRY, b"")?;
        Ok(entries
            .iter()
            .filter_map(|(_, v)| bincode::deserialize::<SiteInfo>(v).ok())
            .filter(|s| s.is_active)
            .collect())
    }

    /// 验证站点是否活跃
    pub fn is_active(storage: &Storage, site_id: &str) -> bool {
        Self::get(storage, site_id)
            .ok()
            .flatten()
            .map(|s| s.is_active)
            .unwrap_or(false)
    }

    /// 更新站点信誉分
    pub fn update_reputation(storage: &Storage, site_id: &str, new_score: u32) -> ChainResult<()> {
        let mut site = Self::get(storage, site_id)?
            .ok_or_else(|| ChainError::SiteNotRegistered(site_id.to_string()))?;

        site.reputation_score = new_score.min(100);

        // 信誉低于 30 自动停用
        if new_score < 30 {
            site.is_active = false;
            tracing::warn!("站点 {} 信誉分过低 ({}), 自动停用", site_id, new_score);
        }

        storage.put_serialized(
            crate::storage::rocks::CF_SITE_REGISTRY,
            site_id.as_bytes(),
            &site,
        )?;

        Ok(())
    }
}
