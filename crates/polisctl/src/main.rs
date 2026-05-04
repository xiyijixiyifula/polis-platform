mod config;
mod http;
mod output;
mod commands;

use clap::{Parser, Subcommand};
use config::Config;
use http::HttpClient;

/// polisctl — Polis Platform CLI v1.0
/// Complete command-line interface for the Polis community platform.
/// Set POLIS_FORMAT=json for AI-friendly output.
#[derive(Parser)]
#[command(name = "polisctl", version = "1.0.0", about, long_about = None)]
struct Cli {
    /// Override API base URL (default: $POLIS_BASE_URL or https://www.mzgw.com)
    #[arg(long, global = true)]
    base_url: Option<String>,
    /// Output format: json or table (default: $POLIS_FORMAT or json)
    #[arg(short = 'f', long, global = true)]
    format: Option<String>,
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Authentication: register, login, whoami, logout, token
    Auth {
        #[command(subcommand)]
        action: AuthAction,
    },
    /// Profile management: view, update, password, spaces, followers, following
    Profile {
        #[command(subcommand)]
        action: ProfileAction,
    },
    /// Follow users or spaces
    Follow {
        #[command(subcommand)]
        action: FollowAction,
    },
    /// Space management: search, trending, get, join, leave, create, update, root, subspaces
    Space {
        #[command(subcommand)]
        action: SpaceAction,
    },
    /// Post management: list, get, create, update, delete, search, featured
    Post {
        #[command(subcommand)]
        action: PostAction,
    },
    /// Comment management: list, create
    Comment {
        #[command(subcommand)]
        action: CommentAction,
    },
    /// Like a post
    Like {
        /// Space namespace
        namespace: String,
        /// Post ID
        post_id: String,
    },
    /// Vote on content: up, down, score
    Vote {
        #[command(subcommand)]
        action: VoteAction,
    },
    /// Bookmark management: add, list
    Bookmark {
        #[command(subcommand)]
        action: BookmarkAction,
    },
    /// Report a post
    Report {
        /// Space namespace
        namespace: String,
        /// Post ID
        post_id: String,
        /// Report reason
        reason: String,
    },
    /// Poll management: list, all, get, vote, create
    Poll {
        #[command(subcommand)]
        action: PollAction,
    },
    /// Series/Collection management: list, get, create
    Series {
        #[command(subcommand)]
        action: SeriesAction,
    },
    /// Membership tier management: list, create
    Tier {
        #[command(subcommand)]
        action: TierAction,
    },
    /// Subscription management: join, cancel, status
    Subscribe {
        #[command(subcommand)]
        action: SubscribeAction,
    },
    /// File management: list, upload
    File {
        #[command(subcommand)]
        action: FileAction,
    },
    /// Draft management: save, list
    Draft {
        #[command(subcommand)]
        action: DraftAction,
    },
    /// Notification management: list, unread, read-all
    Notify {
        #[command(subcommand)]
        action: NotifyAction,
    },
    /// Space announcements
    Announce {
        /// Space namespace
        namespace: String,
    },
    /// Admin operations (requires admin login)
    Admin {
        #[command(subcommand)]
        action: AdminAction,
    },
}

// === Auth Subcommands ===
#[derive(Subcommand)]
enum AuthAction {
    /// Register a new account and auto-login
    Register {
        /// Username
        username: String,
        /// Email address
        email: String,
        /// Password (min 8 chars)
        password: String,
        /// Display name (optional, defaults to username)
        display_name: Option<String>,
    },
    /// Login with email and password
    Login {
        /// Email address
        email: String,
        /// Password
        password: String,
    },
    /// Show current user info
    Whoami,
    /// Logout and clear local token
    Logout,
    /// Show current access token
    Token,
}

// === Profile Subcommands ===
#[derive(Subcommand)]
enum ProfileAction {
    /// View your profile
    View,
    /// Update profile fields
    Update {
        /// Display name
        #[arg(short, long)]
        display_name: Option<String>,
        /// Bio
        #[arg(short, long)]
        bio: Option<String>,
        /// Avatar URL
        #[arg(long)]
        avatar_url: Option<String>,
    },
    /// Change password
    Password {
        /// Current password
        old_password: String,
        /// New password
        new_password: String,
    },
    /// List your joined spaces
    Spaces,
    /// List your followers
    Followers,
    /// List users you follow
    Following,
}

