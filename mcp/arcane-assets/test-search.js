#!/usr/bin/env node

/**
 * Test script to validate search improvements
 */

import { searchKenneyAssets, listKenneyAssets } from "./dist/kenney.js";

console.log("=== Testing MCP Asset Server Search ===\n");

// Test 1: Search for "kitty" (should find animal pack via synonym)
console.log("Test 1: Searching for 'kitty'...");
const kittyResults = searchKenneyAssets("kitty");
console.log(`Found ${kittyResults.total} results`);
if (kittyResults.total > 0) {
  console.log("✅ PASS - Found packs containing cats/kitties");
  kittyResults.packs.slice(0, 3).forEach(pack => {
    console.log(`  - ${pack.name}`);
    if (pack.contents) {
      console.log(`    Contents: ${pack.contents.join(", ")}`);
    }
  });
} else {
  console.log("❌ FAIL - No results found");
  if (kittyResults.suggestions) {
    console.log("Suggestions:", kittyResults.suggestions);
  }
}
console.log();

// Test 2: Search for "unicorn" (should find horse-related via synonym)
console.log("Test 2: Searching for 'unicorn'...");
const unicornResults = searchKenneyAssets("unicorn");
console.log(`Found ${unicornResults.total} results`);
if (unicornResults.total > 0) {
  console.log("✅ PASS - Found packs containing horses/unicorns");
  unicornResults.packs.slice(0, 3).forEach(pack => {
    console.log(`  - ${pack.name}`);
    if (pack.contents) {
      console.log(`    Contents: ${pack.contents.join(", ")}`);
    }
  });
} else {
  console.log("❌ FAIL - No results found");
  if (unicornResults.suggestions) {
    console.log("Suggestions:", unicornResults.suggestions);
  }
}
console.log();

// Test 3: Search for "animal" (should find animal pack)
console.log("Test 3: Searching for 'animal'...");
const animalResults = searchKenneyAssets("animal");
console.log(`Found ${animalResults.total} results`);
if (animalResults.total > 0) {
  console.log("✅ PASS - Found animal packs");
  animalResults.packs.slice(0, 3).forEach(pack => {
    console.log(`  - ${pack.name}`);
  });
} else {
  console.log("❌ FAIL - No results found");
}
console.log();

// Test 4: Search for nonsense (should provide suggestions)
console.log("Test 4: Searching for 'xyzabc123' (should get suggestions)...");
const nonsenseResults = searchKenneyAssets("xyzabc123");
console.log(`Found ${nonsenseResults.total} results`);
if (nonsenseResults.total === 0 && nonsenseResults.suggestions) {
  console.log("✅ PASS - Provided helpful suggestions when no results found");
  nonsenseResults.suggestions.forEach(s => console.log(`  - ${s}`));
} else {
  console.log("❌ FAIL - Should have zero results with suggestions");
}
console.log();

// Summary
console.log("=== Catalog Summary ===");
const allPacks = listKenneyAssets();
console.log(`Total packs: ${allPacks.length}`);

const withContents = allPacks.filter(p => p.contents && p.contents.length > 0);
console.log(`Packs with content metadata: ${withContents.length}`);

console.log("\nNew animal/character packs:");
const animalPacks = allPacks.filter(p =>
  p.id.includes("animal") ||
  p.id.includes("creature") ||
  p.id.includes("toon") ||
  p.id.includes("fish")
);
animalPacks.forEach(pack => {
  console.log(`  - ${pack.id}: ${pack.name}`);
});
