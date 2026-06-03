use regex::Regex;
use std::sync::LazyLock;

/// 解析文本中的 #话题标签
/// 支持中文标签：以 # 开头，后跟非空白、非标点字符
/// 返回 (原始标签, 规范化标签) 列表
pub fn parse_hashtags(text: &str) -> Vec<(String, String)> {
    static RE: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"#([^\s#@!$%^&*()+=<>.,;:?/\\|~`\[\]{}]+)").unwrap()
    });

    let mut seen = std::collections::HashSet::new();
    RE.captures_iter(text)
        .filter_map(|cap| {
            let raw = cap.get(1)?.as_str().to_string();
            let normalized = normalize_tag(&raw);
            // 过滤空标签、过长标签、纯数字标签
            if normalized.is_empty() || normalized.len() > 128 || raw.chars().all(|c| c.is_ascii_digit()) {
                return None;
            }
            // 去重（基于规范化标签）
            if seen.insert(normalized.clone()) {
                Some((raw, normalized))
            } else {
                None
            }
        })
        .collect()
}

/// 规范化标签：转小写，去除首尾空白
pub fn normalize_tag(tag: &str) -> String {
    tag.trim().to_lowercase()
}

/// 判断文本中是否包含某个标签
pub fn has_tag(text: &str, tag: &str) -> bool {
    let normalized = normalize_tag(tag);
    parse_hashtags(text).iter().any(|(_, n)| *n == normalized)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_hashtags() {
        let tags = parse_hashtags("Check out #rust and #programming!");
        assert!(tags.iter().any(|(_, n)| n == "rust"));
        assert!(tags.iter().any(|(_, n)| n == "programming"));
    }

    #[test]
    fn test_chinese_hashtags() {
        let tags = parse_hashtags("今天天气真好 #春天 #旅行日记 分享生活");
        assert!(tags.iter().any(|(_, n)| n == "春天"));
        assert!(tags.iter().any(|(_, n)| n == "旅行日记"));
    }

    #[test]
    fn test_mixed_chinese_english() {
        let tags = parse_hashtags("Learning #Rust语言 和 #AI技术");
        assert!(tags.iter().any(|(_, n)| n == "rust语言"));
        assert!(tags.iter().any(|(_, n)| n == "ai技术"));
    }

    #[test]
    fn test_no_hashtags() {
        let tags = parse_hashtags("No tags here!");
        assert!(tags.is_empty());
    }

    #[test]
    fn test_duplicate_hashtags() {
        let tags = parse_hashtags("#Rust #rust #RUST");
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].1, "rust");
    }

    #[test]
    fn test_filter_numeric_only() {
        let tags = parse_hashtags("#123 #hello #4567");
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].1, "hello");
    }
}