// === Follow Subcommands ===
#[derive(Subcommand)]
enum FollowAction {
    /// Follow a user
    User {
        /// Username to follow
        username: String,
    },
    /// Follow a space
    Space {
        /// Space namespace
        namespace: String,
    },
}

// === Space Subcommands ===
#[derive(Subcommand)]
enum SpaceAction {
    /// Search spaces
    Search {
        /// Search query
        query: String,
        /// Page number
        #[arg(default_value = "1")]
        page: u32,
        /// Page size
        #[arg(short, long, default_value = "10")]
        size: u32,
    },
    /// List trending spaces
    Trending {
        /// Page number
        #[arg(default_value = "1")]
        page: u32,
        /// Page size
        #[arg(short, long, default_value = "10")]
        size: u32,
    },
    /// Get space details
    Get {
        /// Space namespace
        namespace: String,
    },
    /// Join a space
    Join {
        /// Space namespace
        namespace: String,
    },
    /// Leave a space
    Leave {
        /// Space namespace
        namespace: String,
    },
    /// List space members
    Members {
        /// Space namespace
        namespace: String,
    },
    /// Create a new space
    Create {
        /// Slug (URL-friendly name)
        slug: String,
        /// Title
        title: String,
        /// Description
        #[arg(short, long)]
        description: Option<String>,
        /// Visibility (public/private/unlisted)
        #[arg(short, long, default_value = "public")]
        visibility: String,
    },
    /// Update space info
    Update {
        /// Space namespace
        namespace: String,
        /// New title
        #[arg(short, long)]
        title: Option<String>,
        /// New description
        #[arg(short, long)]
        description: Option<String>,
    },
    /// View root space by slug
    Root {
        /// Root slug
        slug: String,
    },
    /// List subspaces of a root space
    Subspaces {
        /// Root slug
        slug: String,
    },
}

// === Post Subcommands ===
#[derive(Subcommand)]
enum PostAction {
    /// List posts in a space
    List {
        /// Space namespace
        namespace: String,
        /// Page number
        #[arg(default_value = "1")]
        page: u32,
        /// Page size
        #[arg(short, long, default_value = "20")]
        size: u32,
        /// Module type filter
        #[arg(short, long)]
        module: Option<String>,
    },
    /// Get post details
    Get {
        /// Post ID
        post_id: String,
    },
    /// Create a new post
    Create {
        /// Space namespace
        namespace: String,
        /// Post title
        title: String,
        /// Post body (Markdown)
        body: String,
        /// Tags (comma-separated)
        #[arg(short = 'g', long)]
        tags: Option<String>,
        /// Module type
        #[arg(short = 'm', long, default_value = "forum")]
        module: String,
    },
    /// Update a post
    Update {
        /// Post ID
        post_id: String,
        /// New title
        #[arg(short = 't', long)]
        title: Option<String>,
        /// New body
        #[arg(short = 'b', long)]
        body: Option<String>,
        /// New tags (comma-separated)
        #[arg(short = 'g', long)]
        tags: Option<String>,
    },
    /// Delete a post
    Delete {
        /// Post ID
        post_id: String,
    },
    /// Search posts
    Search {
        /// Search query
        query: String,
        /// Max results
        #[arg(default_value = "20")]
        limit: u32,
    },
    /// List featured posts in a space
    Featured {
        /// Space namespace
        namespace: String,
    },
}

// === Comment Subcommands ===
#[derive(Subcommand)]
enum CommentAction {
    /// List comments on a post
    List {
        /// Post ID
        post_id: String,
    },
    /// Create a comment (no namespace needed)
    Create {
        /// Post ID
        post_id: String,
        /// Comment body
        body: String,
        /// Parent comment ID (for replies)
        #[arg(short, long)]
        parent_id: Option<String>,
    },
}

// === Vote Subcommands ===
#[derive(Subcommand)]
enum VoteAction {
    /// Upvote: polisctl vote up <target_type> <target_id>
    Up {
        /// Target type (post or comment)
        target_type: String,
        /// Target ID
        target_id: String,
    },
    /// Downvote: polisctl vote down <target_type> <target_id>
    Down {
        /// Target type (post or comment)
        target_type: String,
        /// Target ID
        target_id: String,
    },
    /// Get vote score: polisctl vote score <target_type> <target_id>
    Score {
        /// Target type (post or comment)
        target_type: String,
        /// Target ID
        target_id: String,
    },
}

