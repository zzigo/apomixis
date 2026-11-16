#!/usr/bin/env python3
"""Local-only, resumable Klais inventory/encoding. Never edits source recordings."""
import argparse
import ctypes
import ctypes.util
import concurrent.futures
import hashlib
from functools import lru_cache
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import time
from urllib.parse import quote, unquote

DEFAULT_SOURCE = Path('/Users/zztt/Downloads/WRK-DEV-PROCESS/2020 Organo Klais Sampler/wav')
PROFILE = {'codec': 'libvorbis', 'quality': 5, 'profileStatus': 'new-unverified-precedent'}

class SoundInfo(ctypes.Structure):
    _fields_ = [('frames', ctypes.c_int64), ('samplerate', ctypes.c_int), ('channels', ctypes.c_int), ('format', ctypes.c_int), ('sections', ctypes.c_int), ('seekable', ctypes.c_int)]

def sndfile_library():
    path = ctypes.util.find_library('sndfile') or '/opt/homebrew/lib/libsndfile.dylib'
    lib = ctypes.CDLL(path)
    lib.sf_open.argtypes = [ctypes.c_char_p, ctypes.c_int, ctypes.POINTER(SoundInfo)]; lib.sf_open.restype = ctypes.c_void_p
    lib.sf_close.argtypes = [ctypes.c_void_p]; lib.sf_close.restype = ctypes.c_int
    lib.sf_readf_float.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_float), ctypes.c_int64]; lib.sf_readf_float.restype = ctypes.c_int64
    lib.sf_writef_float.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_float), ctypes.c_int64]; lib.sf_writef_float.restype = ctypes.c_int64
    lib.sf_command.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_void_p, ctypes.c_int]; lib.sf_command.restype = ctypes.c_int
    lib.sf_error.argtypes = [ctypes.c_void_p]; lib.sf_error.restype = ctypes.c_int
    lib.sf_version_string.restype = ctypes.c_char_p
    return lib

def encode_vorbis(original, target, quality=5, seconds=None):
    lib = sndfile_library(); info = SoundInfo()
    src = lib.sf_open(os.fsencode(original), 0x10, ctypes.byref(info))
    if not src: raise ValueError('libsndfile cannot read source')
    dst = None
    try:
        if info.channels != 2: raise ValueError('Unexpected non-stereo source')
        out = SoundInfo(0, info.samplerate, info.channels, 0x200000 | 0x0060, 0, 0)
        dst = lib.sf_open(os.fsencode(target), 0x20, ctypes.byref(out))
        if not dst: raise ValueError('libsndfile cannot create Ogg/Vorbis output')
        value = ctypes.c_double(quality / 10.0)
        result = lib.sf_command(dst, 0x1300, ctypes.byref(value), ctypes.sizeof(value))
        if result != 1: raise ValueError('Vorbis quality command rejected: ' + str(result))
        buffer = (ctypes.c_float * (8192 * info.channels))()
        remaining = min(info.frames, int(seconds * info.samplerate)) if seconds is not None else info.frames
        while remaining > 0:
            frames = lib.sf_readf_float(src, buffer, min(8192, remaining))
            if frames == 0: break
            if lib.sf_writef_float(dst, buffer, frames) != frames: raise ValueError('Incomplete Vorbis write')
            remaining -= frames
        if remaining or lib.sf_error(src) or lib.sf_error(dst): raise ValueError('Source/encoder incomplete read-write')
    finally:
        close_error = dst and lib.sf_close(dst)
        lib.sf_close(src)
        if close_error: raise ValueError('Vorbis finalize failed')

@lru_cache(maxsize=1)
def encoder_versions():
    vorbis = ctypes.CDLL(ctypes.util.find_library('vorbis') or '/opt/homebrew/lib/libvorbis.dylib')
    vorbis.vorbis_version_string.restype = ctypes.c_char_p
    return {'implementation': 'libsndfile ctypes OGG|VORBIS', 'libsndfile': sndfile_library().sf_version_string().decode(), 'libvorbis': vorbis.vorbis_version_string().decode(), 'qualityCommand': 'SFC_SET_VBR_ENCODING_QUALITY=0x1300 double 0.5; return SF_TRUE', 'gain': 'No normalization, resampling or channel conversion'}

