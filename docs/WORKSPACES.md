# Sidebar workspaces

Four sidebar buttons: click recalls, Shift+click saves. No keyboard-number mapping added; plain digits/Shift digits remain macroform/harmonicity. Save flashes the slot briefly. Empty-slot click reports that it must be saved; a locked secondary HYLON tab reports unavailability rather than silently ignoring it.

Fix, 2026-11-13: Dockview's own serialization omits maximized state. workspace-store.js now stores a version2 envelope with layout, activePanel and maximizedPanel under width-independent hylon-workspace-slot-1…4 keys. Resizing across760px no longer changes the saved-slot bank. Earlier hylon-workspace-N-desktop/mobile entries remain recoverable fallbacks; none deleted. Recall uses reuseExistingPanels, reapplies focus/maximized view, and attempts prior-layout rollback if restoration fails. Workspace1 remains startup preference.

At composer request, targeted Node checks passed for maximized restoration, width-independent recall, legacy opposite-width fallback and panel reuse. In the existing IAB tab, Shift+click1 visibly reported saved, switching to CAPTURE then clicking1 restored LASER. No playback/connection/laser output was activated; A/M/L remainedOFF. These checks do not establish physical device behavior. Other new MIDI lab/attack functions were not auditioned.
