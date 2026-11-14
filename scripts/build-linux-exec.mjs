import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const outDir = path.join(rootDir, 'linux');
const outFile = path.join(outDir, 'xadrez-3d-master');

if (!fs.existsSync(distDir)) {
  console.error('Erro: pasta dist/ não encontrada. Execute "npm run build" primeiro.');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

// Pack dist/ as tar.gz and compute short deterministic hash for cache versioning
const tarGzBuffer = execFileSync('tar', ['-czf', '-', '-C', distDir, '.'], {
  maxBuffer: 50 * 1024 * 1024,
});
const archiveHash = crypto.createHash('sha256').update(tarGzBuffer).digest('hex').slice(0, 12);
const base64Payload = tarGzBuffer.toString('base64').replace(/(.{76})/g, '$1\n');

const launcherTemplate = `#!/usr/bin/env bash
# Xadrez 3D Master - Executável Portátil para Slackware Linux (KDE & Xfce)
# Gerado automaticamente a partir do build de produção (dist/)

set -euo pipefail

APP_ID="xadrez-3d-master"
ARCHIVE_HASH="${archiveHash}"
CACHE_ROOT="\${XDG_CACHE_HOME:-$HOME/.cache}/$APP_ID"
APP_DIR="$CACHE_ROOT/app-$ARCHIVE_HASH"
PID_FILE="$CACHE_ROOT/server.pid"
PORT_FILE="$CACHE_ROOT/server.port"

stop_existing_server() {
  if [[ -f "$PID_FILE" ]]; then
    local old_pid
    old_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ -n "$old_pid" ]] && kill -0 "$old_pid" 2>/dev/null; then
      kill "$old_pid" 2>/dev/null || true
      sleep 0.2
    fi
    rm -f "$PID_FILE" "$PORT_FILE"
  fi
}

case "\${1:-}" in
  --stop)
    stop_existing_server
    echo "Servidor do Xadrez 3D Master encerrado."
    exit 0
    ;;
  --help|-h)
    echo "Uso: $0 [--stop | --help]"
    echo "Inicia o Xadrez 3D Master offline em janela desktop no Slackware (KDE / Xfce)."
    exit 0
    ;;
esac

mkdir -p "$CACHE_ROOT"

# Extrai o bundle apenas na primeira execução (ou quando houver atualização)
if [[ ! -f "$APP_DIR/index.html" ]]; then
  rm -rf "$CACHE_ROOT"/app-*
  mkdir -p "$APP_DIR"
  ARCHIVE_LINE="$(awk '/^__ARCHIVE_BELOW__$/ {print NR + 1; exit 0;}' "$0")"
  if command -v base64 >/dev/null 2>&1; then
    tail -n +"$ARCHIVE_LINE" "$0" | base64 -d | tar -xz -C "$APP_DIR"
  elif command -v python3 >/dev/null 2>&1; then
    tail -n +"$ARCHIVE_LINE" "$0" | python3 -c "import sys,base64; sys.stdout.buffer.write(base64.b64decode(sys.stdin.read()))" | tar -xz -C "$APP_DIR"
  else
    echo "Erro: 'base64' ou 'python3' é necessário para extrair o jogo." >&2
    exit 1
  fi
fi

stop_existing_server

# Inicia servidor HTTP local em porta aleatória segura (127.0.0.1:0)
if command -v python3 >/dev/null 2>&1; then
  python3 - "$APP_DIR" "$PORT_FILE" >/dev/null 2>&1 <<'PYEOF' &
import sys, os, functools
from http.server import HTTPServer, SimpleHTTPRequestHandler

directory = sys.argv[1]
port_file = sys.argv[2]

class ChessHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.css': 'text/css',
        '.html': 'text/html; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
        '.wasm': 'application/wasm',
    }
    def log_message(self, format, *args):
        pass

handler = functools.partial(ChessHandler, directory=directory)
httpd = HTTPServer(('127.0.0.1', 0), handler)
port = httpd.server_address[1]
with open(port_file, 'w') as f:
    f.write(str(port))
httpd.serve_forever()
PYEOF
  SERVER_PID=$!
elif command -v node >/dev/null 2>&1; then
  node - "$APP_DIR" "$PORT_FILE" >/dev/null 2>&1 <<'JSEOF' &
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = process.argv[2];
const portFile = process.argv[3];
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
};

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  let filePath = path.join(root, urlPath === '/' ? 'index.html' : urlPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(root, 'index.html');
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});
server.listen(0, '127.0.0.1', () => {
  fs.writeFileSync(portFile, String(server.address().port));
});
JSEOF
  SERVER_PID=$!
else
  echo "Erro: Python 3 (padrão no Slackware) ou Node.js é necessário para executar o servidor local." >&2
  exit 1
fi

echo "$SERVER_PID" > "$PID_FILE"

# Aguarda porta ficar disponível
PORT=""
for _ in $(seq 1 50); do
  if [[ -s "$PORT_FILE" ]]; then
    PORT="$(cat "$PORT_FILE")"
    break
  fi
  sleep 0.05
done

if [[ -z "$PORT" ]]; then
  echo "Erro ao iniciar servidor local do Xadrez 3D Master." >&2
  stop_existing_server
  exit 1
fi

URL="http://127.0.0.1:$PORT/"

# Prefere navegadores Chromium no modo janela dedicada (--app) para KDE e Xfce
CHROMIUM_BIN=""
for candidate in chromium chromium-browser google-chrome google-chrome-stable brave-browser vivaldi microsoft-edge; do
  if command -v "$candidate" >/dev/null 2>&1; then
    CHROMIUM_BIN="$candidate"
    break
  fi
done

if [[ -n "$CHROMIUM_BIN" ]]; then
  PROFILE_DIR="$CACHE_ROOT/browser-profile"
  mkdir -p "$PROFILE_DIR"
  "$CHROMIUM_BIN" \\
    --app="$URL" \\
    --user-data-dir="$PROFILE_DIR" \\
    --class="xadrez-3d-master" \\
    --name="xadrez-3d-master" \\
    --no-first-run \\
    --no-default-browser-check \\
    >/dev/null 2>&1 &
  BROWSER_PID=$!
  trap 'stop_existing_server' EXIT INT TERM
  wait "$BROWSER_PID" 2>/dev/null || true
  stop_existing_server
  exit 0
fi

# Fallbacks para KDE (Falkon) / Firefox / xdg-open (Xfce e KDE)
if command -v falkon >/dev/null 2>&1; then
  falkon --new-window "$URL" >/dev/null 2>&1 &
elif command -v firefox >/dev/null 2>&1; then
  firefox --new-window "$URL" >/dev/null 2>&1 &
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 &
else
  echo "Abra no seu navegador: $URL"
fi

echo "Xadrez 3D Master rodando em $URL (para encerrar o servidor, execute: $0 --stop)"
exit 0

__ARCHIVE_BELOW__
${base64Payload}
`;

fs.writeFileSync(outFile, launcherTemplate, { encoding: 'utf8', mode: 0o755 });
fs.chmodSync(outFile, 0o755);

const stats = fs.statSync(outFile);
console.log(`Executável Slackware gerado com sucesso: ${outFile} (${(stats.size / 1024).toFixed(1)} KB)`);
