const path = require('path');
const { spawn } = require('child_process');
const localtunnel = require('localtunnel');

const projectRoot = path.resolve(__dirname, '..');
const port = process.env.PORT ? Number(process.env.PORT) : 8080;

const serverCommand =
  process.platform === 'win32' ? 'cmd.exe' : 'npm';
const serverArgs =
  process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npm run start:dev:server']
    : ['run', 'start:dev:server'];

const server = spawn(serverCommand, serverArgs, {
  cwd: projectRoot,
  stdio: 'inherit',
  env: process.env,
  shell: false,
});

server.on('error', (err) => {
  console.error('[start-pay] Server failed to start:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`[start-pay] Server exited with code ${code}`);
    process.exit(code ?? 1);
  }
});

(async () => {
  try {
    const tunnel = await localtunnel({ port, local_host: '127.0.0.1' });
    console.log(`\n[start-pay] Public tunnel started: ${tunnel.url}`);
    console.log(
      `[start-pay] SePay webhook URL 1: ${tunnel.url}/booking/appointments/webhook/sepay`,
    );
    console.log(
      `[start-pay] SePay webhook URL 2: ${tunnel.url}/api/booking/appointments/webhook/sepay`,
    );
    console.log(
      '[start-pay] Both webhook URLs are supported. Prefer URL 2 for SePay config.',
    );
    console.log('Press Ctrl+C to stop.\n');

    tunnel.on('close', () => {
      console.log('[start-pay] Tunnel closed.');
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('\n[start-pay] Stopping...');
      await tunnel.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await tunnel.close();
      process.exit(0);
    });
  } catch (err) {
    console.error('[start-pay] Failed to open tunnel:', err);
    process.exit(1);
  }
})();
