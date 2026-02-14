use std::sync::mpsc;
use std::thread::{self, JoinHandle};
use std::time::Duration;

use super::{InspectorRequest, RequestSender};

/// MCP tool definition sent to clients in the tools/list response.
#[derive(Debug)]
struct McpTool {
    name: &'static str,
    description: &'static str,
    /// JSON Schema for parameters (as a static string).
    input_schema: &'static str,
}

/// All available MCP tools.
static MCP_TOOLS: &[McpTool] = &[
    McpTool {
        name: "get_state",
        description: "Get the full game state or a specific path within it",
        input_schema: r#"{"type":"object","properties":{"path":{"type":"string","description":"Optional dot-separated path (e.g. 'player.hp')"}}}"#,
    },
    McpTool {
        name: "describe_state",
        description: "Get a human-readable text description of the game state",
        input_schema: r#"{"type":"object","properties":{"verbosity":{"type":"string","enum":["minimal","normal","detailed"],"description":"Detail level"}}}"#,
    },
    McpTool {
        name: "list_actions",
        description: "List all available agent actions with descriptions and argument schemas",
        input_schema: r#"{"type":"object","properties":{}}"#,
    },
    McpTool {
        name: "execute_action",
        description: "Execute a named agent action with optional arguments",
        input_schema: r#"{"type":"object","properties":{"name":{"type":"string","description":"Action name"},"args":{"type":"object","description":"Optional action arguments"}},"required":["name"]}"#,
    },
    McpTool {
        name: "inspect_scene",
        description: "Query a specific value in the game state by dot-path",
        input_schema: r#"{"type":"object","properties":{"path":{"type":"string","description":"Dot-separated state path (e.g. 'player.inventory')"}},"required":["path"]}"#,
    },
    McpTool {
        name: "capture_snapshot",
        description: "Capture a snapshot of the current game state",
        input_schema: r#"{"type":"object","properties":{}}"#,
    },
    McpTool {
        name: "hot_reload",
        description: "Trigger a hot reload of the game entry file",
        input_schema: r#"{"type":"object","properties":{}}"#,
    },
    McpTool {
        name: "run_tests",
        description: "Run the game's test suite and return results",
        input_schema: r#"{"type":"object","properties":{}}"#,
    },
    McpTool {
        name: "rewind",
        description: "Reset game state to initial state (captured at registerAgent time)",
        input_schema: r#"{"type":"object","properties":{}}"#,
    },
    McpTool {
        name: "simulate_action",
        description: "Simulate an action without committing state changes",
        input_schema: r#"{"type":"object","properties":{"name":{"type":"string","description":"Action name"},"args":{"type":"object","description":"Optional action arguments"}},"required":["name"]}"#,
    },
];

/// Start the MCP server on a background thread.
/// The MCP server uses JSON-RPC 2.0 over HTTP (Streamable HTTP transport).
/// Returns a join handle for the server thread.
pub fn start_mcp_server(port: u16, request_tx: RequestSender) -> JoinHandle<()> {
    thread::spawn(move || {
        let addr = format!("0.0.0.0:{port}");
        let server = match tiny_http::Server::http(&addr) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("[mcp] Failed to start on {addr}: {e}");
                return;
            }
        };

        eprintln!("[mcp] MCP server listening on http://localhost:{port}");

        for mut request in server.incoming_requests() {
            let method = request.method().as_str().to_uppercase();

            // Handle CORS preflight
            if method == "OPTIONS" {
                let _ = request.respond(build_cors_response());
                continue;
            }

            if method != "POST" {
                let resp = build_json_response(
                    405,
                    r#"{"jsonrpc":"2.0","error":{"code":-32600,"message":"Method not allowed. Use POST."},"id":null}"#,
                );
                let _ = request.respond(resp);
                continue;
            }

            // Read the request body
            let mut body = String::new();
            if request.as_reader().read_to_string(&mut body).is_err() {
                let resp = build_json_response(
                    400,
                    r#"{"jsonrpc":"2.0","error":{"code":-32700,"message":"Parse error"},"id":null}"#,
                );
                let _ = request.respond(resp);
                continue;
            }

            let response_body = handle_jsonrpc(&body, &request_tx);
            let resp = build_json_response(200, &response_body);
            let _ = request.respond(resp);
        }
    })
}