// === Bookmark Subcommands ===
#[derive(Subcommand)]
enum BookmarkAction {
    /// Bookmark a post
    Add {
        /// Post ID
        post_id: String,
    },
    /// List bookmarks
    List,
}

// === Poll Subcommands ===
#[derive(Subcommand)]
enum PollAction {
    /// List polls in a space
    List {
        /// Space namespace
        namespace: String,
    },
    /// List all platform polls (global, no auth required)
    All {
        /// Page number
        #[arg(default_value = "1")]
        page: u32,
        /// Page size
        #[arg(short, long, default_value = "20")]
        size: u32,
    },
    /// Get poll details
    Get {
        /// Poll ID
        poll_id: String,
    },
    /// Vote on a poll option
    Vote {
        /// Poll ID
        poll_id: String,
        /// Option ID
        option_id: String,
    },
    /// Create a poll
    Create {
        /// Space ID (UUID)
        space_id: String,
        /// Poll title
        title: String,
        /// Poll options
        options: Vec<String>,
        /// Poll type (single/multiple)
        #[arg(short, long, default_value = "single")]
        poll_type: String,
    },
}

// === Series Subcommands ===
#[derive(Subcommand)]
enum SeriesAction {
    /// List series in a space
    List {
        /// Space namespace
        namespace: String,
    },
    /// Get series details
    Get {
        /// Series ID
        series_id: String,
    },
    /// Create a series
    Create {
        /// Space namespace
        namespace: String,
        /// Series title
        title: String,
        /// Description
        #[arg(short, long)]
        description: Option<String>,
    },
}

// === Tier Subcommands ===
#[derive(Subcommand)]
enum TierAction {
    /// List tiers in a space
    List {
        /// Space namespace
        namespace: String,
    },
    /// Create a tier
    Create {
        /// Space namespace
        namespace: String,
        /// Tier name
        name: String,
        /// Price in cents
        price_cents: i64,
        /// Description
        #[arg(short, long)]
        description: Option<String>,
    },
}

// === Subscribe Subcommands ===
#[derive(Subcommand)]
enum SubscribeAction {
    /// Subscribe to a tier
    Join {
        /// Space namespace
        namespace: String,
        /// Tier ID
        tier_id: String,
    },
    /// Cancel subscription
    Cancel {
        /// Space namespace
        namespace: String,
    },
    /// Check subscription status
    Status {
        /// Space namespace
        namespace: String,
    },
}

// === File Subcommands ===
#[derive(Subcommand)]
enum FileAction {
    /// List files in a space
    List {
        /// Space namespace
        namespace: String,
    },
    /// Upload a file
    Upload {
        /// Space namespace
        namespace: String,
        /// File path
        filepath: String,
    },
}

// === Draft Subcommands ===
#[derive(Subcommand)]
enum DraftAction {
    /// Save a draft
    Save {
        /// Space ID (optional)
        #[arg(short, long)]
        space_id: Option<String>,
        /// Draft title
        title: String,
        /// Draft body
        body: String,
        /// Module type
        #[arg(short, long, default_value = "forum")]
        module: String,
    },
    /// List drafts
    List,
}

// === Notify Subcommands ===
#[derive(Subcommand)]
enum NotifyAction {
    /// List notifications
    List {
        /// Page number
        #[arg(default_value = "1")]
        page: u32,
        /// Page size
        #[arg(short, long, default_value = "10")]
        size: u32,
    },
    /// Get unread count
    Unread,
    /// Mark all as read
    ReadAll,
}

// === Admin Subcommands ===
#[derive(Subcommand)]
enum AdminAction {
    /// Admin login
    Login {
        /// Admin email
        #[arg(default_value = "admin@polis.app")]
        email: String,
        /// Admin code
        #[arg(default_value = "polis2024")]
        code: String,
    },
    /// Dashboard overview
    Dashboard,
    /// Platform statistics
    Stats,
    /// User management
    #[command(subcommand)]
    Users(AdminUsersAction),
    /// Space management
    #[command(subcommand)]
    Spaces(AdminSpacesAction),
    /// Post management
    #[command(subcommand)]
    Posts(AdminPostsAction),
    /// Comment management
    #[command(subcommand)]
    Comments(AdminCommentsAction),
    /// Report management
    #[command(subcommand)]
    Reports(AdminReportsAction),
    /// Transaction records
    Transactions {
        /// Page number
        #[arg(default_value = "1")]
        page: u32,
        /// Page size
        #[arg(short, long, default_value = "20")]
        size: u32,
    },
    /// Analytics data
    Analytics {
        /// Analytics type (users/posts)
        #[arg(default_value = "users")]
        analytics_type: String,
        /// Number of days
        #[arg(default_value = "30")]
        days: u32,
    },
}

