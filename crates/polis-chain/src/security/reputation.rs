//! 站点信誉计算引擎
//!
//! 五个维度综合评分 (各 20 分，满分 100):
//!   1. 用户多样性 (25%): 活跃用户分布的熵值
//!   2. 行为质量 (30%): 内容长度、复杂度、时间分布合理度
//!   3. 历史一致性 (20%): CUSUM 突变检测
//!   4. 链上数据 (25%): 质押金额/时长

use crate::storage::rocks::Storage;

/// 信誉维度
#[derive(Debug, Clone)]
pub struct ReputationDimensions {
    pub user_diversity: f64,     // 0-25
    pub behavior_quality: f64,   // 0-30
    pub historical_consistency: f64, // 0-20
    pub onchain_commitment: f64, // 0-25
}

impl ReputationDimensions {
    pub fn total(&self) -> u32 {
        (self.user_diversity
            + self.behavior_quality
            + self.historical_consistency
            + self.onchain_commitment)
            .round()
            .min(100.0) as u32
    }
}

/// 信誉等级
#[derive(Debug, Clone, PartialEq)]
pub enum ReputationLevel {
    Platinum,  // 90+
    Gold,      // 70-89
    Silver,    // 50-69
    Bronze,    // 30-49
    Flagged,   // 0-29
}

impl ReputationLevel {
    pub fn from_score(score: u32) -> Self {
        match score {
            90..=100 => ReputationLevel::Platinum,
            70..=89 => ReputationLevel::Gold,
            50..=69 => ReputationLevel::Silver,
            30..=49 => ReputationLevel::Bronze,
            _ => ReputationLevel::Flagged,
        }
    }

    /// XP 有效系数: 信誉越低, XP 实际价值越少
    pub fn xp_multiplier(&self) -> f64 {
        match self {
            ReputationLevel::Platinum => 1.0,
            ReputationLevel::Gold => 0.9,
            ReputationLevel::Silver => 0.75,
            ReputationLevel::Bronze => 0.5,
            ReputationLevel::Flagged => 0.0,
        }
    }
}

/// 信誉计算引擎
pub struct ReputationEngine;

impl ReputationEngine {
    /// 基于站点行为数据计算信誉分
    pub fn calculate(
        _storage: &Storage,
        site_id: &str,
        recent_activities: &[ActivityStats],
    ) -> ReputationDimensions {
        let activity_count = recent_activities.len() as f64;

        // 1. 用户多样性 (0-25): 基于独立用户数
        let unique_users: std::collections::HashSet<_> =
            recent_activities.iter().map(|a| &a.user_ref).collect();
        let diversity = if activity_count > 0.0 {
            let ratio = (unique_users.len() as f64 / activity_count).min(1.0);
            ratio * 25.0
        } else {
            0.0
        };

        // 2. 行为质量 (0-30): 基于平均 XP 值和行为类型多样性
        let avg_xp: f64 = if !recent_activities.is_empty() {
            recent_activities.iter().map(|a| a.xp_value as f64).sum::<f64>()
                / recent_activities.len() as f64
        } else {
            0.0
        };
        let unique_actions: std::collections::HashSet<_> =
            recent_activities.iter().map(|a| &a.action_type).collect();
        let action_variety = (unique_actions.len() as f64 / 8.0).min(1.0); // 假设 8 种行为类型

        let quality = (avg_xp / 10.0).min(1.0) * 15.0 + action_variety * 15.0;

        // 3. 历史一致性 (0-20): 时间分布的标准差
        let consistency = if recent_activities.len() >= 2 {
            let timestamps: Vec<f64> = recent_activities.iter().map(|a| a.timestamp as f64).collect();
            let mean: f64 = timestamps.iter().sum::<f64>() / timestamps.len() as f64;
            let variance: f64 = timestamps.iter().map(|t| (t - mean).powi(2)).sum::<f64>()
                / timestamps.len() as f64;
            let cv = variance.sqrt() / mean.max(1.0); // 变异系数
            // 过于规律 (cv 很小) 或过于混乱 (cv 很大) 都减分
            (1.0 - (cv - 0.5).abs().min(1.0)) * 20.0
        } else {
            10.0 // 数据不足，给中间分
        };

        // 4. 链上承诺 (0-25): 从存储读取站点质押/时长
        let onchain = Self::calculate_onchain_commitment(_storage, site_id);

        ReputationDimensions {
            user_diversity: diversity,
            behavior_quality: quality,
            historical_consistency: consistency,
            onchain_commitment: onchain,
        }
    }

    /// 计算链上承诺分数 (基于验证者质押)
    fn calculate_onchain_commitment(storage: &Storage, site_id: &str) -> f64 {
        let validators: Vec<_> = storage
            .scan_prefix(crate::storage::rocks::CF_VALIDATORS, b"")
            .unwrap_or_default()
            .iter()
            .filter_map(|(_, v)| bincode::deserialize::<crate::state::ValidatorInfo>(v).ok())
            .filter(|v| v.site_id.as_deref() == Some(site_id))
            .collect();

        if validators.is_empty() {
            return 5.0; // 未质押, 基础分
        }

        let total_stake: u64 = validators.iter().map(|v| v.stake_amount).sum();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let max_duration: u64 = validators
            .iter()
            .map(|v| now.saturating_sub(v.joined_at))
            .max()
            .unwrap_or(0);

        let stake_score = (total_stake as f64 / 100_000.0).min(1.0) * 12.5;
        let duration_score = (max_duration as f64 / (86400.0 * 365.0)).min(1.0) * 12.5;

        stake_score + duration_score
    }

    /// 检测 XP 异常 (CUSUM 突变检测简化版)
    pub fn detect_anomaly(history: &[u64], current: u64, threshold: f64) -> bool {
        if history.len() < 10 {
            return false; // 数据不足
        }

        let mean: f64 = history.iter().sum::<u64>() as f64 / history.len() as f64;
        let variance: f64 = history
            .iter()
            .map(|&x| (x as f64 - mean).powi(2))
            .sum::<f64>()
            / history.len() as f64;
        let std_dev = variance.sqrt().max(1.0);

        let z_score = (current as f64 - mean) / std_dev;
        z_score > threshold
    }
}

/// 简化的活动统计 (从链上数据聚合)
#[derive(Debug, Clone)]
pub struct ActivityStats {
    pub user_ref: String,
    pub action_type: String,
    pub xp_value: u32,
    pub timestamp: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reputation_levels() {
        assert_eq!(ReputationLevel::from_score(95), ReputationLevel::Platinum);
        assert_eq!(ReputationLevel::from_score(75), ReputationLevel::Gold);
        assert_eq!(ReputationLevel::from_score(55), ReputationLevel::Silver);
        assert_eq!(ReputationLevel::from_score(35), ReputationLevel::Bronze);
        assert_eq!(ReputationLevel::from_score(15), ReputationLevel::Flagged);
    }

    #[test]
    fn test_xp_multiplier() {
        assert!((ReputationLevel::Platinum.xp_multiplier() - 1.0).abs() < 0.001);
        assert!((ReputationLevel::Flagged.xp_multiplier() - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_anomaly_detection_normal() {
        let history = vec![10u64, 12, 11, 10, 13, 11, 12, 10, 11, 12];
        assert!(!ReputationEngine::detect_anomaly(&history, 13, 3.0));
    }

    #[test]
    fn test_anomaly_detection_spike() {
        let history = vec![10u64, 12, 11, 10, 13, 11, 12, 10, 11, 12];
        assert!(ReputationEngine::detect_anomaly(&history, 100, 3.0));
    }
}
