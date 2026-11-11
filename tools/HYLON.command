#!/bin/zsh
cd "${0:A:h}/.."
if ! command -v node >/dev/null; then
  echo 'Node.js is required. Install Node.js, then open HYLON again.'
  read '?Press Return to close.'
  exit 1
fi
node tools/serve.mjs --open
read '?Press Return to close.'
