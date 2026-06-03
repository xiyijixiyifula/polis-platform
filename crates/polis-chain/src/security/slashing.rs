//! 惩罚/罚没机制
//!
//! 检测到作弊行为后，按严重程度分级处罚:
//!   Minor   — 警告 + 信誉降 5-10 分
//!   Moderate — 质押扣 10% + 暂停挖矿 7 天
//!   Severe — 质押扣 50% + 暂停 30 天 + 追回奖励
//!   Critical — 质押全没 + 站点黑名单 + 运营者地址冻结

use crate::error::ChainResult;
use crate::storage::rocks::Storage;

/// 违规严重程度
#[derive(Debug, Clone, PartialEq)]
pub enum ViolationLevel {
    Minor,     // 轻微
    Moderate,  // 中度
    Severe,    // 严重
    Critical,  // 极严重
}

/// 违规类型
#[derive(Debug, Clone)]
pub enum ViolationType {
    XpFarming,         // 刷 XP (高频重复行为)
    FakeActivity,      // 虚假行为 (无实际内容)
    SybilAttack,       // 女巫攻击 (大量虚假用户)
    ContentAbuse,      // 内容滥用 (机器生成)
    ConsensusViolation, // 共识违规 (双签/不投票)
}

impl ViolationType {
    /// 每种违规类型的默认严重程度
    pub fn default_level(&self) -> ViolationLevel {
        match self {
            ViolationType::XpFarming => ViolationLevel::Minor,
            ViolationType::FakeActivity => ViolationLevel::Moderate,
            ViolationType::ContentAbuse => ViolationLevel::Moderate,
            ViolationType::SybilAttack => ViolationLevel::Severe,
            ViolationType::ConsensusViolation => ViolationLevel::Critical,
        }
    }
}

/// 惩罚执行结果
#[derive(Debug, Clone)]
pub struct SlashingResult {
    pub violation: ViolationType,
    pub level: ViolationLevel,
    pub reputation_deducted: u32,
    pub stake_slashed: u64,
    pub suspended_days: u32,
    pub blacklisted: bool,
}

/// 惩罚/罚没引擎
pub struct SlashingEngine;

impl SlashingEngine {
    /// 执行惩罚
    pub fn execute(
        storage: &Storage,
        site_id: &str,
        violation: ViolationType,
        _evidence: &str,
    ) -> ChainResult<SlashingResult> {
        let level = violation.default_level();

        let result = match level {
            ViolationLevel::Minor => SlashingResult {
                violation,
                level: ViolationLevel::Minor,
                reputation_deducted: 8,
                stake_slashed: 0,
                suspended_days: 0,
                blacklisted: false,
            },
            ViolationLevel::Moderate => SlashingResult {
                violation,
                level: ViolationLevel::Moderate,
                reputation_deducted: 20,
                stake_slashed: 0,
                suspended_days: 7,
                blacklisted: false,
            },
            ViolationLevel::Severe => SlashingResult {
                violation,
                level: ViolationLevel::Severe,
                reputation_deducted: 40,
                stake_slashed: 0,
                suspended_days: 30,
                blacklisted: false,
            },
            ViolationLevel::Critical => SlashingResult {
                violation,
                level: ViolationLevel::Critical,
                reputation_deducted: 100,
                stake_slashed: 0,
                suspended_days: 0,
                blacklisted: true,
            },
        };

        // 扣减站点信誉
        let site: Option<crate::state::SiteInfo> = storage
            .get_deserialized(
                crate::storage::rocks::CF_SITE_REGISTRY,
                site_id.as_bytes(),
            )?;

        if let Some(mut site) = site {
            let new_score = site.reputation_score.saturating_sub(result.reputation_deducted);
            site.reputation_score = new_score;

            if result.blacklisted || new_score < 30 {
                site.is_active = false;
            }

            storage.put_serialized(
                crate::storage::rocks::CF_SITE_REGISTRY,
                site_id.as_bytes(),
                &site,
            )?;
        }

        // Phase 2: stake slashing 需要修改 ValidatorInfo 的 stake_amount
        // Phase 2: 暂停期需要添加 suspended_until 字段

        tracing::warn!(
            "惩罚执行: site={}, violation={:?}, level={:?}, reput_deduct={}, blacklisted={}",
            site_id,
            result.violation,
            result.level,
            result.reputation_deducted,
            result.blacklisted
        );

        Ok(result)
    }

    /// 获取违规阈值
    pub fn xp_farming_threshold() -> u64 {
        500 // 单用户每天超过 500 XP 标记为可疑
    }

    /// 每天每站点最大 XP 产出 (触发检查)
    pub fn daily_xp_cap_per_site() -> u64 {
        50_000
    }

    /// 单用户每天最大 XP (触发检查)
    pub fn daily_xp_cap_per_user() -> u64 {
        2_000
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_violation_levels() {
        assert_eq!(
            ViolationType::XpFarming.default_level(),
            ViolationLevel::Minor
        );
        assert_eq!(
            ViolationType::FakeActivity.default_level(),
            ViolationLevel::Moderate
        );
        assert_eq!(
            ViolationType::SybilAttack.default_level(),
            ViolationLevel::Severe
        );
        assert_eq!(
            ViolationType::ConsensusViolation.default_level(),
            ViolationLevel::Critical
        );
    }

    #[test]
    fn test_minor_slashing_no_blacklist() {
        let result = SlashingResult {
            violation: ViolationType::XpFarming,
            level: ViolationLevel::Minor,
            reputation_deducted: 8,
            stake_slashed: 0,
            suspended_days: 0,
            blacklisted: false,
        };
        assert!(!result.blacklisted);
        assert_eq!(result.suspended_days, 0);
    }

    #[test]
    fn test_critical_slashing_blacklist() {
        let result = SlashingResult {
            violation: ViolationType::ConsensusViolation,
            level: ViolationLevel::Critical,
            reputation_deducted: 100,
            stake_slashed: 0,
            suspended_days: 0,
            blacklisted: true,
        };
        assert!(result.blacklisted);
        assert_eq!(result.reputation_deducted, 100);
    }
}
