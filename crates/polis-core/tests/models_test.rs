use polis_core::models::*;
use polis_core::types::*;
use polis_core::resolver;

#[test]
fn test_api_response_success() {
    let resp = ApiResponse::success("hello".to_string());
    assert_eq!(resp.code, 0);
    assert_eq!(resp.message, "ok");
    assert_eq!(resp.data, Some("hello".to_string()));
    assert!(resp.pagination.is_none());
}

#[test]
fn test_api_response_error() {
    let resp: ApiResponse<()> = ApiResponse::error(1001, "Unauthorized");
    assert_eq!(resp.code, 1001);
    assert_eq!(resp.message, "Unauthorized");
    assert!(resp.data.is_none());
}

#[test]
fn test_api_response_pagination() {
    let pagination = Pagination {
        page: 1,
        page_size: 20,
        total: 100,
        total_pages: 5,
    };
    let resp = ApiResponse::success_with_pagination(vec![1, 2, 3], pagination);
    let p = resp.pagination.unwrap();
    assert_eq!(p.page, 1);
    assert_eq!(p.total_pages, 5);
    assert_eq!(p.total, 100);
}

#[test]
fn test_user_public_from_user() {
    let user = User {
        id: uuid::Uuid::new_v4(),
        username: "testuser".to_string(),
        display_name: "Test User".to_string(),
        email: "test@example.com".to_string(),
        password_hash: "hashed_pwd".to_string(),
        avatar_url: Some("https://example.com/avatar.png".to_string()),
        bio: "A test user".to_string(),
        verified: true,
        verified_type: Some("personal".to_string()),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    let public: UserPublic = user.into();
    assert_eq!(public.username, "testuser");
    assert_eq!(public.display_name, "Test User");
    assert_eq!(public.avatar_url, Some("https://example.com/avatar.png".to_string()));
    assert!(public.verified);
    // Sensitive fields should not be in public
    // email and password_hash are not accessible
}

#[test]
fn test_space_public_from_space() {
    let space = Space {
        id: uuid::Uuid::new_v4(),
        namespace: "testuser/test-space".to_string(),
        slug: "test-space".to_string(),
        owner_id: Some(uuid::Uuid::new_v4()),
        is_root: false,
        root_space_id: Some(uuid::Uuid::new_v4()),
        title: "测试社区".to_string(),
        description: "这是一个测试社区".to_string(),
        icon_url: None,
        banner_url: None,
        visibility: "public".to_string(),
        status: "active".to_string(),
        custom_rules: serde_json::json!([]),
        enabled_modules: serde_json::json!(["forum", "article"]),
        metadata: serde_json::json!({}),
        member_count: 100,
        post_count: 50,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    let public: SpacePublic = space.into();
    assert_eq!(public.slug, "test-space");
    assert_eq!(public.title, "测试社区");
    assert_eq!(public.member_count, 100);
    assert_eq!(public.post_count, 50);
    assert!(matches!(public.status, SpaceStatus::Active));
    assert!(matches!(public.visibility, Visibility::Public));
}

#[test]
fn test_visibility_default() {
    assert_eq!(Visibility::default(), Visibility::Public);
}

#[test]
fn test_space_status_default() {
    assert_eq!(SpaceStatus::default(), SpaceStatus::Active);
}

#[test]
fn test_module_type_default() {
    assert_eq!(ModuleType::default(), ModuleType::Forum);
}

#[test]
fn test_content_type_default() {
    assert_eq!(ContentType::default(), ContentType::Text);
}

#[test]
fn test_display_visibility() {
    assert_eq!(Visibility::Public.to_string(), "public");
    assert_eq!(Visibility::Private.to_string(), "private");
}

#[test]
fn test_display_module_type() {
    assert_eq!(ModuleType::Forum.to_string(), "forum");
    assert_eq!(ModuleType::Article.to_string(), "article");
    assert_eq!(ModuleType::ShortVideo.to_string(), "short_video");
    assert_eq!(ModuleType::CodeRepo.to_string(), "code_repo");
}

#[test]
fn test_display_content_type() {
    assert_eq!(ContentType::Text.to_string(), "text");
    assert_eq!(ContentType::Video.to_string(), "video");
    assert_eq!(ContentType::Code.to_string(), "code");
}

#[test]
fn test_pagination_params_default() {
    let params = PaginationParams::default();
    assert_eq!(params.page, Some(1));
    assert_eq!(params.page_size, Some(20));
}

#[test]
fn test_resolver_parse_root_namespace() {
    let parts = resolver::parse_namespace("测试社区");
    assert!(parts.is_root);
    assert_eq!(parts.slug, "测试社区");
    assert!(parts.username.is_none());
}

#[test]
fn test_resolver_parse_user_namespace() {
    let parts = resolver::parse_namespace("用户名/测试社区");
    assert!(!parts.is_root);
    assert_eq!(parts.username.as_deref(), Some("用户名"));
    assert_eq!(parts.slug, "测试社区");
}

#[test]
fn test_resolver_build_namespace() {
    assert_eq!(resolver::build_namespace("user", "slug"), "user/slug");
    assert_eq!(resolver::build_root_namespace("root"), "root");
}

#[test]
fn test_post_serialize() {
    let post = Post {
        id: uuid::Uuid::new_v4(),
        space_id: uuid::Uuid::new_v4(),
        module_type: "forum".to_string(),
        author_id: uuid::Uuid::new_v4(),
        title: "测试帖子".to_string(),
        body: "内容".to_string(),
        content_type: "text".to_string(),
        media_urls: serde_json::json!([]),
        tags: serde_json::json!(["测试", "Rust"]),
        visibility: "public".to_string(),
        is_pinned: false,
        is_featured: true,
        is_deleted: false,
        view_count: 100,
        like_count: 10,
        comment_count: 5,
        metadata: serde_json::json!({}),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    let json = serde_json::to_value(&post).unwrap();
    assert_eq!(json["title"], "测试帖子");
    assert_eq!(json["view_count"], 100);
    assert_eq!(json["like_count"], 10);
}

#[test]
fn test_visibility_serde() {
    let json = serde_json::to_value(&Visibility::Public).unwrap();
    assert_eq!(json, "public");

    let v: Visibility = serde_json::from_str("\"private\"").unwrap();
    assert!(matches!(v, Visibility::Private));
}

#[test]
fn test_module_type_serde() {
    let json = serde_json::to_value(&ModuleType::CodeRepo).unwrap();
    assert_eq!(json, "code_repo");

    let m: ModuleType = serde_json::from_str("\"qa\"").unwrap();
    assert!(matches!(m, ModuleType::Qa));
}

#[test]
fn test_create_register_request() {
    let req = RegisterRequest {
        username: "newuser".to_string(),
        display_name: "New User".to_string(),
        email: "new@example.com".to_string(),
        password: "securepassword".to_string(),
    };
    assert_eq!(req.username, "newuser");
    assert_eq!(req.email, "new@example.com");
    assert!(req.password.len() >= 8);
}

#[test]
fn test_create_space_request_defaults() {
    let req = CreateSpaceRequest {
        slug: "test-community".to_string(),
        title: "测试社区".to_string(),
        description: Some("描述".to_string()),
        visibility: None,
        enabled_modules: Some(vec![ModuleType::Forum, ModuleType::Article]),
    };
    assert_eq!(req.slug, "test-community");
    assert!(req.enabled_modules.is_some());
    let modules = req.enabled_modules.unwrap();
    assert_eq!(modules.len(), 2);
}

#[test]
fn test_member_role_types() {
    assert!(!matches!(MemberRole::Owner, MemberRole::Member));
    match MemberRole::Admin {
        MemberRole::Admin => {} 
        _ => panic!("Expected Admin"),
    }
}

#[test]
fn test_resolver_ref_serde() {
    let space_ref = resolver::SpaceRef {
        space_id: uuid::Uuid::new_v4(),
        namespace: "user/community".to_string(),
        slug: "community".to_string(),
        owner_id: Some(uuid::Uuid::new_v4()),
        is_root: false,
        root_space_id: Some(uuid::Uuid::new_v4()),
    };

    let json = serde_json::to_value(&space_ref).unwrap();
    assert_eq!(json["namespace"], "user/community");
    assert_eq!(json["slug"], "community");
    assert!(!json["is_root"].as_bool().unwrap());
}

#[test]
fn test_pagination_params_deserialize() {
    let params: PaginationParams = serde_json::from_str(r#"{"page": 3, "page_size": 50}"#).unwrap();
    assert_eq!(params.page, Some(3));
    assert_eq!(params.page_size, Some(50));
}

#[test]
fn test_member_role_display() {
    assert_eq!(serde_json::to_value(&MemberRole::Moderator).unwrap(), "moderator");
    assert_eq!(serde_json::to_value(&MemberRole::Banned).unwrap(), "banned");
}

#[test]
fn test_member_role_default() {
    assert_eq!(MemberRole::default(), MemberRole::Member);
}
