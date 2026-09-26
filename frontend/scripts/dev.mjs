import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const frontend = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const root = path.dirname(frontend);
const candidates = process.platform === 'win32' ? ['py', 'python'] : ['python3', 'python'];
const python = candidates.find(command => spawnSync(command, ['--version'], { stdio: 'ignore' }).status === 0);
const children = [];

if (python) {
  const api = spawn(python, ['-m', 'uvicorn', 'backend.main:app', '--reload', '--port', '8000'], { cwd: root, stdio: 'inherit' });
  api.on('error', error => console.warn(`FastAPI could not start: ${error.message}`));
  children.push(api);
} else {
  console.warn('Python was not found; Vite will use bundled JSON fallbacks.');
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const vite = spawn(npmCommand, ['run', 'dev:vite'], { cwd: frontend, stdio: 'inherit' });
children.push(vite);

const shutdown = () => { children.forEach(child => child.kill()); process.exit(); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
vite.on('exit', code => { children.forEach(child => child !== vite && child.kill()); process.exit(code ?? 0); });