def digest(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

def canonical_hash(payload):
    return hashlib.sha256(json.dumps({k: v for k, v in payload.items() if k != 'contentHash'}, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()

def atomic_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix='.' + path.name, suffix='.tmp', dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as f:
            json.dump(value, f, indent=2, ensure_ascii=False)
            f.write('\n')
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)

def root_midi(filename):
    # Match a complete final note token, never manual/register numbers or _ST_48.
    match = re.search(r'(?:^|[_ -])([A-Ga-g])([#b]?)(-?\d+)$', Path(filename).stem)
    if not match: return None
    semitone = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}[match[1].upper()]
    note = (int(match[3]) + 1) * 12 + semitone + {'': 0, '#': 1, 'b': -1}[match[2]]
    return note if 0 <= note <= 127 else None

def classify(path):
    with open(path, 'rb') as f: header = f.read(12)
    if header[:4] in (b'RIFF', b'RF64') and header[8:12] == b'WAVE': return 'wav'
    if header[:4] == b'FORM' and header[8:12] in (b'AIFF', b'AIFC'): return 'aiff'
    return 'non-audio'

def command(args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout

def probe(path):
    data = json.loads(command(['ffprobe', '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_name,channels,sample_rate,duration:format=duration', '-of', 'json', str(path)]))
    if len(data.get('streams', [])) != 1: raise ValueError('Expected exactly one audio stream')
    stream = data['streams'][0]
    if stream['channels'] != 2: raise ValueError('Unexpected non-stereo source/output')
    return {'codec': stream['codec_name'], 'channels': stream['channels'], 'sampleRate': int(stream['sample_rate']), 'duration': float(stream.get('duration') or data['format']['duration'])}

def decode_check(path):
    command(['ffmpeg', '-nostdin', '-v', 'error', '-xerror', '-i', str(path), '-map', '0:a:0', '-f', 'null', '-'])

def inventory(source):
    entries = []
    for p in sorted(source.rglob('*')):
        if not p.is_file() or p.name.startswith('.'): continue
        kind = classify(p)
        entries.append({'sourcePath': p.relative_to(source).as_posix(), 'bytes': p.stat().st_size, 'headerType': kind})
    return entries

def registration(relative):
    parts = Path(relative).parts
    folder = parts[0] if len(parts) > 1 else 'unclassified'
    division = next((v for k, v in [('1manual', 'go'), ('2manual', 'po'), ('3manual', 're'), ('4manual', 'so'), ('pedal', 'pe')] if folder.startswith(k)), 'unknown')
    return {'id': folder, 'label': folder.replace('_', ' '), 'division': division, 'kind': 'recorded-combination' if division != 'unknown' else 'unclassified', 'samples': []}

def encoding_profile():
    return {**PROFILE, 'implementation': encoder_versions()}

def output_url(relative, source_hash, profile=None, encoded_hash='pending'):
    # Changed source/profile gets a new immutable URL. Publishing a later manifest
    # cannot invalidate files referenced by the previous manifest if another task fails.
    profile_id = canonical_hash(profile or encoding_profile())[:16]
    path = Path(relative)
    target = Path('audio') / path.parent / source_hash / ('q5-' + profile_id) / encoded_hash / (path.name + '.ogg')
    return quote(target.as_posix(), safe='/')

def original_take(relative):
    return any(p.lower().startswith('proyecto') for p in Path(relative).parts[:-1])

def encode_one(source, output, entry):
    relative = entry['sourcePath']; original = source / relative
    source_hash = digest(original); metadata = probe(original)
    profile = encoding_profile()
    receipt_id = hashlib.sha256(relative.encode()).hexdigest() + '-' + source_hash + '-' + canonical_hash(profile)[:16]
    receipt = output / '.receipts' / (receipt_id + '.json')
    old = None
    try: old = json.loads(receipt.read_text())
    except (OSError, ValueError): pass
    old_hash = old.get('hash', '') if old else ''
    valid_hash = bool(re.fullmatch(r'[0-9a-f]{64}', old_hash))
    url = output_url(relative, source_hash, profile, old_hash) if valid_hash else None
    target = output / unquote(url) if url else None
    valid = old and valid_hash and old.get('sourceHash') == source_hash and old.get('encoding') == profile and target.is_file() and old_hash == digest(target)
    if valid:
        encoded = probe(target)
        valid = encoded['codec'] == 'vorbis' and encoded['sampleRate'] == metadata['sampleRate'] and abs(encoded['duration'] - metadata['duration']) <= 0.1
    if not valid:
        staging = output / '.staging'; staging.mkdir(parents=True, exist_ok=True)
        fd, temporary = tempfile.mkstemp(prefix='.encoding-', suffix='.ogg', dir=staging); os.close(fd)
        try:
            encode_vorbis(original, temporary)
            encoded = probe(temporary)
            if encoded['codec'] != 'vorbis' or encoded['sampleRate'] != metadata['sampleRate'] or abs(encoded['duration'] - metadata['duration']) > 0.1:
                raise ValueError('Encoded codec/rate/duration mismatch: ' + relative)
            decode_check(temporary)
            encoded_hash = digest(temporary)
            url = output_url(relative, source_hash, profile, encoded_hash)
            target = output / unquote(url); target.parent.mkdir(parents=True, exist_ok=True)
            if not target.exists() or digest(target) != encoded_hash: os.replace(temporary, target)
            atomic_json(receipt, {'sourceHash': source_hash, 'hash': encoded_hash, 'encoding': profile, 'url': url})
        finally:
            if os.path.exists(temporary): os.unlink(temporary)
    else:
        decode_check(target)
    root = root_midi(original.name)
    return {'id': 'klais-' + hashlib.sha256(relative.encode()).hexdigest()[:20], 'registrationId': registration(relative)['id'], 'sourcePath': relative, 'sourceHash': source_hash, 'url': url, 'hash': digest(target), 'bytes': target.stat().st_size, 'codec': 'vorbis', 'channels': encoded['channels'], 'sampleRate': encoded['sampleRate'], 'frames': round(encoded['duration'] * encoded['sampleRate']), 'duration': encoded['duration'], 'rootMidi': root, 'mappingStatus': 'filename-derived' if root is not None else 'unmapped', 'loop': None}

def benchmark(source, output, entries):
    results = []
    candidates = [e for e in entries if e['headerType'] != 'non-audio' and root_midi(Path(e['sourcePath']).name) is not None]
    for entry in [candidates[0], candidates[-1]] if candidates else []:
        original = source / entry['sourcePath']
        for quality in (4, 5):
            target = output / 'benchmark' / (hashlib.sha256(entry['sourcePath'].encode()).hexdigest()[:12] + f'-q{quality}.ogg')
            target.parent.mkdir(parents=True, exist_ok=True)
            encode_vorbis(original, target, quality, seconds=12)
            decode_check(target)
            results.append({'sourcePath': entry['sourcePath'], 'quality': quality, 'bytes': target.stat().st_size, **probe(target)})
    atomic_json(output / 'benchmark.json', results)
    return results

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--output', type=Path, default=Path('.local/klais'))
    parser.add_argument('--workers', type=int, default=4)
    parser.add_argument('--inventory-only', action='store_true')
    parser.add_argument('--limit', type=int)
    parser.add_argument('--include-originals', action='store_true', help='Also encode long Reaper project source takes (default inventory only)')
    args = parser.parse_args()
    source, output = args.source.resolve(), args.output.resolve()
    if not source.is_dir(): parser.error('Source directory unavailable')
    if output == source or source in output.parents or output in source.parents: parser.error('Source and output must be disjoint directories')
    if not 1 <= args.workers <= 16: parser.error('Workers must be 1..16')
    if args.limit is not None and args.limit < 1: parser.error('Limit must be positive')
    started = time.monotonic()
    entries = inventory(source)
    for e in entries:
        if e['headerType'] != 'non-audio': e['playbackPolicy'] = 'inventory-only-original' if original_take(e['sourcePath']) and not args.include_originals else 'encode'
    def inspect_entry(entry):
        if entry['headerType'] != 'non-audio':
            path = source / entry['sourcePath']
            entry.update(probe(path))
            entry['sourceHash'] = digest(path)
            entry['rootMidi'] = root_midi(path.name)
        return entry
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        entries = list(pool.map(inspect_entry, entries))
    atomic_json(output / 'inventory.json', {'schemaVersion': 1, 'entries': entries})
    all_audio = [e for e in entries if e['headerType'] != 'non-audio']
    audio = [e for e in all_audio if e['playbackPolicy'] == 'encode']
    source_stats = {}
    for entry in all_audio:
        group = 'original' if original_take(entry['sourcePath']) else ('mapped' if entry['rootMidi'] is not None else 'unmapped')
        stats = source_stats.setdefault(group, {'count': 0, 'bytes': 0, 'seconds': 0})
        stats['count'] += 1; stats['bytes'] += entry['bytes']; stats['seconds'] += entry['duration']
    atomic_json(output / 'source-stats.json', source_stats)
    print(f'Inventory: {len(entries)} files, {len(all_audio)} header-confirmed audio sources; {len(audio)} playback candidates, {len(all_audio)-len(audio)} original takes excluded', flush=True)
    if args.inventory_only: return
    benchmark(source, output, entries)
    samples = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(encode_one, source, output, e) for e in audio[:args.limit] if args.limit] if args.limit else [pool.submit(encode_one, source, output, e) for e in audio]
        for future in concurrent.futures.as_completed(futures):
            samples.append(future.result())
            if len(samples) % 50 == 0: print(f'Validated {len(samples)}/{len(futures)} encodings ({time.monotonic()-started:.1f}s)', flush=True)
    samples.sort(key=lambda s: s['sourcePath'])
    registrations = {p.name: registration(p.name + '/placeholder') for p in source.iterdir() if p.is_dir()}
    for sample in samples:
        reg = registration(sample['sourcePath']); registrations.setdefault(reg['id'], reg)['samples'].append(sample['id'])
    manifest = {'schemaVersion': 1, 'instrumentId': 'klais', 'version': '0.1.0', 'rootConvention': 'C4=60', 'registrations': sorted(registrations.values(), key=lambda r: r['id']), 'samples': samples, 'encoding': PROFILE, 'provenance': {'description': 'Local Klais recorded registration combinations; source preserved.', 'rootConvention': 'Filename-derived C4=60; unverified by listening or pitch measurement.', 'license': 'Unverified; no public upload authorized.', 'loops': 'None. No sustain loops fabricated.', 'excludedOriginalTakes': len(all_audio)-len(audio), 'partial': args.limit is not None}}
    manifest['encoding'] = encoding_profile()
    manifest['contentHash'] = canonical_hash(manifest)
    atomic_json(output / 'manifest.json', manifest)
    stats = {'samples': len(samples), 'encodedBytes': sum(s['bytes'] for s in samples), 'durationSeconds': sum(s['duration'] for s in samples), 'unmapped': sum(s['rootMidi'] is None for s in samples), 'elapsedSeconds': round(time.monotonic()-started, 2), 'excludedOriginalTakes': len(all_audio)-len(audio)}
    atomic_json(output / 'build-stats.json', stats)
    print(f'Complete: {json.dumps(stats)}; manifest {manifest["contentHash"]}', flush=True)

if __name__ == '__main__': main()
