# APOMIXIS live morphology

Deployed 2026-11-13 to composer-confirmed Hetzner VPS46.225.154.68 via root SSH. SSH alias `hetzner` uses zz (no passwordless sudo); direct alternatives `zz@46.225.154.68` and `root@46.225.154.68`. Canonical application root `/opt/apomixis`, current release `/opt/apomixis/releases/20261113T033244Z` through `/opt/apomixis/current`. Dedicated systemd service installed/enabled/started, isolated loopback4175. Caddy site imported and reload completed, with main config backed up. Cloudflare is authoritative DNS; composer reports adding the wildcard. Public address: https://apomixis.zztt.org/.

Mac publishing environment configured privately in ignored `apps/hylon/.env.local`; service secret at `/etc/apomixis/viewer.env`. Do not print or commit either. Start broadcasting explicitly through LIVE. If an already-open Vite process has not picked up the environment change, relaunch the existing single launcher.

Deployment commands completed successfully. No tests, builds, browser, public TLS, live WebSocket or physical output checks run, per composer instruction; DNS propagation/certificate issuance/public rendering remain unverified.

## Operator

Use the existing single `tools/HYLON.command`. In the desktop header, click the LIVE icon once to broadcast and again to stop. No modal; status is in the tooltip and active state. Local viewer: http://127.0.0.1:4175/. Public viewer: https://apomixis.zztt.org/. Stopping closes both local relay and upstream connection. Reload/page exit requests stop; a failed request leaves a stale signal, never a simulated continuing performance. Existing page-hidden/closed-pod transport policies still apply: keep the HYLON performance window visible.

This local listener is loopback only. Public hosting is a separate always-running relay. No microphone, audio, raw MIDI, SysEx, devices, score editor or remote commands are exposed. Existing LAN `/remoto` is independent.

Audience header: **APOMIXIS | piece name | mm:ss**, with fullscreen on the far right. Time is actual score position, without total duration or milliseconds. Last state freezes with a signal-loss indicator after 2.5s without a fresh frame. HOLD keeps the position fixed while state heartbeats continue. Resizing redraws the most recent frame.

Native fullscreen is requested where supported. On iPhone, use Safari Share → Add to Home Screen → Open as Web App, then launch that icon for a browserless view. Manifest standalone mode, Apple web-app metadata and safe-area/dynamic viewport CSS are included. CSS does not promise to hide Safari chrome. Home Screen behavior on the actual iPhone remains unverified.

## Signal and load

`spore.publicFrame()` projects the active score/generator into a version1 visual frame. Desktop and audience share `packages/hylon-visuals/morphology.js`. This reproduces current logical stop/coupling morphology for every loaded score; it does not add the future MEIOSIS flower visualization or stream the desktop/audio.

Publisher runs at5Hz, sends only the latest frame, skips while a fetch is pending, and times out locally after2s. Source generation/scheduling never awaits network. Public relay accepts one authenticated publisher, up to500 viewers,32KB max frame,10frames/s, bounded64KB viewer buffers, schema validation, ping/pong cleanup and no viewer commands. Latest frame is RAM-only and is replayed to new viewers, followed by offline state if stale. No video encoding, database or persistent performance log. Bandwidth remains an estimate until explicitly measured.

## Public server deployment reference

Use a supported Node runtime compatible with the repository and its existing `ws` dependency. Install this checkout and production dependencies under the actual target directory. The installed systemd unit uses dedicated `apomixis` user and `/opt/apomixis/current`; use release directories and switch that symlink for future deployments.

1. Point apomixis.zztt.org DNS to the chosen server.
2. Create `/etc/apomixis/viewer.env`, restricted to the service administrator, from `deploy/apomixis/viewer.env.example`. Set a private random publish key of at least32characters. Do not commit it.
3. Install `deploy/apomixis/apomixis-viewer.service` after adapting paths; start the service. It listens on loopback4175. Explicit CLI alternative: `npm run viewer:serve` with those environment variables set.
4. Merge the supplied Caddy site block into the server's existing HTTPS proxy configuration. Preserve other sites. Proxy WebSocket upgrades on `/live/view` and `/live/publish` (Caddy reverse_proxy handles this).
5. Launch HYLON on the Mac with `APOMIXIS_RELAY_URL=https://apomixis.zztt.org` and the matching `APOMIXIS_PUBLISH_KEY` in its process environment, then click LIVE (single-click toggle). These variables are server-only and are never VITE-prefixed or returned to the browser.

Vite loads the ignored `apps/hylon/.env.local` if preferred for the two Mac variables; restarting the single launcher is necessary after editing environment settings. The plugin reads them through Vite loadEnv, not through client-side define. Without upstream configuration, LIVE is local-only and says so. Invalid/incomplete upstream configuration shows a configuration error. Upstream reconnects on network loss, sending fresh state only; it never replays commands or changes a device.

`deploy/apomixis/` contains reusable deployment configuration. See the dated deployment record above for installed paths and remaining unverified public behavior.


## Public idle synopsis

When no fresh transmission is available, the viewer shows a Spanish general-audience introduction (about300words total) to Apomixis plus SPORE/GAMETE/MEIOSIS, the three pieces with current dossiers. Sources: README cycle concept; composer Drive `dev/01_SPORE_dossier.md`; `docs/GAMETE-DOSSIER.md`; `docs/MEIOSIS-DOSSIER.md`. Later MEIOSIS dossier supersedes the older archive's anti-romantic performance wording. Text describes compositional intentions without claiming all candidate behaviors are verified. No synopses invented for the six numbers without current dossiers. Fresh state switches automatically to morphology; stale/disconnected state returns to the scrollable responsive synopsis. HOLD still counts as transmitting.
