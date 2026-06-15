use axum::http::HeaderMap;
use polis_core::error::AppError;

/// 校验敏感操作（修改密码、绑定钱包等）的 Origin/Referer 头，防御 CSRF 攻击。
///
/// SameSite=Lax cookie 是主要防线；此函数提供纵深防御 (defense-in-depth)。
///
/// 规则：
/// - 有 Origin 头：必须匹配 frontend_url（精确匹配）
/// - 无 Origin 但有 Referer：必须以前端域名开头
/// - 两者皆无：放行（非浏览器客户端，如 CLI、移动 App）
pub fn check_csrf_origin(headers: &HeaderMap, frontend_url: &str) -> Result<(), AppError> {
    // 1. 检查 Origin 头（现代浏览器对所有跨站 + 多数同站 POST/PUT 请求都发送）
    if let Some(origin) = headers
        .get("Origin")
        .and_then(|v| v.to_str().ok())
        .filter(|v| !v.is_empty())
    {
        if origin != frontend_url {
            return Err(AppError::forbidden(format!(
                "CSRF check failed: Origin '{}' does not match expected '{}'",
                origin, frontend_url
            )));
        }
        return Ok(());
    }

    // 2. 无 Origin 时检查 Referer（旧浏览器回退）
    if let Some(referer) = headers
        .get("Referer")
        .and_then(|v| v.to_str().ok())
        .filter(|v| !v.is_empty())
    {
        if !referer.starts_with(frontend_url) {
            return Err(AppError::forbidden(format!(
                "CSRF check failed: Referer '{}' does not start with expected '{}'",
                referer, frontend_url
            )));
        }
        return Ok(());
    }

    // 3. 无 Origin 也无 Referer — 允许通过（非浏览器客户端）
    tracing::debug!("CSRF: no Origin or Referer header — allowing (non-browser client)");
    Ok(())
}
