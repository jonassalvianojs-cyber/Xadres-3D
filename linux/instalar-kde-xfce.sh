#!/usr/bin/env bash
# Instalador do Xadrez 3D Master no menu de aplicativos do KDE Plasma e Xfce (Slackware Linux)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXEC_SRC="$SCRIPT_DIR/xadrez-3d-master"
ICON_SRC="$SCRIPT_DIR/xadrez-3d-master.svg"

BIN_DIR="$HOME/.local/bin"
APP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/scalable/apps"

if [[ ! -f "$EXEC_SRC" ]]; then
  echo "Erro: executável '$EXEC_SRC' não encontrado." >&2
  exit 1
fi

mkdir -p "$BIN_DIR" "$APP_DIR" "$ICON_DIR"

install -m 755 "$EXEC_SRC" "$BIN_DIR/xadrez-3d-master"
if [[ -f "$ICON_SRC" ]]; then
  install -m 644 "$ICON_SRC" "$ICON_DIR/xadrez-3d-master.svg"
fi

DESKTOP_FILE="$APP_DIR/xadrez-3d-master.desktop"
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Xadrez 3D Master
GenericName=Jogo de Xadrez 3D
Comment=Jogo de xadrez 3D com peças Staunton e inteligência artificial
Exec=$BIN_DIR/xadrez-3d-master
Icon=xadrez-3d-master
Terminal=false
Categories=Game;BoardGame;
Keywords=chess;xadrez;3d;tabuleiro;jogo;
StartupNotify=true
StartupWMClass=xadrez-3d-master
EOF

chmod 755 "$DESKTOP_FILE"

# Cria atalho opcional na Área de Trabalho (KDE / Xfce) se a pasta existir
for desktop_dir in "$HOME/Desktop" "$HOME/Área de Trabalho"; do
  if [[ -d "$desktop_dir" ]]; then
    cp "$DESKTOP_FILE" "$desktop_dir/xadrez-3d-master.desktop"
    chmod 755 "$desktop_dir/xadrez-3d-master.desktop"
  fi
done

# Atualiza caches de menu e ícones no KDE e Xfce
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$APP_DIR" 2>/dev/null || true
command -v gtk-update-icon-cache >/dev/null 2>&1 && gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" 2>/dev/null || true
command -v kbuildsycoca6 >/dev/null 2>&1 && kbuildsycoca6 >/dev/null 2>&1 || true
command -v kbuildsycoca5 >/dev/null 2>&1 && kbuildsycoca5 >/dev/null 2>&1 || true
command -v xfdesktop >/dev/null 2>&1 && xfdesktop --reload >/dev/null 2>&1 || true

echo "Xadrez 3D Master instalado com sucesso!"
echo "- Executável: $BIN_DIR/xadrez-3d-master"
echo "- Menu KDE / Xfce: Categoria 'Jogos / Board Games'"
