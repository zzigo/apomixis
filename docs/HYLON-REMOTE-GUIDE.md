# HYLON remote · first local release

Implementation draft, updated2026-11-12. Supports an iPad running Safari/iPadOS18 as a touch controller for the existing Mac session. It does not use Sidecar and does not instantiate another audio/MIDI/laser engine.

## Use

1. Start the usual `tools/HYLON.command` on the Mac. Keep the desktop HYLON page open and configure/enable desired outputs locally.
2. Click **REMOTE** in its header. This explicitly enables the LAN listener and shows private links. COPY the Wi-Fi address and open it in Safari on the iPad, connected to the same network. The persistent address is `http://<Mac-IP>:4174/remoto`, without a code or token. Bookmark it; the IP must remain assigned to the Mac.
3. Use PLAY, STOP, HOLD, RESET, speed, P2 or SUPER PANIC. State/time/status come from the Mac. STOP has the same reset-to-start meaning as the current desktop transport stop.
4. Close the desktop dialog to keep using the panel; use **REMOTE OFF** inside it to revoke the link. Reloading/closing the Mac session also revokes it. Enable again at the same address.

No QR is generated in this first release; COPY/link is the pairing mechanism. The remote now includes a shallow full-width MACRO/FORM chart, SPORE manual controls and the bottom MIXER (faders, sends, FX, autotune/chopper, mic monitoring of locally enabled input and meters). Registrations, sampler configuration, score selection/editing and desktop pod arrangement are not shared yet. Existing desktop controls and layout persistence remain intact.

A lost iPad connection does not stop the Mac. The controller reconnects and receives current state; pending commands are dropped, not replayed. The Mac's existing browser-visibility/page-close policies remain unchanged: keep the executing page available. Neither the controller nor a WebSocket connection keeps a sleeping Mac awake.

## Architecture

- Desktop Vite remains on loopback **127.0.0.1:4173**, with existing source, pods, devices and HMR.
- `tools/hylon-remote.mjs` is a Vite plugin. Only an explicit local same-origin POST to `/__hylon_remote/enable` starts the separate **0.0.0.0:4174** listener. It serves only the three remote-page assets and its authenticated WebSocket endpoint. It does not expose Vite source files, the sampler library, filesystem APIs or arbitrary commands on the LAN.
- `apps/hylon/src/remote-host.js` adds one REMOTE header button and pairing dialog. The desktop publishes a small state snapshot at4Hz; it receives an allowlisted command and invokes the existing scene or panic handlers.
- `apps/hylon/remote/` contains the independent plain HTML/CSS/JS touch UI. Large buttons, no framework or external assets, no runtime permission requests for MIDI/mic/USB.
- `ws` is the sole new runtime dependency. No cloud account or Internet service is involved. The current implementation is integrated with the development launcher; a frozen `npm start`/offline ZIP does not yet run the remote service.

## Authority and failure behavior

Remote serving is OFF until enabled on the Mac. At the composer’s request, controllers on the same LAN use the persistent `/remoto` address without authentication tokens or pairing codes. The internal host role still requires loopback, an ephemeral host-only token and the desktop origin. Controller origin matching, bounded messages and the action allowlist remain. Disabling, losing the desktop bridge or restarting Vite closes the listener; re-enabling uses the same URL.

Commands include play/stop/hold/reset/speed/P2/SUPER PANIC and closed, validated SPORE/MIXER parameter updates. There is no route for connecting, arming or selecting hardware, sending arbitrary MIDI/SysEx, changing files or starting laser output. PLAY uses the locally selected outputs; local audio must already be running when an audio route is selected. MIDI/laser authority is still the local operator's existing enable state. The locally approved remote panic controls retain their explicit emergency output authority.

The server rejects stale/no-host commands, duplicates within a controller connection, unsupported actions, invalid speeds, oversized messages and excessive command rates. Commands expire1.5s after forwarding. Acknowledgements have a10s timeout; the client never automatically retries a command. The controller becomes read-only when state goes stale. P2 reports desktop completion/error, not a guarantee of physical silence.

Port4174 must be reachable between the devices. If the network isolates Wi-Fi clients or a Mac firewall blocks Node, the page will not connect. No router port forwarding or firewall configuration is changed by the implementation. The initial version uses plain local HTTP/WebSocket, intended for the same trusted LAN.

## Verification status

No application tests, builds, browser/UI checks, iPad connectivity checks or hardware transmissions were run, following the composer's rapid-session instruction. Source implementation is complete for the first slice; actual Wi-Fi/Safari operation and concurrent desktop/controller use remain unverified. Future explicit verification should cover pairing/revocation, state synchronization, transport equivalence, panic reporting, stale rejection and reconnect without replay before adding mixer/register controls.


Fullscreen icon requests native document fullscreen, with the Safari WebKit fallback where available; unsupported browser modes show a message. Parameter drags coalesce at70ms within a live connection; only latest values waiting on an acknowledgement may follow it, never replayed after disconnect. Controller rate limit40commands/s. Macro history is sampled to at most241points and audio meter values are sampled4Hz from the Mac, independently of desktop pod visibility. Touch and physical response remain unverified in this update.


Latest header/emergency update supersedes earlier control restrictions: remote now renders the actual desktop masthead markup and maps its compact buttons, meters and labels to the Mac runtime. A/M/L can toggle already prepared audio/MIDI/connected HELIOS, by explicit composer authorization; initial permission/device pairing stays on the Mac. Added PS and STOP ALL. P2/SUPER PANIC use repeated real-wait sweeps and longer confirmation timeouts; optional PS invokes the fixed SC OSC utility. See [PANIC-RECOVERY](PANIC-RECOVERY.md) for setup and the unverified recovery status. Native fullscreen belongs to the iPad, not the Mac. Header REMOTE configuration stays local.
