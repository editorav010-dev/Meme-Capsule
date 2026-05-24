const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SYNC_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'sync-project-structure.cjs');

const EXCLUDED = new Set(['node_modules', '.git', '.wrangler', 'dist', 'scripts']);

let timeoutId = null;
function triggerSync() {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  timeoutId = setTimeout(() => {
    try {
      console.log(`[Watcher] Change detected. Running sync...`);
      execSync(`node "${SYNC_SCRIPT}"`, { stdio: 'inherit' });
    } catch (e) {
      console.error('[Watcher] Sync failed:', e.message);
    }
  }, 400); // 400ms debounce
}

console.log('[Watcher] Monitoring project directory changes for docs sync...');

// Run initial sync to make sure everything matches
triggerSync();

// Watch directories recursively using standard fs.watch
function watchRecursive(dir) {
  const absoluteDir = path.join(PROJECT_ROOT, dir);
  if (!fs.existsSync(absoluteDir)) return;

  try {
    fs.watch(absoluteDir, (eventType, filename) => {
      if (filename) {
        const ext = path.extname(filename);
        // Ignore output build files, temp files, and PROJECT_STRUCTURE.md itself to avoid infinite loops
        if (
          EXCLUDED.has(filename) || 
          filename.startsWith('.') || 
          ext === '.log' || 
          filename === 'PROJECT_STRUCTURE.md' ||
          absoluteDir.includes('node_modules') ||
          absoluteDir.includes('.git') ||
          absoluteDir.includes('dist') ||
          absoluteDir.includes('scripts')
        ) {
          return;
        }
        triggerSync();
      }
    });
  } catch (err) {
    console.error(`[Watcher] Failed to bind watcher to directory: ${dir}`, err.message);
  }

  // Recurse directories
  try {
    const items = fs.readdirSync(absoluteDir);
    items.forEach(item => {
      const fullPath = path.join(absoluteDir, item);
      if (fs.statSync(fullPath).isDirectory() && !EXCLUDED.has(item) && !item.startsWith('.')) {
        watchRecursive(path.join(dir, item));
      }
    });
  } catch (err) {
    // Ignore read errors
  }
}

watchRecursive('.');
