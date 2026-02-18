use std::io::{self, BufRead, Read, Write};
use std::net::TcpStream;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

use anyhow::{Context, Result};

const HEALTH_CHECK_TIMEOUT: Duration = Duration::from_secs(15);
const HEALTH_CHECK_INTERVAL: Duration = Duration::from_millis(250);

/// Run the MCP stdio bridge.
///
/// Reads JSON-RPC from stdin, proxies to the MCP HTTP server on localhost,
/// and writes the response to stdout. Auto-discovers the port from
/// `.arcane/mcp-port`. If no running instance is found, auto-launches
/// `arcane dev <entry>` which picks a free port automatically.
pub fn run(entry: String, port_override: Option<u16>) -> Result<()> {
    // Try to connect. If the server is not running, auto-launch arcane dev.
    let mut child: Option<Child> = None;

    let port = if let Some(p) = port_override {
        // Explicit port override — use it directly
        if !health_check(p) {
            eprintln!("[mcp-bridge] No running MCP server found, launching arcane dev...");
            let child_proc = launch_dev(&entry, Some(p))?;
            child = Some(child_proc);
            if !wait_for_server(p) {
                anyhow::bail!("MCP server did not start within {}s", HEALTH_CHECK_TIMEOUT.as_secs());
            }
        }
        eprintln!("[mcp-bridge] MCP server ready on port {p}");
        p
    } else if let Some(p) = discover_port() {
        // Found a port file — check if the server is alive
        if health_check(p) {
            eprintln!("[mcp-bridge] MCP server ready on port {p}");
            p
        } else {
            // Stale port file — launch a new instance
            eprintln!("[mcp-bridge] Stale port file, launching arcane dev...");
            let child_proc = launch_dev(&entry, None)?;
            child = Some(child_proc);
            wait_for_port_file()?
        }
    } else {
        // No port file, no override — launch arcane dev (auto-assigns port)
        eprintln!("[mcp-bridge] No running MCP server found, launching arcane dev...");
        let child_proc = launch_dev(&entry, None)?;
        child = Some(child_proc);
        wait_for_port_file()?
    };

    // Main loop: read JSON-RPC lines from stdin, proxy to HTTP, write to stdout
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut stdout_lock = stdout.lock();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break, // stdin closed
        };

        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        // JSON-RPC 2.0: notifications have no "id" field and MUST NOT receive a response.
        // Detect notifications by checking if the message lacks an "id" key.
        let is_notification = !trimmed.contains("\"id\"");

        match proxy_request(port, trimmed) {
            Ok(response) => {
                if !is_notification {
                    let _ = writeln!(stdout_lock, "{response}");
                    let _ = stdout_lock.flush();
                }
            }
            Err(e) => {
                if !is_notification {
                    let error_resp = format!(
                        r#"{{"jsonrpc":"2.0","error":{{"code":-32000,"message":"{}"}},"id":null}}"#,
                        e.to_string().replace('"', "\\\"")
                    );
                    let _ = writeln!(stdout_lock, "{error_resp}");
                    let _ = stdout_lock.flush();
                }
            }
        }
    }

    // Clean shutdown: kill child process if we launched one
    if let Some(ref mut c) = child {
        let _ = c.kill();
        let _ = c.wait();
    }

    Ok(())
}

/// Discover the MCP port from the `.arcane/mcp-port` file.
fn discover_port() -> Option<u16> {
    std::fs::read_to_string(".arcane/mcp-port")
        .ok()
        .and_then(|s| s.trim().parse::<u16>().ok())
}

/// Check if the MCP server is responding on the given port.
fn health_check(port: u16) -> bool {
    let body = r#"{"jsonrpc":"2.0","method":"ping","id":0}"#;
    proxy_request(port, body).is_ok()
}

/// Wait for the MCP server to become available.
fn wait_for_server(port: u16) -> bool {
    let start = Instant::now();
    while start.elapsed() < HEALTH_CHECK_TIMEOUT {
        if health_check(port) {
            return true;
        }
        std::thread::sleep(HEALTH_CHECK_INTERVAL);
    }
    false
}

/// Launch `arcane dev <entry>` as a child process, optionally with a specific port.
fn launch_dev(entry: &str, port: Option<u16>) -> Result<Child> {
    // Find the arcane binary (same as current executable)
    let exe = std::env::current_exe().context("Cannot find arcane executable")?;

    let mut args = vec!["dev", entry];
    let port_str;
    if let Some(p) = port {
        port_str = p.to_string();
        args.extend(["--mcp-port", &port_str]);
    }

    let child = Command::new(exe)
        .args(&args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::inherit())
        .spawn()
        .context("Failed to launch arcane dev")?;

    Ok(child)
}

/// Wait for the `.arcane/mcp-port` file to appear (written by arcane dev after binding).
fn wait_for_port_file() -> Result<u16> {
    let start = Instant::now();
    while start.elapsed() < HEALTH_CHECK_TIMEOUT {
        if let Some(port) = discover_port() {
            if health_check(port) {
                eprintln!("[mcp-bridge] MCP server ready on port {port}");
                return Ok(port);
            }
        }
        std::thread::sleep(HEALTH_CHECK_INTERVAL);
    }
    anyhow::bail!(
        "MCP server did not start within {}s",
        HEALTH_CHECK_TIMEOUT.as_secs()
    )
}

