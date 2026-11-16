#!/usr/bin/env python3
"""Builds touchosc/HYLON.tosc (TouchOSC, iPad landscape 1024x768) for the OSC bridge in tools/hylon-osc.mjs.
A .tosc file is a zlib stream of XML (lexml). The schema used here follows the community notes of the format
(not an official specification): open the result in the TouchOSC editor once and save it from there.
Every control is named after its OSC address; buttons send the address with no argument, faders send 0-1,
and the root script applies the feedback (label text, fader position, button lamp colour)."""
import sys, uuid, zlib, pathlib
W, H = 1024, 768
cd = lambda t: '<![CDATA[' + str(t).replace(']]>', ']]]]><![CDATA[>') + ']]>'
def prop(kind, key, value):
    if kind == 's': body = cd(value)
    elif kind == 'c': body = ''.join(f'<{k}>{v}</{k}>' for k, v in zip('rgba', value))
    elif kind == 'r': body = ''.join(f'<{k}>{v}</{k}>' for k, v in zip('xywh', value))
    else: body = str(value)
    return f"<property type='{kind}'><key>{cd(key)}</key><value>{body}</value></property>"
def value(key, default):
    return f"<value><key>{cd(key)}</key><locked>0</locked><lockedDefaultCurrent>0</lockedDefaultCurrent><default>{cd(default)}</default><defaultPull>0</defaultPull></value>"
# Full property sets, key order and type codes as written by the TouchOSC editor (checked against layouts
# saved by the editor, lexml 5). Each control overrides what it needs.
COMMON = {'background': ('b', 1), 'color': ('c', (1, 1, 1, 1)), 'cornerRadius': ('f', 1), 'frame': ('r', (0, 0, 10, 10)), 'grabFocus': ('b', 0), 'interactive': ('b', 0), 'locked': ('b', 0), 'name': ('s', ''), 'orientation': ('i', 0), 'outline': ('b', 1), 'outlineStyle': ('i', 0), 'pointerPriority': ('i', 0), 'shape': ('i', 1), 'visible': ('b', 1)}
EXTRA = {
    'GROUP': {},
    'BUTTON': {'buttonType': ('i', 0), 'press': ('b', 1), 'release': ('b', 1), 'valuePosition': ('b', 0), 'grabFocus': ('b', 1), 'interactive': ('b', 1), 'cornerRadius': ('f', 2)},
    'FADER': {'bar': ('b', 1), 'barDisplay': ('i', 0), 'centered': ('b', 0), 'cursor': ('b', 1), 'cursorDisplay': ('i', 0), 'grid': ('b', 0), 'gridColor': ('c', (1, 1, 1, .25)), 'gridSteps': ('i', 10), 'response': ('i', 0), 'responseFactor': ('i', 100), 'grabFocus': ('b', 1), 'interactive': ('b', 1), 'cornerRadius': ('f', 2)},
    'LABEL': {'font': ('i', 0), 'textAlignH': ('i', 2), 'textAlignV': ('i', 2), 'textClip': ('b', 1), 'textColor': ('c', (1, 1, 1, 1)), 'textLength': ('i', 0), 'textSize': ('i', 14), 'background': ('b', 0), 'outline': ('b', 0), 'cornerRadius': ('f', 0)}}
def node(kind, name, frame, color, props=(), values=(), children=(), script=None):
    table = {**COMMON, **EXTRA[kind], 'name': ('s', name), 'frame': ('r', frame), 'color': ('c', color)}
    for override in props: table[override[0]] = (override[1], override[2])
    if script: table['script'] = ('s', script)
    p = [prop(code, key, val) for key, (code, val) in sorted(table.items())]
    v = list(values) + [value('touch', 'false')]
    kids = f"<children>{''.join(children)}</children>" if children else ''
    return f"<node ID='{uuid.uuid1()}' type='{kind}'><properties>{''.join(p)}</properties><values>{''.join(v)}</values>{kids}</node>"
