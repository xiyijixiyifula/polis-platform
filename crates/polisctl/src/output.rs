use crate::config::OutputFormat;
use serde_json::Value;

pub fn print_output(value: &Value, format: OutputFormat) {
    match format {
        OutputFormat::Json => print_json(value),
        OutputFormat::Table => print_table(value),
    }
}

fn print_json(value: &Value) {
    match value {
        Value::Array(arr) => {
            for item in arr {
                println!("{}", serde_json::to_string(item).unwrap_or_default());
            }
        }
        Value::Object(_) => {
            println!("{}", serde_json::to_string(value).unwrap_or_default());
        }
        Value::Null => {
            println!("null");
        }
        other => {
            println!("{}", other);
        }
    }
}

fn print_table(value: &Value) {
    match value {
        Value::Array(arr) if !arr.is_empty() => {
            print_array_table(arr);
        }
        Value::Object(obj) => {
            // Single object - print as key-value
            for (k, v) in obj {
                let val = match v {
                    Value::String(s) => s.clone(),
                    Value::Null => "null".to_string(),
                    other => other.to_string(),
                };
                println!("{:<20} {}", k, val);
            }
        }
        Value::Array(_) => {
            // Empty array
            println!("(empty)");
        }
        other => {
            println!("{}", other);
        }
    }
}

fn print_array_table(arr: &[Value]) {
    if arr.is_empty() {
        println!("(empty)");
        return;
    }

    // Collect all keys from all objects
    let mut keys: Vec<String> = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for item in arr {
        if let Value::Object(obj) = item {
            for k in obj.keys() {
                if seen.insert(k.clone()) {
                    keys.push(k.clone());
                }
            }
        }
    }

    if keys.is_empty() {
        // Array of non-objects
        for item in arr {
            println!("{}", item);
        }
        return;
    }

    // Calculate column widths
    let mut widths: Vec<usize> = keys.iter().map(|k| k.len()).collect();
    for item in arr {
        if let Value::Object(obj) = item {
            for (i, key) in keys.iter().enumerate() {
                if let Some(v) = obj.get(key) {
                    let len = value_display_len(v);
                    if len > widths[i] {
                        widths[i] = len;
                    }
                }
            }
        }
    }

    // Print header
    for (i, key) in keys.iter().enumerate() {
        print!("{:<width$}  ", key, width = widths[i]);
    }
    println!();

    // Print separator
    for w in &widths {
        print!("{}  ", "-".repeat(*w));
    }
    println!();

    // Print rows
    for item in arr {
        if let Value::Object(obj) = item {
            for (i, key) in keys.iter().enumerate() {
                let val = obj.get(key).map(value_display).unwrap_or_default();
                print!("{:<width$}  ", val, width = widths[i]);
            }
            println!();
        }
    }
}

fn value_display(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        Value::Null => "null".to_string(),
        Value::Array(_) => "[...]".to_string(),
        Value::Object(_) => "{...}".to_string(),
    }
}

fn value_display_len(v: &Value) -> usize {
    value_display(v).chars().count()
}

/// Print a success message
pub fn print_success(msg: &str) {
    eprintln!("\x1b[32m✓ {}\x1b[0m", msg);
}

/// Print an info message
pub fn print_info(msg: &str) {
    eprintln!("\x1b[34mℹ {}\x1b[0m", msg);
}

/// Extract data field from API response
pub fn extract_data(value: &Value) -> &Value {
    value.get("data").unwrap_or(value)
}

/// Extract data array from paginated API response
pub fn extract_data_array(value: &Value) -> Vec<&Value> {
    if let Some(data) = value.get("data") {
        if let Some(arr) = data.as_array() {
            return arr.iter().collect();
        }
        if data.is_object() {
            return vec![data];
        }
    }
    if let Some(arr) = value.as_array() {
        return arr.iter().collect();
    }
    vec![]
}
