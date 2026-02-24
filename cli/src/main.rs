mod commands;

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "arcane", version, about = "Arcane 2D game engine CLI")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Discover and run *.test.ts files in embedded V8
    Test {
        /// Optional directory or glob pattern (defaults to current directory)
        path: Option<String>,
    },
    /// Open a window and run a game with hot-reload
    Dev {
        /// Path to the TypeScript entry file (defaults to src/visual.ts)
        entry: Option<String>,
        /// Enable HTTP inspector on the given port (e.g. --inspector 4321)
        #[arg(long)]
        inspector: Option<u16>,
        /// MCP server port (default: auto-assign a free port, use --no-mcp to disable)
        #[arg(long, default_value = "0")]
        mcp_port: u16,
        /// Disable the MCP server
        #[arg(long)]
        no_mcp: bool,
    },
    /// Stdio bridge for MCP (JSON-RPC over stdin/stdout)
    Mcp {
        /// Path to the TypeScript entry file (defaults to src/visual.ts)
        entry: Option<String>,
        /// MCP HTTP server port to connect to (default: auto-discover via .arcane/mcp-port)
        #[arg(long)]
        port: Option<u16>,
    },
    /// Print a text description of game state (headless)
    Describe {
        /// Path to the TypeScript entry file
        entry: String,
        /// Verbosity: minimal, normal, or detailed
        #[arg(long)]
        verbosity: Option<String>,
    },
    /// Inspect game state at a specific path (headless)
    Inspect {
        /// Path to the TypeScript entry file
        entry: String,
        /// Dot-separated state path (e.g. "player.hp")
        path: String,
    },
    /// Add a recipe to the current project
    Add {
        /// Recipe name (e.g. "turn-based-combat")
        name: Option<String>,
        /// List all available recipes
        #[arg(long)]
        list: bool,
    },
    /// Create a new Arcane project from template
    New {
        /// Project name
        name: String,
    },
    /// Initialize an Arcane project in the current directory
    Init,
    /// Type-check the project (fast, no tests). Use after every edit.
    Check {
        /// Optional directory or entry file
        path: Option<String>,
    },
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Test { path } => commands::test::run(path),
        Commands::Dev { entry, inspector, mcp_port, no_mcp } => {
            let entry = entry.unwrap_or_else(|| "src/visual.ts".to_string());
            let mcp = if no_mcp { None } else { Some(mcp_port) };
            commands::dev::run(entry, inspector, mcp)
        },
        Commands::Mcp { entry, port } => {
            let entry = entry.unwrap_or_else(|| "src/visual.ts".to_string());
            commands::mcp_bridge::run(entry, port)
        },
        Commands::Describe { entry, verbosity } => commands::describe::run(entry, verbosity),
        Commands::Inspect { entry, path } => commands::inspect::run(entry, path),
        Commands::Add { name, list } => commands::add::run(name, list),
        Commands::New { name } => commands::new::run(&name),
        Commands::Init => commands::init::run(),
        Commands::Check { path } => commands::check::run(path),
    }
}
