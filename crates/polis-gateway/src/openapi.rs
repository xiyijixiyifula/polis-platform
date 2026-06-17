/// Hand-written OpenAPI 3.0 specification for Polis Platform.
/// Served as JSON at /api/docs/openapi.json.
/// This avoids heavy dependencies (utoipa) while providing full API documentation.
pub static OPENAPI_JSON: &str = r##"{
  "openapi": "3.0.3",
  "info": {
    "title": "Polis Platform API",
    "version": "0.3.0",
    "description": "Polis Platform - Decentralized Content & Community Platform. All content (posts, videos, articles) are unified as Creations owned by their author. Communities reference Creations via lightweight pointers (ModuleRefs).",
    "contact": {
      "name": "Polis Team",
      "email": "admin@mzgw.com"
    },
    "license": {
      "name": "MIT"
    }
  },
  "servers": [
    { "url": "https://www.mzgw.com", "description": "Production" },
    { "url": "http://localhost:8080", "description": "Local Development" }
  ],
  "security": [
    { "bearerAuth": [] }
  ],
  "tags": [
    { "name": "Auth", "description": "Authentication & session management" },
    { "name": "Users", "description": "User profile management" },
    { "name": "Content", "description": "Posts, creations, content CRUD" },
    { "name": "Spaces", "description": "Community space management" },
    { "name": "Admin", "description": "Administrative operations" },
    { "name": "System", "description": "Health checks & metrics" },
    { "name": "Export", "description": "User data export (GDPR)" }
  ],
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Enter your JWT access token"
      }
    },
    "schemas": {
      "ApiResponse": {
        "type": "object",
        "required": ["code", "message"],
        "properties": {
          "code": { "type": "integer", "description": "0 = success, non-zero = error" },
          "message": { "type": "string" },
          "data": { "nullable": true },
          "pagination": { "$ref": "#/components/schemas/Pagination" }
        }
      },
      "Pagination": {
        "type": "object",
        "properties": {
          "page": { "type": "integer" },
          "page_size": { "type": "integer" },
          "total": { "type": "integer" },
          "total_pages": { "type": "integer" }
        }
      },
      "UserPublic": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "username": { "type": "string" },
          "display_name": { "type": "string" },
          "avatar_url": { "type": "string", "nullable": true },
          "bio": { "type": "string" },
          "verified": { "type": "boolean" },
          "created_at": { "type": "string", "format": "date-time" },
          "total_likes": { "type": "integer" },
          "post_count": { "type": "integer" }
        }
      },
      "RegisterRequest": {
        "type": "object",
        "required": ["username", "email", "password"],
        "properties": {
          "username": { "type": "string" },
          "display_name": { "type": "string" },
          "email": { "type": "string", "format": "email" },
          "password": { "type": "string", "minLength": 6 }
        }
      },
      "LoginRequest": {
        "type": "object",
        "required": ["email", "password"],
        "properties": {
          "email": { "type": "string", "format": "email" },
          "password": { "type": "string" },
          "remember_me": { "type": "boolean" }
        }
      },
      "RefreshTokenRequest": {
        "type": "object",
        "required": ["refresh_token"],
        "properties": {
          "refresh_token": { "type": "string" }
        }
      }
    }
  },
  "paths": {
    "/health": {
      "get": {
        "tags": ["System"],
        "summary": "Gateway health check",
        "responses": {
          "200": { "description": "Gateway is running" }
        }
      }
    },
    "/api/health/all": {
      "get": {
        "tags": ["System"],
        "summary": "Aggregated health check (all services)",
        "responses": {
          "200": { "description": "Health status of all services" }
        }
      }
    },
    "/api/auth/register": {
      "post": {
        "tags": ["Auth"],
        "summary": "Register new user",
        "requestBody": {
          "required": true,
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/RegisterRequest" } } }
        },
        "responses": {
          "200": { "description": "Registration successful" },
          "409": { "description": "Email or username already exists" },
          "422": { "description": "Invalid input" }
        }
      }
    },
    "/api/auth/login": {
      "post": {
        "tags": ["Auth"],
        "summary": "User login",
        "requestBody": {
          "required": true,
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/LoginRequest" } } }
        },
        "responses": {
          "200": { "description": "Login successful (returns JWT tokens)" },
          "401": { "description": "Invalid credentials" }
        }
      }
    },
    "/api/auth/refresh": {
      "post": {
        "tags": ["Auth"],
        "summary": "Refresh JWT access token",
        "requestBody": {
          "required": true,
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/RefreshTokenRequest" } } }
        },
        "responses": {
          "200": { "description": "Token refreshed" },
          "401": { "description": "Invalid refresh token" }
        }
      }
    },
    "/api/auth/logout": {
      "post": {
        "tags": ["Auth"],
        "summary": "Logout (revoke tokens)",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Logged out successfully" },
          "401": { "description": "Not authenticated" }
        }
      }
    },
    "/api/users/{username}": {
      "get": {
        "tags": ["Users"],
        "summary": "Get public user profile",
        "parameters": [
          { "name": "username", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "User profile" },
          "404": { "description": "User not found" }
        }
      }
    },
    "/api/users/me": {
      "get": {
        "tags": ["Users"],
        "summary": "Get current user profile",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Current user profile" },
          "401": { "description": "Not authenticated" }
        }
      },
      "put": {
        "tags": ["Users"],
        "summary": "Update current user profile",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Profile updated" },
          "401": { "description": "Not authenticated" }
        }
      }
    },
    "/api/users/me/export": {
      "get": {
        "tags": ["Export"],
        "summary": "Export all personal data (GDPR compliance)",
        "security": [{ "bearerAuth": [] }],
        "description": "Exports user profile, follows, XP logs, badges, quests, creator scores, push subscriptions, and invite codes as a JSON download.",
        "responses": {
          "200": { "description": "JSON export of all user data" },
          "401": { "description": "Not authenticated" }
        }
      }
    },
    "/api/posts": {
      "get": {
        "tags": ["Content"],
        "summary": "List posts",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "page", "in": "query", "schema": { "type": "integer", "default": 1 } },
          { "name": "per_page", "in": "query", "schema": { "type": "integer", "default": 20 } },
          { "name": "space_id", "in": "query", "schema": { "type": "string" }, "description": "Filter by space" },
          { "name": "sort", "in": "query", "schema": { "type": "string", "enum": ["latest", "popular", "trending"] } }
        ],
        "responses": {
          "200": { "description": "Paginated posts list" }
        }
      },
      "post": {
        "tags": ["Content"],
        "summary": "Create new post",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "201": { "description": "Post created" },
          "401": { "description": "Not authenticated" }
        }
      }
    },
    "/api/posts/{id}": {
      "get": {
        "tags": ["Content"],
        "summary": "Get post details",
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Post details" },
          "404": { "description": "Post not found" }
        }
      }
    },
    "/api/creations": {
      "get": {
        "tags": ["Content"],
        "summary": "List my creations",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "page", "in": "query", "schema": { "type": "integer" } },
          { "name": "per_page", "in": "query", "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "Paginated creations list" },
          "401": { "description": "Not authenticated" }
        }
      },
      "post": {
        "tags": ["Content"],
        "summary": "Create new creation (cross-space content)",
        "security": [{ "bearerAuth": [] }],
        "description": "Creates a Creation that can be referenced by multiple communities via ModuleRefs.",
        "responses": {
          "201": { "description": "Creation created" },
          "401": { "description": "Not authenticated" }
        }
      }
    },
    "/api/spaces/{namespace}": {
      "get": {
        "tags": ["Spaces"],
        "summary": "Get space details",
        "parameters": [
          { "name": "namespace", "in": "path", "required": true, "schema": { "type": "string" }, "description": "Space namespace (e.g. 'creator/community')" }
        ],
        "responses": {
          "200": { "description": "Space details" },
          "404": { "description": "Space not found" }
        }
      }
    },
    "/api/spaces/{namespace}/posts": {
      "get": {
        "tags": ["Spaces"],
        "summary": "List space posts",
        "parameters": [
          { "name": "namespace", "in": "path", "required": true, "schema": { "type": "string" } },
          { "name": "page", "in": "query", "schema": { "type": "integer" } },
          { "name": "per_page", "in": "query", "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "Paginated space posts" },
          "404": { "description": "Space not found" }
        }
      }
    },
    "/api/spaces": {
      "post": {
        "tags": ["Spaces"],
        "summary": "Create new space",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "201": { "description": "Space created" },
          "401": { "description": "Not authenticated" }
        }
      }
    },
    "/api/admin/login": {
      "post": {
        "tags": ["Admin"],
        "summary": "Admin login",
        "responses": {
          "200": { "description": "Admin login successful" },
          "401": { "description": "Invalid credentials" }
        }
      }
    },
    "/api/admin/users": {
      "get": {
        "tags": ["Admin"],
        "summary": "List all users (admin)",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "page", "in": "query", "schema": { "type": "integer" } },
          { "name": "per_page", "in": "query", "schema": { "type": "integer" } },
          { "name": "search", "in": "query", "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Paginated user list" },
          "401": { "description": "Not authenticated" },
          "403": { "description": "Insufficient permissions" }
        }
      }
    },
    "/api/admin/users/{id}": {
      "delete": {
        "tags": ["Admin"],
        "summary": "Delete/anonymize user account (GDPR)",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "description": "Soft-deletes user by anonymizing personal data (email, name, bio) and preserving content integrity.",
        "responses": {
          "200": { "description": "User anonymized" },
          "401": { "description": "Not authenticated as admin" }
        }
      }
    }
  }
}"##;
