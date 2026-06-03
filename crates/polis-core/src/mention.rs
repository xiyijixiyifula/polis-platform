use regex::Regex;
use std::sync::LazyLock;

/// 解析文本中的 @username 提及
/// 返回被提及的用户名列表（去重，保持顺序）
pub fn parse_mentions(text: &str) -> Vec<String> {
    static RE: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"@([a-zA-Z0-9_\u{4e00}-\u{9fff}]+)").unwrap()
    });

    let mut seen = std::collections::HashSet::new();
    RE.captures_iter(text)
        .filter_map(|cap| cap.get(1).map(|m| m.as_str().to_string()))
        .filter(|name| {
            // 过滤掉太短或过长的用户名
            let len = name.chars().count();
            if len < 2 || len > 39 {
                return false;
            }
            seen.insert(name.clone())
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_mentions() {
        let mentions = parse_mentions("Hello @alice and @bob, check this out!");
        assert_eq!(mentions, vec!["alice", "bob"]);
    }

    #[test]
    fn test_chinese_mentions() {
        let mentions = parse_mentions("你好 @测试用户 欢迎来到 @中文社区");
        assert!(mentions.contains(&"测试用户".to_string()));
        assert!(mentions.contains(&"中文社区".to_string()));
    }

    #[test]
    fn test_no_duplicates() {
        let mentions = parse_mentions("@alice @alice @bob");
        assert_eq!(mentions, vec!["alice", "bob"]);
    }

    #[test]
    fn test_no_mentions() {
        let mentions = parse_mentions("No mentions here!");
        assert!(mentions.is_empty());
    }
}
