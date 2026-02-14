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
        /// MCP server port (default: 4322, use --no-mcp to disable)
        #[arg(long, default_value = "4322")]
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
    /// Discover and download free game assets
    Assets {
        #[command(subcommand)]
        action: AssetsAction,
    },
    /// Create a new Arcane project from template
    New {
        /// Project name
        name: String,
    },
    /// Initialize an Arcane project in the current directory
    Init,
}

#[derive(Subcommand)]
enum AssetsAction {
    /// List all available asset packs
    List {
        /// Filter by type (e.g. "audio", "2d-sprites", "ui", "tilesets", "fonts", "vfx")
        #[arg(long = "type")]
        type_filter: Option<String>,
        /// Output as JSON
        #[arg(long)]
        json: bool,
    },
    /// Search asset packs by keyword
    Search {
        /// Search query (e.g. "dungeon", "platformer", "kitty")
        query: String,
        /// Filter by type (e.g. "audio", "2d-sprites", "ui", "tilesets", "fonts", "vfx")
        #[arg(long = "type")]
        type_filter: Option<String>,
        /// Output as JSON
        #[arg(long)]
        json: bool,
    },
    /// Download an asset pack
    Download {
        /// Asset pack ID (e.g. "tiny-dungeon")
        id: String,
        /// Destination directory (defaults to "assets")
        dest: Option<String>,
        /// Output as JSON
        #[arg(long)]
        json: bool,
    },
    /// Inspect contents of an asset pack
    Inspect {
        /// Asset pack ID (e.g. "tiny-dungeon")
        id: String,
        /// Destination directory for cached downloads (defaults to system temp)
        #[arg(long)]
        cache: Option<String>,
        /// Output as JSON
        #[arg(long)]
        json: bool,
    },
    /// Search OpenGameArt for CC0 assets
    SearchOga {
        /// Search query (e.g. "dungeon", "platformer")
        query: String,
        /// Filter by type: 2d, 3d, music, sound, texture, concept, document
        #[arg(long = "type")]
        asset_type: Option<String>,
        /// Page number (0-indexed)
        #[arg(long, default_value = "0")]
        page: usize,
        /// Output as JSON
        #[arg(long)]
        json: bool,
    },
    /// Get details about a CC0 asset from OpenGameArt
    InfoOga {
        /// Asset ID (e.g. "dungeon-tileset")
        id: String,
        /// Output as JSON
        #[arg(long)]
        json: bool,
    },
    /// Download a CC0 asset from OpenGameArt
    DownloadOga {
        /// Asset ID (e.g. "dungeon-tileset")
        id: String,
        /// Destination directory (defaults to "assets/oga")
        dest: Option<String>,
        /// Output as JSON
        #[arg(long)]
        json: bool,
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
        Commands::Assets { action } => match action {
            AssetsAction::List { type_filter, json } => {
                commands::assets::run_list(type_filter, json)
            }
            AssetsAction::Search {
                query,
                type_filter,
                json,
            } => commands::assets::run_search(query, type_filter, json),
            AssetsAction::Download { id, dest, json } => {
                commands::assets::run_download(id, dest, json)
            }
            AssetsAction::Inspect { id, cache, json } => {
                commands::assets::run_inspect(id, cache, json)
            }
            AssetsAction::SearchOga {
                query,
                asset_type,
                page,
                json,
            } => commands::assets_oga::run_search(query, asset_type, page, json),
            AssetsAction::InfoOga { id, json } => commands::assets_oga::run_info(id, json),
            AssetsAction::DownloadOga { id, dest, json } => {
                commands::assets_oga::run_download(id, dest, json)
            }
        },
        Commands::New { name } => commands::new::run(&name),
        Commands::Init => commands::init::run(),
    }
}