BUTTON_LUA = "function onValueChanged(key)\n  if key == 'x' and self.values.x == 1 then sendOSC(self.name) end\nend\n"
FADER_LUA = "function onValueChanged(key)\n  if key == 'x' then sendOSC(self.name, self.values.x) end\nend\n"
ROOT_LUA = """-- HYLON remote. Feedback from the desktop: label text, fader position, button lamp colour.
local lit = Color(1.0, 0.74, 0.41, 1.0)
local base = {}
local last = 0
function init()
  sendOSC('/hylon/sync')
end
function update()
  local now = getMillis()
  if now - last > 2000 then
    last = now
    sendOSC('/hylon/ping')
  end
end
function onReceiveOSC(message, connections)
  local path = message[1]
  local args = message[2]
  if not args or not args[1] then return end
  local v = args[1].value
  if path == '/hylon/fb/alert' then
    local c = self:findByName('/hylon/fb/section', true)
    if c then
      if v > 1.5 then c.textColor = Color(0.35, 0.31, 0.05, 1.0)
      elseif v > 0.5 then c.textColor = Color(1.0, 0.88, 0.29, 1.0)
      else c.textColor = Color(0.71, 1.0, 0.81, 1.0) end
    end
    return
  end
  local c = self:findByName(path, true)
  if not c then return end
  if c.type == ControlType.LABEL then
    c.values.text = tostring(v)
  elseif c.type == ControlType.FADER then
    c.values.x = v
  elseif c.type == ControlType.BUTTON then
    if not base[c.ID] then base[c.ID] = Color(c.color.r, c.color.g, c.color.b, c.color.a) end
    if v > 0.5 then c.color = lit else c.color = base[c.ID] end
  end
end
"""
GREEN, DIM, RED, BLUE, VIOLET, GREY, TEXT = (.30, .55, .40, 1), (.16, .24, .19, 1), (.75, .20, .20, 1), (.25, .45, .70, 1), (.50, .36, .66, 1), (.22, .25, .23, 1), (.71, 1, .81, 1)
out = []
def label(name, x, y, w, h, text, size=13, color=TEXT, interactive=0):
    return node('LABEL', name, (x, y, w, h), color, [('interactive', 'b', interactive), ('background', 'b', 0), ('outline', 'b', 0), ('textSize', 'i', size), ('textColor', 'c', color)], [value('text', text)])
def button(address, x, y, w, h, text, color=DIM, size=12):
    out.append(node('BUTTON', address, (x, y, w, h), color, [('interactive', 'b', 1), ('background', 'b', 1), ('outline', 'b', 1), ('buttonType', 'i', 0)], [value('x', '0')], script=BUTTON_LUA))
    if text: out.append(label('', x, y, w, h, text, size))
def fader(address, x, y, w, h, text, color=GREEN):
    out.append(node('FADER', address, (x, y, w, h - 18), color, [('interactive', 'b', 1), ('background', 'b', 1), ('outline', 'b', 1)], [value('x', '0')], script=FADER_LUA))
    out.append(label('', x - 6, y + h - 16, w + 12, 16, text, 10))
def row(items, x, y, w, h, gap=4):
    for i, (address, text, *rest) in enumerate(items): button('/hylon' + address, x + i * (w + gap), y, w, h, text, *(rest or [DIM]))
# Header: title, section (large, turns yellow in the last 5 s), program, time, status.
out.append(label('/hylon/fb/title', 8, 6, 170, 56, 'HYLON', 20))
out.append(label('/hylon/fb/section', 184, 6, 440, 56, '', 30))
out.append(label('/hylon/fb/program', 630, 6, 250, 56, '', 26, (1, .74, .41, 1)))
out.append(label('/hylon/fb/time', 886, 6, 130, 30, '00:00', 14))
out.append(label('/hylon/fb/status', 886, 36, 130, 26, '', 9, (1, .5, .4, 1)))
# Transport, program steps, scores in concert order, stop / panic.
row([('/play', 'PLAY', GREEN), ('/hold', 'HOLD'), ('/reset', 'RESET'), ('/program/prev', '<', BLUE), ('/program/next', '>', BLUE)], 8, 70, 60, 48)
row([(f'/score/{n}', n, VIOLET) for n in ['01', '02', '03', '04', '05', '07', '08', '09', '06']], 336, 70, 54, 48)
row([('/stopall', 'STOP ALL', RED), ('/panic', 'PANIC', RED)], 866, 70, 73, 48)
# SPORE: TEMPO, DUR, vector, outputs.
for i, (address, text) in enumerate([('/tempo', 'TEMPO'), ('/dur', 'DUR'), ('/vector/mu', 'mu'), ('/vector/disp', 'disp'), ('/vector/poly', 'poly'), ('/vector/tuber', 'tuber'), ('/vector/cap', 'cap')]):
    fader('/hylon' + address, 12 + i * 46 + (16 if i > 1 else 0), 132, 34, 262, text, BLUE if i < 2 else GREEN)
