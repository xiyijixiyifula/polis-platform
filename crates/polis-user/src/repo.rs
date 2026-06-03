use polis_core::error::AppError;
use polis_core::models::{
    InviteCode, InviteReward, OnboardingQuest, User, UserBadge, UserQuest, UserXp, UserXpLog,
};
use sqlx::PgPool;
use uuid::Uuid;

/// 用户数据访问层
pub struct UserRepo {
    pub pool: PgPool,
}

impl UserRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// 根据邮箱查找用户
    pub async fn find_by_email(&self, email: &str) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            "SELECT * FROM users WHERE email = $1",
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await?;
        Ok(user)
    }

    /// 根据用户名查找用户
    pub async fn find_by_username(&self, username: &str) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            "SELECT * FROM users WHERE LOWER(username) = LOWER($1)",
        )
        .bind(username)
        .fetch_optional(&self.pool)
        .await?;
        Ok(user)
    }

    /// 根据 ID 查找用户
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            "SELECT * FROM users WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(user)
    }

    /// 创建用户
    pub async fn create(
        &self,
        username: &str,
        display_name: &str,
        email: &str,
        password_hash: &str,
    ) -> Result<User, AppError> {
        let user = sqlx::query_as::<_, User>(
            r#"
            INSERT INTO users (username, display_name, email, password_hash)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            "#,
        )
        .bind(username)
        .bind(display_name)
        .bind(email)
        .bind(password_hash)
        .fetch_one(&self.pool)
        .await?;
        Ok(user)
    }

    /// 更新用户资料
    pub async fn update_profile(
        &self,
        user_id: Uuid,
        display_name: Option<&str>,
        avatar_url: Option<&str>,
        bio: Option<&str>,
        notification_prefs: Option<&serde_json::Value>,
    ) -> Result<User, AppError> {
        let user = sqlx::query_as::<_, User>(
            r#"
            UPDATE users
            SET display_name = COALESCE($2, display_name),
                avatar_url = COALESCE($3, avatar_url),
                bio = COALESCE($4, bio),
                notification_prefs = COALESCE($5, notification_prefs),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(user_id)
        .bind(display_name)
        .bind(avatar_url)
        .bind(bio)
        .bind(notification_prefs)
        .fetch_one(&self.pool)
        .await?;
        Ok(user)
    }

    /// 搜索用户 (模糊匹配 username 和 display_name)
    pub async fn search_users(&self, query: &str, limit: u32) -> Result<Vec<User>, AppError> {
        let pattern = format!("%{}%", query);
        let users = sqlx::query_as::<_, User>(
            "SELECT * FROM users WHERE username ILIKE $1 OR display_name ILIKE $1 OR id::text = $2 ORDER BY created_at DESC LIMIT $3",
        )
        .bind(&pattern)
        .bind(query)
        .bind(limit as i64)
        .fetch_all(&self.pool)
        .await?;
        Ok(users)
    }

    /// 获取用户的社区列表
    pub async fn find_user_spaces(&self, user_id: Uuid) -> Result<Vec<Uuid>, AppError> {
        let rows: Vec<(Uuid,)> = sqlx::query_as(
            "SELECT space_id FROM memberships WHERE user_id = $1 AND role != 'banned'",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    /// 查询用户拥有的社区（owner）
    pub async fn find_spaces_by_owner(&self, owner_id: Uuid) -> Result<Vec<serde_json::Value>, AppError> {
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            r#"SELECT json_build_object(
                'id', s.id,
                'namespace', s.namespace,
                'slug', s.slug,
                'owner_id', s.owner_id,
                'title', s.title,
                'description', s.description,
                'icon_url', s.icon_url,
                'visibility', s.visibility,
                'status', s.status,
                'member_count', s.member_count,
                'post_count', s.post_count,
                'is_root', s.is_root,
                'created_at', s.created_at
            ) FROM spaces s WHERE s.owner_id = $1 AND s.status = 'active' ORDER BY s.created_at DESC"#
        )
        .bind(owner_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    /// 获取用户所有帖子的获赞总数
    pub async fn get_user_total_likes(&self, user_id: Uuid) -> Result<i64, AppError> {
        let total: i64 = sqlx::query_scalar(
            "SELECT COALESCE(SUM(like_count), 0) FROM posts WHERE author_id = $1 AND is_deleted = FALSE"
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(total)
    }

    /// 获取用户发帖数量
    pub async fn get_user_post_count(&self, user_id: Uuid) -> Result<i64, AppError> {
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM posts WHERE author_id = $1 AND is_deleted = FALSE"
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(count)
    }

    // ==================== XP 系统 ====================

    pub async fn get_or_create_user_xp(&self, user_id: Uuid) -> Result<UserXp, AppError> {
        let xp = sqlx::query_as::<_, UserXp>(
            "SELECT * FROM user_xp WHERE user_id = $1"
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;
        if let Some(xp) = xp {
            return Ok(xp);
        }
        sqlx::query_as::<_, UserXp>(
            "INSERT INTO user_xp (user_id, total_xp, current_level) VALUES ($1, 0, 1) RETURNING *"
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await
        .map_err(AppError::from)
    }

    pub async fn award_xp(&self, user_id: Uuid, action_type: &str, xp_gained: i32, description: &str, target_type: Option<&str>, target_id: Option<Uuid>) -> Result<i64, AppError> {
        let xp = self.get_or_create_user_xp(user_id).await?;
        let new_total = xp.total_xp + xp_gained as i64;
        let new_level = self.calculate_level(new_total);
        sqlx::query("UPDATE user_xp SET total_xp = $2, current_level = $3, updated_at = now() WHERE user_id = $1")
            .bind(user_id).bind(new_total).bind(new_level)
            .execute(&self.pool).await?;
        sqlx::query(
            "INSERT INTO user_xp_log (user_id, action_type, xp_gained, description, target_type, target_id) VALUES ($1, $2, $3, $4, $5, $6)"
        )
        .bind(user_id).bind(action_type).bind(xp_gained).bind(description).bind(target_type).bind(target_id)
        .execute(&self.pool).await?;
        Ok(new_total)
    }

    fn calculate_level(&self, total_xp: i64) -> i32 {
        // Lv.1(0) → Lv.5(500) → Lv.10(2000) → Lv.15(10000) → Lv.20(100000)
        let thresholds: &[(i64, i32)] = &[
            (0, 1), (50, 2), (120, 3), (220, 4), (350, 5),
            (500, 6), (700, 7), (950, 8), (1250, 9), (1600, 10),
            (2000, 11), (3000, 12), (4500, 13), (6500, 14), (9000, 15),
            (12000, 16), (20000, 17), (35000, 18), (60000, 19), (100000, 20),
        ];
        let mut level = 1;
        for (threshold, lv) in thresholds {
            if total_xp >= *threshold {
                level = *lv;
            } else {
                break;
            }
        }
        level
    }

    pub async fn get_user_xp_logs(&self, user_id: Uuid, limit: i64) -> Result<Vec<UserXpLog>, AppError> {
        sqlx::query_as::<_, UserXpLog>(
            "SELECT * FROM user_xp_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2"
        )
        .bind(user_id).bind(limit)
        .fetch_all(&self.pool).await
        .map_err(AppError::from)
    }

    pub async fn get_onboarding_quests(&self) -> Result<Vec<OnboardingQuest>, AppError> {
        sqlx::query_as::<_, OnboardingQuest>(
            "SELECT * FROM onboarding_quests WHERE is_active = true ORDER BY sort_order"
        )
        .fetch_all(&self.pool).await
        .map_err(AppError::from)
    }

    pub async fn get_user_quests(&self, user_id: Uuid) -> Result<Vec<UserQuest>, AppError> {
        sqlx::query_as::<_, UserQuest>(
            "SELECT * FROM user_quests WHERE user_id = $1"
        )
        .bind(user_id).fetch_all(&self.pool).await
        .map_err(AppError::from)
    }

    pub async fn get_daily_xp(&self, user_id: Uuid) -> Result<(i32, Option<chrono::NaiveDate>), AppError> {
        let row: Option<(i32, Option<chrono::NaiveDate>)> = sqlx::query_as(
            "SELECT daily_xp, daily_xp_date FROM user_xp WHERE user_id = $1"
        )
        .bind(user_id).fetch_optional(&self.pool).await?;
        Ok(row.unwrap_or((0, None)))
    }

    pub async fn set_daily_xp(&self, user_id: Uuid, xp: i32) -> Result<(), AppError> {
        sqlx::query("UPDATE user_xp SET daily_xp = $2, daily_xp_date = CURRENT_DATE WHERE user_id = $1")
            .bind(user_id).bind(xp)
            .execute(&self.pool).await?;
        Ok(())
    }

    // ==================== 新手任务 ====================

    pub async fn complete_quest(&self, user_id: Uuid, quest_key: &str) -> Result<bool, AppError> {
        let existing = sqlx::query_scalar::<_, bool>(
            "SELECT is_completed FROM user_quests WHERE user_id = $1 AND quest_key = $2"
        )
        .bind(user_id).bind(quest_key)
        .fetch_optional(&self.pool).await?;
        if existing.unwrap_or(false) {
            return Ok(false);
        }
        sqlx::query(
            "INSERT INTO user_quests (user_id, quest_key, is_completed, completed_at) VALUES ($1, $2, true, now()) ON CONFLICT (user_id, quest_key) DO UPDATE SET is_completed = true, completed_at = now()"
        )
        .bind(user_id).bind(quest_key)
        .execute(&self.pool).await?;
        Ok(true)
    }

    pub async fn claim_quest(&self, user_id: Uuid, quest_key: &str) -> Result<Option<i32>, AppError> {
        let quest: Option<(bool, bool)> = sqlx::query_as(
            "SELECT is_completed, is_claimed FROM user_quests WHERE user_id = $1 AND quest_key = $2"
        )
        .bind(user_id).bind(quest_key).fetch_optional(&self.pool).await?;
        match quest {
            Some((true, false)) => {
                sqlx::query("UPDATE user_quests SET is_claimed = true, claimed_at = now() WHERE user_id = $1 AND quest_key = $2")
                    .bind(user_id).bind(quest_key).execute(&self.pool).await?;
                let xp: i32 = sqlx::query_scalar("SELECT xp_reward FROM onboarding_quests WHERE quest_key = $1")
                    .bind(quest_key).fetch_one(&self.pool).await?;
                Ok(Some(xp))
            }
            _ => Ok(None),
        }
    }

    // ==================== 徽章 ====================

    pub async fn award_badge(&self, user_id: Uuid, badge_key: &str, badge_name: &str, badge_icon: &str, badge_description: &str) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO user_badges (user_id, badge_key, badge_name, badge_icon, badge_description) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING"
        )
        .bind(user_id).bind(badge_key).bind(badge_name).bind(badge_icon).bind(badge_description)
        .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn get_user_badges(&self, user_id: Uuid) -> Result<Vec<UserBadge>, AppError> {
        sqlx::query_as::<_, UserBadge>(
            "SELECT * FROM user_badges WHERE user_id = $1 ORDER BY earned_at DESC"
        )
        .bind(user_id).fetch_all(&self.pool).await
        .map_err(AppError::from)
    }

    // ==================== 邀请系统 ====================

    pub async fn create_invite_code(&self, inviter_id: Uuid) -> Result<InviteCode, AppError> {
        let code = Uuid::new_v4().to_string().replace("-", "")[..8].to_string().to_uppercase();
        sqlx::query_as::<_, InviteCode>(
            "INSERT INTO invite_codes (code, inviter_id, status) VALUES ($1, $2, 'active') RETURNING *"
        )
        .bind(&code).bind(inviter_id)
        .fetch_one(&self.pool).await
        .map_err(AppError::from)
    }

    pub async fn get_user_invite_codes(&self, inviter_id: Uuid) -> Result<Vec<InviteCode>, AppError> {
        sqlx::query_as::<_, InviteCode>(
            "SELECT * FROM invite_codes WHERE inviter_id = $1 ORDER BY created_at DESC"
        )
        .bind(inviter_id).fetch_all(&self.pool).await
        .map_err(AppError::from)
    }

    pub async fn get_invite_rewards(&self, inviter_id: Uuid) -> Result<Vec<InviteReward>, AppError> {
        sqlx::query_as::<_, InviteReward>(
            "SELECT * FROM invite_rewards WHERE inviter_id = $1 ORDER BY created_at DESC"
        )
        .bind(inviter_id).fetch_all(&self.pool).await
        .map_err(AppError::from)
    }

    pub async fn count_invitees(&self, inviter_id: Uuid) -> Result<i64, AppError> {
        sqlx::query_scalar("SELECT COUNT(*) FROM invite_codes WHERE inviter_id = $1 AND status = 'redeemed'")
            .bind(inviter_id).fetch_one(&self.pool).await
            .map_err(AppError::from)
    }

    pub async fn find_invite_code(&self, code: &str) -> Result<Option<InviteCode>, AppError> {
        sqlx::query_as::<_, InviteCode>("SELECT * FROM invite_codes WHERE code = $1")
            .bind(code).fetch_optional(&self.pool).await
            .map_err(AppError::from)
    }

    pub async fn redeem_invite(&self, code: &str, invitee_id: Uuid) -> Result<Option<Uuid>, AppError> {
        let invite = self.find_invite_code(code).await?;
        match invite {
            Some(c) if c.status == "active" => {
                sqlx::query("UPDATE invite_codes SET status = 'redeemed', invitee_id = $2, redeemed_at = now() WHERE id = $1")
                    .bind(c.id).bind(invitee_id).execute(&self.pool).await?;
                Ok(Some(c.inviter_id))
            }
            _ => Ok(None),
        }
    }

    pub async fn create_invite_reward(&self, inviter_id: Uuid, invitee_id: Uuid, xp: i32) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO invite_rewards (inviter_id, invitee_id, reward_type, xp_amount) VALUES ($1, $2, 'invite_accepted', $3)"
        )
        .bind(inviter_id).bind(invitee_id).bind(xp)
        .execute(&self.pool).await?;
        Ok(())
    }

    // ==================== Push 订阅 ====================

    pub async fn save_push_subscription(&self, user_id: Uuid, endpoint: &str, p256dh: &str, auth: &str, user_agent: Option<&str>) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, user_agent) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh_key = $3, auth_key = $4, user_agent = $5, last_used_at = now()"
        )
        .bind(user_id).bind(endpoint).bind(p256dh).bind(auth).bind(user_agent)
        .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn get_push_subscriptions(&self, user_id: Uuid) -> Result<Vec<(String, String, String)>, AppError> {
        let rows: Vec<(String, String, String)> = sqlx::query_as(
            "SELECT endpoint, p256dh_key, auth_key FROM push_subscriptions WHERE user_id = $1"
        )
        .bind(user_id).fetch_all(&self.pool).await?;
        Ok(rows)
    }

    pub async fn delete_push_subscription(&self, user_id: Uuid, endpoint: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2")
            .bind(user_id).bind(endpoint).execute(&self.pool).await?;
        Ok(())
    }
}
