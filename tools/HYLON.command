#!/bin/zsh
# HYLON launcher. Frees the HYLON ports (4173 app, 4174 iPad remote, 4175 local live viewer) from any
# previous or hung instance, starts the dev server, and starts it again by itself if it ever stops.
# Ctrl+C stops it for good. Settings survive in .local/hylon-settings.json.
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
PORTS=(4173 4174 4175)
free_ports() {
  local pids
  pids=$(lsof -ti "tcp:${(j:,:)PORTS}" -sTCP:LISTEN 2>/dev/null | sort -u)
  [[ -z "$pids" ]] && return
  echo "Freeing HYLON ports ${PORTS} (pids: ${pids//$'\n'/ })"
  kill $=pids 2>/dev/null
  for i in {1..20}; do
    lsof -ti "tcp:${(j:,:)PORTS}" -sTCP:LISTEN >/dev/null 2>&1 || return
    sleep 0.25
  done
  pids=$(lsof -ti "tcp:${(j:,:)PORTS}" -sTCP:LISTEN 2>/dev/null | sort -u)
  [[ -n "$pids" ]] && { echo "Forcing: $pids"; kill -9 $=pids 2>/dev/null; sleep 0.5; }
}
stopping=0
trap 'stopping=1' INT TERM
first=1
while (( ! stopping )); do
  free_ports
  if (( first )); then npm run dev -- --open; else npm run dev; fi
  first=0
  (( stopping )) && break
  echo "HYLON stopped. Restarting in 2 s (Ctrl+C to quit)…"
  sleep 2
done
free_ports
echo 'HYLON closed.'
read '?Press Return to close.'