/// Handle a JSON-RPC 2.0 request and return the response body.
fn handle_jsonrpc(body: &str, request_tx: &RequestSender) -> String {
    // Parse the JSON-RPC method and params
    let rpc_method = extract_json_string(body, "method").unwrap_or_default();
    let rpc_id = extract_json_value(body, "id").unwrap_or_else(|| "null".to_string());
    let params = extract_json_value(body, "params").unwrap_or_else(|| "{}".to_string());

    match rpc_method.as_str() {
        "initialize" => {
            let version = env!("CARGO_PKG_VERSION");
            format!(
                r#"{{"jsonrpc":"2.0","result":{{"protocolVersion":"2025-03-26","capabilities":{{"tools":{{}}}},"serverInfo":{{"name":"arcane-mcp","version":"{version}"}}}},"id":{rpc_id}}}"#,
            )
        }
        "notifications/initialized" => {
            // Client acknowledgment, no response needed for notifications
            // But since we got it via HTTP POST, respond with empty result
            format!(r#"{{"jsonrpc":"2.0","result":null,"id":{rpc_id}}}"#)
        }
        "tools/list" => {
            let tools_json = build_tools_list();
            format!(
                r#"{{"jsonrpc":"2.0","result":{{"tools":{tools_json}}},"id":{rpc_id}}}"#,
            )
        }
        "tools/call" => {
            let tool_name = extract_json_string(&params, "name").unwrap_or_default();
            let arguments =
                extract_json_value(&params, "arguments").unwrap_or_else(|| "{}".to_string());

            let result = call_tool(&tool_name, &arguments, request_tx);
            format!(
                r#"{{"jsonrpc":"2.0","result":{{"content":[{{"type":"text","text":{result}}}]}},"id":{rpc_id}}}"#,
            )
        }
        "ping" => {
            format!(r#"{{"jsonrpc":"2.0","result":{{}},"id":{rpc_id}}}"#)
        }
        _ => {
            format!(
                r#"{{"jsonrpc":"2.0","error":{{"code":-32601,"message":"Method not found: {rpc_method}"}},"id":{rpc_id}}}"#,
            )
        }
    }
}

/// Call an MCP tool by dispatching to the game loop via the inspector channel.
fn call_tool(name: &str, arguments: &str, request_tx: &RequestSender) -> String {
    let inspector_req = match name {
        "get_state" => {
            let path = extract_json_string(arguments, "path");
            InspectorRequest::GetState { path }
        }
        "describe_state" => {
            let verbosity = extract_json_string(arguments, "verbosity");
            InspectorRequest::Describe { verbosity }
        }
        "list_actions" => InspectorRequest::ListActions,
        "execute_action" => {
            let action_name = extract_json_string(arguments, "name").unwrap_or_default();
            let args = extract_json_value(arguments, "args").unwrap_or_else(|| "{}".to_string());
            InspectorRequest::ExecuteAction {
                name: action_name,
                payload: args,
            }
        }
        "inspect_scene" => {
            let path = extract_json_string(arguments, "path");
            InspectorRequest::GetState { path }
        }
        "capture_snapshot" => InspectorRequest::GetHistory,
        "hot_reload" => {
            // Signal a reload via a special simulate action
            InspectorRequest::Simulate {
                action: "__hot_reload__".to_string(),
            }
        }
        "run_tests" => InspectorRequest::Simulate {
            action: "__run_tests__".to_string(),
        },
        "rewind" => InspectorRequest::Rewind { steps: 0 },
        "simulate_action" => {
            let action_name = extract_json_string(arguments, "name").unwrap_or_default();
            let args = extract_json_value(arguments, "args").unwrap_or_else(|| "{}".to_string());
            InspectorRequest::Simulate {
                action: format!("{{\"name\":\"{action_name}\",\"args\":{args}}}"),
            }
        }
        _ => {
            return json_encode(&format!("Unknown tool: {name}"));
        }
    };

    // Send request to game loop and wait for response
    let (resp_tx, resp_rx) = mpsc::channel();

    if request_tx.send((inspector_req, resp_tx)).is_err() {
        return json_encode("Game loop disconnected");
    }

    match resp_rx.recv_timeout(Duration::from_secs(10)) {
        Ok(resp) => json_encode(&resp.body),
        Err(_) => json_encode("Game loop timeout"),
    }
}

/// Build the JSON array of tool definitions.
fn build_tools_list() -> String {
    let tools: Vec<String> = MCP_TOOLS
        .iter()
        .map(|t| {
            format!(
                r#"{{"name":"{}","description":"{}","inputSchema":{}}}"#,
                t.name, t.description, t.input_schema
            )
        })
        .collect();
    format!("[{}]", tools.join(","))
}

/// Encode a string as a JSON string value (with escaping).
fn json_encode(s: &str) -> String {
    let escaped = s
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "\\r")
        .replace('\t', "\\t");
    format!("\"{escaped}\"")
}

/// Build an HTTP response with JSON-RPC content type.
fn build_json_response(
    status: u16,
    body: &str,
) -> tiny_http::Response<std::io::Cursor<Vec<u8>>> {
    let data = body.as_bytes().to_vec();
    let data_len = data.len();

    let status = tiny_http::StatusCode(status);
    let content_type =
        tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap();
    let cors =
        tiny_http::Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap();
    let cors_headers = tiny_http::Header::from_bytes(
        &b"Access-Control-Allow-Headers"[..],
        &b"Content-Type"[..],
    )
    .unwrap();
    let cors_methods = tiny_http::Header::from_bytes(
        &b"Access-Control-Allow-Methods"[..],
        &b"GET, POST, OPTIONS"[..],
    )
    .unwrap();

    tiny_http::Response::new(
        status,
        vec![content_type, cors, cors_headers, cors_methods],
        std::io::Cursor::new(data),
        Some(data_len),
        None,
    )
}

/// Build a CORS preflight response.
fn build_cors_response() -> tiny_http::Response<std::io::Cursor<Vec<u8>>> {
    build_json_response(204, "")
}

// --- Simple JSON extraction (reuse inspector pattern) ---

fn extract_json_string(json: &str, key: &str) -> Option<String> {
    let pattern = format!("\"{}\"", key);
    let start = json.find(&pattern)?;
    let rest = &json[start + pattern.len()..];
    let rest = rest.trim_start();
    let rest = rest.strip_prefix(':')?;
    let rest = rest.trim_start();

    if rest.starts_with('"') {
        let rest = &rest[1..];
        let end = rest.find('"')?;
        Some(rest[..end].to_string())
    } else {
        let end = rest
            .find(|c: char| c == ',' || c == '}' || c == ']' || c.is_whitespace())
            .unwrap_or(rest.len());
        let val = rest[..end].to_string();
        if val == "null" {
            None
        } else {
            Some(val)
        }
    }
}

fn extract_json_value(json: &str, key: &str) -> Option<String> {
    let pattern = format!("\"{}\"", key);
    let start = json.find(&pattern)?;
    let rest = &json[start + pattern.len()..];
    let rest = rest.trim_start();
    let rest = rest.strip_prefix(':')?;
    let rest = rest.trim_start();

    if rest.starts_with('{') {
        let mut depth = 0;
        for (i, c) in rest.char_indices() {
            match c {
                '{' => depth += 1,
                '}' => {
                    depth -= 1;
                    if depth == 0 {
                        return Some(rest[..=i].to_string());
                    }
                }
                _ => {}
            }
        }
        None
    } else if rest.starts_with('[') {
        let mut depth = 0;
        for (i, c) in rest.char_indices() {
            match c {
                '[' => depth += 1,
                ']' => {
                    depth -= 1;
                    if depth == 0 {
                        return Some(rest[..=i].to_string());
                    }
                }
                _ => {}
            }
        }
        None
    } else if rest.starts_with('"') {
        let inner = &rest[1..];
        let end = inner.find('"')?;
        Some(format!("\"{}\"", &inner[..end]))
    } else {
        let end = rest
            .find(|c: char| c == ',' || c == '}' || c == ']' || c.is_whitespace())
            .unwrap_or(rest.len());
        Some(rest[..end].to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_tools_list_is_valid_json_array() {
        let list = build_tools_list();
        assert!(list.starts_with('['));
        assert!(list.ends_with(']'));
        assert!(list.contains("get_state"));
        assert!(list.contains("execute_action"));
        assert!(list.contains("describe_state"));
    }

    #[test]
    fn all_tools_have_required_fields() {
        for tool in MCP_TOOLS {
            assert!(!tool.name.is_empty());
            assert!(!tool.description.is_empty());
            assert!(tool.input_schema.starts_with('{'));
        }
    }

    #[test]
    fn json_encode_escapes_special_chars() {
        assert_eq!(json_encode("hello"), r#""hello""#);
        assert_eq!(json_encode(r#"a"b"#), r#""a\"b""#);
        assert_eq!(json_encode("a\nb"), r#""a\nb""#);
        assert_eq!(json_encode("a\\b"), r#""a\\b""#);
    }

    #[test]
    fn extract_json_string_basic() {
        let json = r#"{"name": "test", "value": 42}"#;
        assert_eq!(extract_json_string(json, "name"), Some("test".to_string()));
    }

    #[test]
    fn extract_json_string_null() {
        let json = r#"{"path": null}"#;
        assert_eq!(extract_json_string(json, "path"), None);
    }

    #[test]
    fn extract_json_value_object() {
        let json = r#"{"args": {"x": 1, "y": 2}}"#;
        let val = extract_json_value(json, "args");
        assert_eq!(val, Some(r#"{"x": 1, "y": 2}"#.to_string()));
    }

    #[test]
    fn extract_json_value_array() {
        let json = r#"{"items": [1, 2, 3]}"#;
        let val = extract_json_value(json, "items");
        assert_eq!(val, Some("[1, 2, 3]".to_string()));
    }

    #[test]
    fn handle_initialize() {
        let (tx, _rx) = mpsc::channel();
        let body = r#"{"jsonrpc":"2.0","method":"initialize","id":1}"#;
        let resp = handle_jsonrpc(body, &tx);
        assert!(resp.contains("protocolVersion"));
        assert!(resp.contains("arcane-mcp"));
        assert!(resp.contains(r#""id":1"#));
    }

    #[test]
    fn handle_tools_list() {
        let (tx, _rx) = mpsc::channel();
        let body = r#"{"jsonrpc":"2.0","method":"tools/list","id":2}"#;
        let resp = handle_jsonrpc(body, &tx);
        assert!(resp.contains("get_state"));
        assert!(resp.contains("execute_action"));
        assert!(resp.contains(r#""id":2"#));
    }

    #[test]
    fn handle_ping() {
        let (tx, _rx) = mpsc::channel();
        let body = r#"{"jsonrpc":"2.0","method":"ping","id":3}"#;
        let resp = handle_jsonrpc(body, &tx);
        assert!(resp.contains(r#""result":{}"#));
        assert!(resp.contains(r#""id":3"#));
    }

    #[test]
    fn handle_unknown_method() {
        let (tx, _rx) = mpsc::channel();
        let body = r#"{"jsonrpc":"2.0","method":"foo/bar","id":4}"#;
        let resp = handle_jsonrpc(body, &tx);
        assert!(resp.contains("error"));
        assert!(resp.contains("-32601"));
        assert!(resp.contains("foo/bar"));
    }

    #[test]
    fn tool_count() {
        assert_eq!(MCP_TOOLS.len(), 10);
    }
}