#[derive(Subcommand)]
enum AdminUsersAction {
    /// List users
    List {
        #[arg(default_value = "1")]
        page: u32,
        #[arg(short, long, default_value = "20")]
        size: u32,
    },
    /// Get user details
    Get {
        user_id: String,
    },
    /// Ban a user
    Ban {
        user_id: String,
        #[arg(default_value = "violation")]
        reason: String,
    },
    /// Unban a user
    Unban {
        user_id: String,
    },
}

#[derive(Subcommand)]
enum AdminSpacesAction {
    /// List spaces
    List {
        #[arg(default_value = "1")]
        page: u32,
        #[arg(short, long, default_value = "20")]
        size: u32,
    },
    /// Get space details
    Get {
        space_id: String,
    },
    /// Update space status
    Status {
        space_id: String,
        /// New status (active/archived/hidden/closed)
        status: String,
    },
}

#[derive(Subcommand)]
enum AdminPostsAction {
    /// List posts
    List {
        #[arg(default_value = "1")]
        page: u32,
        #[arg(short, long, default_value = "20")]
        size: u32,
    },
    /// Get post details
    Get {
        post_id: String,
    },
    /// Delete a post
    Delete {
        post_id: String,
    },
}

#[derive(Subcommand)]
enum AdminCommentsAction {
    /// List comments
    List {
        #[arg(default_value = "1")]
        page: u32,
        #[arg(short, long, default_value = "20")]
        size: u32,
    },
    /// Delete a comment
    Delete {
        comment_id: String,
    },
}

#[derive(Subcommand)]
enum AdminReportsAction {
    /// List reports
    List {
        #[arg(default_value = "1")]
        page: u32,
        #[arg(short, long, default_value = "20")]
        size: u32,
    },
    /// Resolve a report
    Resolve {
        report_id: String,
    },
    /// Dismiss a report
    Dismiss {
        report_id: String,
    },
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let cli = Cli::parse();

    // Apply CLI overrides to env vars
    if let Some(ref url) = cli.base_url {
        std::env::set_var("POLIS_BASE_URL", url);
    }
    if let Some(ref fmt) = cli.format {
        std::env::set_var("POLIS_FORMAT", fmt);
    }

    let config = Config::new();
    let client = HttpClient::new(&config);

