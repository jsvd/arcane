use std::fs;
use std::path::Path;

use anyhow::{anyhow, Context, Result};
use base64::Engine;

/// Take a screenshot of the running game window.
/// Requires an active `arcane dev` session with MCP enabled.
pub fn run(output: String) -> Result<()> {
    // Read MCP port from .arcane/mcp-port
    let port_file = Path::new(".arcane/mcp-port");
    if !port_file.exists() {
        return Err(anyhow!(
            "No running game found. Start with: arcane dev <entry.ts>"
        ));
    }

    let port_str = fs::read_to_string(port_file)
        .context("Failed to read MCP port file")?;
    let port: u16 = port_str.trim().parse()
        .context("Invalid port in .arcane/mcp-port")?;

    // Send MCP request to capture_frame tool
    let client = reqwest::blocking::Client::new();
    let response = client
        .post(format!("http://127.0.0.1:{}", port))
        .header("Content-Type", "application/json")
        .body(r#"{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"capture_frame","arguments":{}}}"#)
        .send()
        .context("Failed to connect to game MCP server. Is the game running?")?;

    let json: serde_json::Value = response.json()
        .context("Failed to parse MCP response")?;

    // Extract base64 image data from response
    let image_data = json
        .get("result")
        .and_then(|r| r.get("content"))
        .and_then(|c| c.get(0))
        .and_then(|item| item.get("data"))
        .and_then(|d| d.as_str())
        .ok_or_else(|| anyhow!("Invalid MCP response: missing image data"))?;

    // Decode base64 and save to file
    let image_bytes = base64::engine::general_purpose::STANDARD
        .decode(image_data)
        .context("Failed to decode base64 image data")?;

    fs::write(&output, &image_bytes)
        .with_context(|| format!("Failed to write screenshot to {}", output))?;

    println!("Screenshot saved to {}", output);
    Ok(())
}
