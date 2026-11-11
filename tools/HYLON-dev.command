#!/bin/zsh
cd "${0:A:h}/.."
if ! command -v npm >/dev/null; then
  echo 'Node.js and npm are required.'
  read '?Press Return to close.'
  exit 1
fi
if [[ ! -d node_modules/vite ]]; then
  echo 'Prepare dependencies once in this checkout with: npm ci'
  read '?Press Return to close.'
  exit 1
fi
export BROWSER='Google Chrome'
npm run dev -- --open
read '?Press Return to close.'