row([('/vector/reset', 'x1'), ('/out/klais', 'K'), ('/out/audio', 'LA'), ('/out/midi', 'MO')], 12, 404, 78, 44)
# IMPRO: arm and routes, patches, then one row per source (P I II III IV): six targets and twelve kinds.
row([('/impro/arm', 'ARM', RED), ('/impro/klais', 'K'), ('/impro/audio', 'LA'), ('/impro/midi', 'MO'), ('/impro/stop', 'STOP'), ('/impro/random', 'RANDOM', VIOLET), ('/impro/empty', 'EMPTY'), ('/impro/follow', 'SCORE')], 360, 132, 78, 46)
row([(f'/impro/patch/{n}', str(n)) for n in range(1, 10)], 360, 184, 68, 40)
NAMES = {'pe': 'P', 'go': 'I', 'po': 'II', 're': 'III', 'so': 'IV'}
KINDS = ['TAP', 'TAPL', 'TAPR', 'TAPA', 'ARPU', 'ARPD', 'ARPB', 'ARPR', 'HOLDU', 'HOLDD', 'HOLDB', 'HOLDR']
for r, src in enumerate(['pe', 'go', 'po', 're', 'so']):
    y = 232 + r * 44
    out.append(label('', 360, y, 30, 40, NAMES[src], 14))
    x = 392
    for dst in ['pe', 'go', 'po', 're', 'so', 'R']:
        if dst != src: button(f'/hylon/impro/route/{src}/{dst}', x, y, 34, 40, NAMES.get(dst, 'R'), BLUE if dst != 'R' else VIOLET, 10)
        x += 36
    x += 6
    for k, kind in enumerate(KINDS):
        button(f'/hylon/impro/kind/{src}/{kind}', x, y, 31, 40, kind[0] + kind[-1] if len(kind) > 3 else 'T', (GREEN, BLUE, VIOLET)[k // 4] if False else DIM, 9)
        x += 33 + (5 if k % 4 == 3 else 0)
# MIXER and processes.
for i, (key, text) in enumerate([('samplerLevel', 'K'), ('localLevel', 'LA'), ('micLevel', 'MIC'), ('tapeLevel', 'TAPE'), ('reverbLevel', 'REV'), ('delayLevel', 'DLY'), ('master', 'MASTER')]):
    fader('/hylon/mix/' + key, 20 + i * 70, 470, 50, 284, text, GREEN if key != 'master' else (1, .74, .41, 1))
row([(f'/mix/snapshot/{n}', f'MIX {n}') for n in range(1, 5)], 530, 470, 78, 60)
row([('/process/audio', 'AUDIO'), ('/process/midi', 'MIDI'), ('/process/laser', 'LASER', RED)], 530, 560, 106, 60)
out.append(label('', 530, 640, 480, 110, 'HYLON OSC  send 9000  receive 9001', 10, (.45, .55, .5, 1)))
for version in sys.argv[1:] or ['5']:
    root = node('GROUP', 'HYLON', (0, 0, W, H), (0, 0, 0, 1), [('interactive', 'b', 0), ('background', 'b', 1), ('outline', 'b', 0)], children=out, script=ROOT_LUA)
    xml = f"<?xml version='1.0' encoding='UTF-8'?><lexml version='{version}'>{root}</lexml>"
    target = pathlib.Path(__file__).resolve().parent.parent / 'touchosc' / ('HYLON.tosc' if version == '5' else f'HYLON-lexml{version}.tosc')
    target.write_bytes(zlib.compress(xml.encode('utf-8'), 9)); (target.with_suffix('.xml')).write_text(xml, encoding='utf-8')
    print(target.name, len(xml), 'chars', xml.count('<node '), 'nodes')
