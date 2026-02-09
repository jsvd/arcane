mod commands;

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "arcane", about = "Arcane 2D game engine CLI")]
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
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Test { path } => commands::test::run(path),
    }
}
