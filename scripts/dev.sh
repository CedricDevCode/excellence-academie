#!/usr/bin/env bash
# Lanceur `npm run dev` robuste : s'assure que le bon Node (>= 22.12) est actif.
# Fonctionne même dans un terminal ouvert avant l'installation de Node 22 via nvm.

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

require_node() {
  node -e "const m=/v(\d+)\.(\d+)/.exec(process.version);process.exit(m&&(+m[1]>22||(+m[1]===22&&+m[2]>=12))?0:1)"
}

if require_node; then
  exec npm run dev:all
fi

echo "→ Node $(node -v) trop ancien pour Vite 7. Bascule sur Node 22…"
if command -v nvm >/dev/null 2>&1; then
  nvm use 22 >/dev/null 2>&1 || { echo "⛔ Node 22 introuvable via nvm. Lancez : nvm install 22"; exit 1; }
else
  echo "⛔ nvm introuvable. Installez nvm + Node 22 ou lancez : nvm install 22"; exit 1
fi

require_node || { echo "⛔ Node $(node -v) toujours invalide après bascule."; exit 1; }
echo "→ OK, Node $(node -v). Démarrage…"
exec npm run dev:all