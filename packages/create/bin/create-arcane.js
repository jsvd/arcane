#!/usr/bin/env node

/**
 * @arcane/create — Project scaffolding tool
 *
 * Usage: npm create @arcane/game my-game
 *
 * This is a thin wrapper around `arcane new` command.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const args = process.argv.slice(2);
const projectName = args[0];

if (!projectName) {
  console.error('Usage: npm create @arcane/game <project-name>');
  console.error('Example: npm create @arcane/game my-game');
  process.exit(1);
}

console.log(`Creating Arcane project "${projectName}"...`);

// Check if arcane CLI is installed
const arcane = spawn('arcane', ['new', projectName], {
  stdio: 'inherit',
  shell: true,
});

arcane.on('error', (err) => {
  console.error('\n❌ Error: arcane CLI not found');
  console.error('\nPlease install the Arcane CLI first:');
  console.error('  cargo install arcane-cli');
  console.error('\nOr build from source:');
  console.error('  git clone https://github.com/anthropics/arcane.git');
  console.error('  cd arcane');
  console.error('  cargo build --release');
  console.error('  export PATH="$PATH:$(pwd)/target/release"');
  process.exit(1);
});

arcane.on('close', (code) => {
  if (code === 0) {
    console.log(`\n✓ Created Arcane project "${projectName}"`);
    console.log('\nNext steps:');
    console.log(`  cd ${projectName}`);
    console.log('  npm install');
    console.log('  arcane dev');
  } else {
    process.exit(code);
  }
});
