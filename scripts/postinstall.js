const fs = require('node:fs');
const cp = require('node:child_process');

if (!fs.existsSync('scripts/agents/sync-agent-shims.mjs') || !fs.existsSync('.agents/config.json')) {
  console.log("Skipping agent shim sync: scripts/agents/sync-agent-shims.mjs or .agents/config.json is not present in this install context.");
  process.exit(0);
}

try {
  console.log("Running agents:sync...");
  cp.execSync('node scripts/agents/sync-agent-shims.mjs', { stdio: 'inherit' });
  console.log("Running agents:check...");
  cp.execSync('node scripts/agents/sync-agent-shims.mjs --check', { stdio: 'inherit' });
} catch (error) {
  console.error("Postinstall script failed:", error);
  process.exit(1);
}