    match cli.command {
        // === Auth ===
        Commands::Auth { action } => match action {
            AuthAction::Register { username, email, password, display_name } => {
                commands::auth::register(&config, &client, &username, &email, &password, display_name.as_deref()).await
            }
            AuthAction::Login { email, password } => {
                commands::auth::login(&config, &client, &email, &password).await
            }
            AuthAction::Whoami => commands::auth::whoami(&config, &client).await,
            AuthAction::Logout => commands::auth::logout(&config).await,
            AuthAction::Token => commands::auth::show_token(&config).await,
        },

        // === Profile ===
        Commands::Profile { action } => match action {
            ProfileAction::View => commands::profile::view(&config, &client).await,
            ProfileAction::Update { display_name, bio, avatar_url } => {
                commands::profile::update(&config, &client, display_name.as_deref(), bio.as_deref(), avatar_url.as_deref()).await
            }
            ProfileAction::Password { old_password, new_password } => {
                commands::profile::password(&config, &client, &old_password, &new_password).await
            }
            ProfileAction::Spaces => commands::profile::spaces(&config, &client).await,
            ProfileAction::Followers => commands::profile::followers(&config, &client).await,
            ProfileAction::Following => commands::profile::following(&config, &client).await,
        },

        // === Follow ===
        Commands::Follow { action } => match action {
            FollowAction::User { username } => commands::follow::follow_user(&config, &client, &username).await,
            FollowAction::Space { namespace } => commands::follow::follow_space(&config, &client, &namespace).await,
        },

        // === Space ===
        Commands::Space { action } => match action {
            SpaceAction::Search { query, page, size } => commands::space::search(&config, &client, &query, page, size).await,
            SpaceAction::Trending { page, size } => commands::space::trending(&config, &client, page, size).await,
            SpaceAction::Get { namespace } => commands::space::get(&config, &client, &namespace).await,
            SpaceAction::Join { namespace } => commands::space::join(&config, &client, &namespace).await,
            SpaceAction::Leave { namespace } => commands::space::leave(&config, &client, &namespace).await,
            SpaceAction::Members { namespace } => commands::space::members(&config, &client, &namespace).await,
            SpaceAction::Create { slug, title, description, visibility } => {
                commands::space::create(&config, &client, &slug, &title, description.as_deref(), Some(&visibility)).await
            }
            SpaceAction::Update { namespace, title, description } => {
                commands::space::update(&config, &client, &namespace, title.as_deref(), description.as_deref()).await
            }
            SpaceAction::Root { slug } => commands::space::root(&config, &client, &slug).await,
            SpaceAction::Subspaces { slug } => commands::space::subspaces(&config, &client, &slug).await,
        },

        // === Post ===
        Commands::Post { action } => match action {
            PostAction::List { namespace, page, size, module } => {
                commands::post::list(&config, &client, &namespace, page, size, module.as_deref()).await
            }
            PostAction::Get { post_id } => commands::post::get(&config, &client, &post_id).await,
            PostAction::Create { namespace, title, body, tags, module } => {
                commands::post::create(&config, &client, &namespace, &title, &body, tags.as_deref(), Some(&module)).await
            }
            PostAction::Update { post_id, title, body, tags } => {
                commands::post::update(&config, &client, &post_id, title.as_deref(), body.as_deref(), tags.as_deref()).await
            }
            PostAction::Delete { post_id } => commands::post::delete(&config, &client, &post_id).await,
            PostAction::Search { query, limit } => commands::post::search_posts(&config, &client, &query, limit).await,
            PostAction::Featured { namespace } => commands::post::featured(&config, &client, &namespace).await,
        },

        // === Comment ===
        Commands::Comment { action } => match action {
            CommentAction::List { post_id } => commands::comment::list(&config, &client, &post_id).await,
            CommentAction::Create { post_id, body, parent_id } => {
                commands::comment::create(&config, &client, &post_id, &body, parent_id.as_deref()).await
            }
        },

        // === Like ===
        Commands::Like { namespace, post_id } => {
            commands::interaction::like(&config, &client, &namespace, &post_id).await
        }

        // === Vote ===
        Commands::Vote { action } => match action {
            VoteAction::Up { target_type, target_id } => {
                commands::interaction::vote(&config, &client, "up", &target_type, &target_id).await
            }
            VoteAction::Down { target_type, target_id } => {
                commands::interaction::vote(&config, &client, "down", &target_type, &target_id).await
            }
            VoteAction::Score { target_type, target_id } => {
                commands::interaction::vote(&config, &client, "score", &target_type, &target_id).await
            }
        },

        // === Bookmark ===
        Commands::Bookmark { action } => match action {
            BookmarkAction::Add { post_id } => commands::interaction::bookmark_add(&config, &client, &post_id).await,
            BookmarkAction::List => commands::interaction::bookmark_list(&config, &client).await,
        },

        // === Report ===
        Commands::Report { namespace, post_id, reason } => {
            commands::interaction::report(&config, &client, &namespace, &post_id, &reason).await
        }

        // === Poll ===
        Commands::Poll { action } => match action {
            PollAction::List { namespace } => commands::content::poll_list(&config, &client, &namespace).await,
            PollAction::All { page, size } => commands::content::poll_all(&config, &client, page, size).await,
            PollAction::Get { poll_id } => commands::content::poll_get(&config, &client, &poll_id).await,
            PollAction::Vote { poll_id, option_id } => commands::content::poll_vote(&config, &client, &poll_id, &option_id).await,
            PollAction::Create { space_id, title, options, poll_type } => {
                commands::content::poll_create(&config, &client, &space_id, &title, options, Some(&poll_type)).await
            }
        },

        // === Series ===
        Commands::Series { action } => match action {
            SeriesAction::List { namespace } => commands::content::series_list(&config, &client, &namespace).await,
            SeriesAction::Get { series_id } => commands::content::series_get(&config, &client, &series_id).await,
            SeriesAction::Create { namespace, title, description } => {
                commands::content::series_create(&config, &client, &namespace, &title, description.as_deref()).await
            }
        },

        // === Tier ===
        Commands::Tier { action } => match action {
            TierAction::List { namespace } => commands::content::tier_list(&config, &client, &namespace).await,
            TierAction::Create { namespace, name, price_cents, description } => {
                commands::content::tier_create(&config, &client, &namespace, &name, price_cents, description.as_deref()).await
            }
        },

        // === Subscribe ===
        Commands::Subscribe { action } => match action {
            SubscribeAction::Join { namespace, tier_id } => {
                commands::content::subscribe_join(&config, &client, &namespace, &tier_id).await
            }
            SubscribeAction::Cancel { namespace } => {
                commands::content::subscribe_cancel(&config, &client, &namespace).await
            }
            SubscribeAction::Status { namespace } => {
                commands::content::subscribe_status(&config, &client, &namespace).await
            }
        },

        // === File ===
        Commands::File { action } => match action {
            FileAction::List { namespace } => commands::content::file_list(&config, &client, &namespace).await,
            FileAction::Upload { namespace, filepath } => {
                commands::content::file_upload(&config, &client, &namespace, &filepath).await
            }
        },

        // === Draft ===
        Commands::Draft { action } => match action {
            DraftAction::Save { space_id, title, body, module } => {
                commands::content::draft_save(&config, &client, space_id.as_deref(), &title, &body, Some(&module)).await
            }
            DraftAction::List => commands::content::draft_list(&config, &client).await,
        },

        // === Notify ===
        Commands::Notify { action } => match action {
            NotifyAction::List { page, size } => commands::notify::list(&config, &client, page, size).await,
            NotifyAction::Unread => commands::notify::unread(&config, &client).await,
            NotifyAction::ReadAll => commands::notify::read_all(&config, &client).await,
        },

        // === Announce ===
        Commands::Announce { namespace } => commands::notify::announce(&config, &client, &namespace).await,

        // === Admin ===
        Commands::Admin { action } => match action {
            AdminAction::Login { email, code } => commands::admin::login(&config, &client, &email, &code).await,
            AdminAction::Dashboard => commands::admin::dashboard(&config, &client).await,
            AdminAction::Stats => commands::admin::stats(&config, &client).await,
            AdminAction::Users(sub) => match sub {
                AdminUsersAction::List { page, size } => commands::admin::users_list(&config, &client, page, size).await,
                AdminUsersAction::Get { user_id } => commands::admin::users_get(&config, &client, &user_id).await,
                AdminUsersAction::Ban { user_id, reason } => commands::admin::users_ban(&config, &client, &user_id, &reason).await,
                AdminUsersAction::Unban { user_id } => commands::admin::users_unban(&config, &client, &user_id).await,
            },
            AdminAction::Spaces(sub) => match sub {
                AdminSpacesAction::List { page, size } => commands::admin::spaces_list(&config, &client, page, size).await,
                AdminSpacesAction::Get { space_id } => commands::admin::spaces_get(&config, &client, &space_id).await,
                AdminSpacesAction::Status { space_id, status } => commands::admin::spaces_status(&config, &client, &space_id, &status).await,
            },
            AdminAction::Posts(sub) => match sub {
                AdminPostsAction::List { page, size } => commands::admin::posts_list(&config, &client, page, size).await,
                AdminPostsAction::Get { post_id } => commands::admin::posts_get(&config, &client, &post_id).await,
                AdminPostsAction::Delete { post_id } => commands::admin::posts_delete(&config, &client, &post_id).await,
            },
            AdminAction::Comments(sub) => match sub {
                AdminCommentsAction::List { page, size } => commands::admin::comments_list(&config, &client, page, size).await,
                AdminCommentsAction::Delete { comment_id } => commands::admin::comments_delete(&config, &client, &comment_id).await,
            },
            AdminAction::Reports(sub) => match sub {
                AdminReportsAction::List { page, size } => commands::admin::reports_list(&config, &client, page, size).await,
                AdminReportsAction::Resolve { report_id } => commands::admin::reports_resolve(&config, &client, &report_id).await,
                AdminReportsAction::Dismiss { report_id } => commands::admin::reports_dismiss(&config, &client, &report_id).await,
            },
            AdminAction::Transactions { page, size } => commands::admin::transactions(&config, &client, page, size).await,
            AdminAction::Analytics { analytics_type, days } => commands::admin::analytics(&config, &client, &analytics_type, days).await,
        },
    }
}