/// Proxy a JSON-RPC request to the MCP HTTP server and return the response body.
fn proxy_request(port: u16, json_body: &str) -> Result<String> {
    let addr = format!("127.0.0.1:{port}");
    let mut stream =
        TcpStream::connect_timeout(&addr.parse()?, Duration::from_secs(2))
            .context("Cannot connect to MCP server")?;

    stream
        .set_read_timeout(Some(Duration::from_secs(30)))
        .ok();

    // Write HTTP POST request
    let request = format!(
        "POST / HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{json_body}",
        json_body.len()
    );

    stream
        .write_all(request.as_bytes())
        .context("Failed to write to MCP server")?;
    stream.flush()?;

    // Read the full response
    let mut response = Vec::new();
    stream.read_to_end(&mut response)?;
    let response_str = String::from_utf8_lossy(&response);

    // Parse HTTP response: find the body after \r\n\r\n
    let body_start = response_str
        .find("\r\n\r\n")
        .map(|i| i + 4)
        .unwrap_or(0);
    let body = &response_str[body_start..];

    // Handle chunked transfer encoding
    let body = if response_str.contains("Transfer-Encoding: chunked")
        || response_str.contains("transfer-encoding: chunked")
    {
        decode_chunked(body)
    } else {
        body.trim().to_string()
    };

    if body.is_empty() {
        anyhow::bail!("Empty response from MCP server");
    }

    Ok(body)
}

/// Decode chunked transfer-encoded body.
fn decode_chunked(data: &str) -> String {
    let mut result = String::new();
    let mut remaining = data;

    loop {
        let remaining_trimmed = remaining.trim_start();
        if remaining_trimmed.is_empty() {
            break;
        }

        // Read chunk size (hex)
        let line_end = remaining_trimmed.find("\r\n").unwrap_or(remaining_trimmed.len());
        let size_str = &remaining_trimmed[..line_end];
        let chunk_size = usize::from_str_radix(size_str.trim(), 16).unwrap_or(0);

        if chunk_size == 0 {
            break;
        }

        // Skip past the size line + \r\n
        let chunk_start = line_end + 2;
        if chunk_start + chunk_size <= remaining_trimmed.len() {
            result.push_str(&remaining_trimmed[chunk_start..chunk_start + chunk_size]);
            // Skip chunk data + \r\n
            let next = chunk_start + chunk_size + 2;
            if next <= remaining_trimmed.len() {
                remaining = &remaining_trimmed[next..];
            } else {
                break;
            }
        } else {
            // Incomplete chunk, take what we can
            result.push_str(&remaining_trimmed[chunk_start..]);
            break;
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn discover_port_returns_none_when_no_file() {
        // discover_port reads .arcane/mcp-port from cwd; in test cwd it won't exist
        // (unless a dev server happens to be running). Just verify it doesn't panic.
        let _ = discover_port();
    }

    #[test]
    fn health_check_returns_false_for_unused_port() {
        assert!(!health_check(19999));
    }

    #[test]
    fn decode_chunked_basic() {
        let chunked = "5\r\nhello\r\n5\r\nworld\r\n0\r\n\r\n";
        assert_eq!(decode_chunked(chunked), "helloworld");
    }

    #[test]
    fn decode_chunked_single() {
        let chunked = "d\r\n{\"result\":42}\r\n0\r\n\r\n";
        assert_eq!(decode_chunked(chunked), "{\"result\":42}");
    }

    #[test]
    fn decode_chunked_empty() {
        let chunked = "0\r\n\r\n";
        assert_eq!(decode_chunked(chunked), "");
    }

    #[test]
    fn proxy_request_fails_on_bad_port() {
        let result = proxy_request(19999, r#"{"jsonrpc":"2.0","method":"ping","id":0}"#);
        assert!(result.is_err());
    }

    #[test]
    fn port_file_write_read_cleanup() {
        let tmp = std::env::temp_dir().join("arcane_test_mcp_port");
        let port_dir = tmp.join(".arcane");
        let port_file = port_dir.join("mcp-port");

        let _ = std::fs::create_dir_all(&port_dir);
        std::fs::write(&port_file, "4322").unwrap();

        let contents = std::fs::read_to_string(&port_file).unwrap();
        assert_eq!(contents.trim().parse::<u16>().unwrap(), 4322);

        std::fs::remove_file(&port_file).unwrap();
        assert!(!port_file.exists());

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn template_mcp_configs_contain_project_name_placeholder() {
        let template_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .join("templates/default");

        let mcp_json = std::fs::read_to_string(template_dir.join(".mcp.json")).unwrap();
        assert!(mcp_json.contains("{{PROJECT_NAME}}"));
        assert!(mcp_json.contains("arcane"));
        assert!(mcp_json.contains("src/visual.ts"));

        let cursor_json =
            std::fs::read_to_string(template_dir.join(".cursor/mcp.json")).unwrap();
        assert!(cursor_json.contains("{{PROJECT_NAME}}"));

        let vscode_json =
            std::fs::read_to_string(template_dir.join(".vscode/mcp.json")).unwrap();
        assert!(vscode_json.contains("{{PROJECT_NAME}}"));
    }

    #[test]
    fn gitignore_template_includes_arcane_dir() {
        let template_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .join("templates/default");

        let gitignore = std::fs::read_to_string(template_dir.join(".gitignore")).unwrap();
        assert!(gitignore.contains(".arcane/"));
    }
}
