// 24/7 Resilient Daemon Watchdog & Memory Optimization for Consultant Studio
import http from 'http';
import { execFile } from 'child_process';

const CHECK_INTERVAL_MS = 60 * 1000; // Check every 60 seconds
const HEALTH_URL = 'http://127.0.0.1:3000/';

function checkHealth() {
  const req = http.get(HEALTH_URL, { timeout: 8000 }, (res) => {
    if (res.statusCode !== 200) {
      console.warn(`[Watchdog] HTTP status ${res.statusCode}. Triggering cluster refresh...`);
      restartApp();
    }
  });

  req.on('timeout', () => {
    req.destroy();
    console.error('[Watchdog] Request timed out. Triggering cluster refresh...');
    restartApp();
  });

  req.on('error', (err) => {
    console.error(`[Watchdog] Connection error: ${err.message}. Triggering cluster refresh...`);
    restartApp();
  });
}

function restartApp() {
  // Safe execFile with direct binary path and fixed arguments
  execFile('/home/ubuntu/.local/lib/node_modules/pm2/bin/pm2', ['restart', 'consultant-studio', '--update-env'], (err, stdout, stderr) => {
    if (err) console.error('[Watchdog Restart Error]:', err);
    else console.log('[Watchdog Restarted Consultant Studio Successfully]');
  });
}

console.log('🛡️ Consultant Studio 24/7 Continuous Watchdog Daemon Active.');
setInterval(checkHealth, CHECK_INTERVAL_MS);
checkHealth();
