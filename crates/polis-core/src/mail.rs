use std::env;
use std::process::Command;
use tracing;

/// 获取配置：环境变量 > 默认值
fn mail_from() -> String {
    env::var("MAIL_FROM").unwrap_or_else(|_| "polis@mzgw.com".into())
}

fn mail_from_name() -> String {
    env::var("MAIL_FROM_NAME").unwrap_or_else(|_| "Polis".into())
}

fn base_url() -> String {
    env::var("BASE_URL").unwrap_or_else(|_| "https://www.mzgw.com".into())
}

/// 发送纯文本邮件 (通过本地 Postfix sendmail)
pub fn send_text(to: &str, subject: &str, body: &str) -> Result<(), std::io::Error> {
    let from = mail_from();
    let from_name = mail_from_name();

    let mut child = Command::new("/usr/sbin/sendmail")
        .arg("-f")
        .arg(&from)
        .arg("-t")
        .stdin(std::process::Stdio::piped())
        .spawn()?;

    let email = format!(
        "From: {from_name} <{from}>\n\
         To: {to}\n\
         Subject: {subject}\n\
         Content-Type: text/plain; charset=utf-8\n\
         \n\
         {body}",
        from_name = from_name,
        from = from,
        to = to,
        subject = subject,
        body = body,
    );

    use std::io::Write;
    if let Some(ref mut stdin) = child.stdin {
        stdin.write_all(email.as_bytes())?;
    }

    let status = child.wait()?;
    if status.success() {
        tracing::info!(to = to, subject = subject, "Email sent");
        Ok(())
    } else {
        tracing::error!(to = to, subject = subject, code = ?status.code(), "sendmail failed");
        Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("sendmail exited with {:?}", status.code()),
        ))
    }
}

/// 发送密码重置邮件
pub fn send_password_reset(to: &str, token: &str) {
    let url = base_url();
    let reset_link = format!("{url}/reset-password?token={token}");
    let body = format!(
        "你好，\n\n\
         我们收到了你的 Polis 平台密码重置请求。\n\n\
         请在 1 小时内点击以下链接重置密码：\n\
         {link}\n\n\
         如果你没有请求密码重置，请忽略此邮件。\n\n\
         — Polis 平台",
        link = reset_link,
    );

    if let Err(e) = send_text(to, "Polis 密码重置", &body) {
        tracing::error!(error = %e, to = to, "Failed to send password reset email");
    }
}
