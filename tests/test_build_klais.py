"""Run: python3 -m unittest discover -s tests -p 'test_build_klais.py'."""
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch
import wave
from urllib.parse import unquote

spec = importlib.util.spec_from_file_location('build_klais', Path(__file__).parents[1] / 'tools/build-klais.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)

class PipelineTests(unittest.TestCase):
    def test_note_tokens_are_not_registers_or_take_numbers(self):
        for name, expected in [('cut_C4.wav', 60), ('cut_A#2.wav', 46), ('cut_Db3.aif', 49), ('C-1.wav', 0), ('cut_G9.wav', 127), ('cut_C10.wav', None), ('1manual_21_23.wav', None), ('cut_ST_48.aif', None), ('cresc-001.wav', None)]:
            self.assertEqual(build.root_midi(name), expected, name)

    def test_folder_is_a_recorded_combination_not_a_stop(self):
        r = build.registration('3manual_57_67/cut_C4.wav')
        self.assertEqual((r['division'], r['kind']), ('re', 'recorded-combination'))
        self.assertEqual(build.registration('filtro1.aif')['division'], 'unknown')
        self.assertTrue(build.original_take('x/proyecto06/take.aif'))
        self.assertFalse(build.original_take('x/cut_C4.wav'))

    def test_relative_urls_encode_sharps_and_avoid_extension_collisions(self):
        profile = {'quality': 5}
        self.assertTrue(build.output_url('folder/cut_A#2.wav', 'a' * 64, profile).endswith('/cut_A%232.wav.ogg'))
        self.assertNotEqual(build.output_url('x/a.wav', 'a' * 64, profile), build.output_url('x/a.aif', 'a' * 64, profile))
        self.assertNotEqual(build.output_url('x/a.wav', 'a' * 64, profile), build.output_url('x/a.wav', 'b' * 64, profile))
        self.assertNotEqual(build.output_url('x/a.wav', 'a' * 64, profile), build.output_url('x/a.wav', 'a' * 64, {'quality': 4}))

    def test_header_inventory_and_atomic_failure_leave_previous_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); (root / 'Icon_').write_bytes(b''); (root / 'take').write_bytes(b'FORM\x00\x00\x00\x00AIFF'); (root / '.ignored').write_text('private')
            self.assertEqual([e['headerType'] for e in build.inventory(root)], ['non-audio', 'aiff'])
            target = root / 'manifest.json'; build.atomic_json(target, {'old': True})
            with patch.object(build.os, 'replace', side_effect=OSError('disk failure')):
                with self.assertRaises(OSError): build.atomic_json(target, {'new': True})
            self.assertEqual(json.loads(target.read_text()), {'old': True})
            self.assertFalse(list(root.glob('.manifest.json*.tmp')))

    def test_canonical_hash_is_key_order_independent_and_excludes_itself(self):
        self.assertEqual(build.canonical_hash({'b': 'Récit', 'a': 1}), build.canonical_hash({'contentHash': 'ignored', 'a': 1, 'b': 'Récit'}))
        self.assertNotEqual(build.canonical_hash({'a': 1}), build.canonical_hash({'a': 2}))

    @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'requires local media validation tools')
    def test_actual_vorbis_encoding_is_stereo_resumable_and_preserves_source(self):
        try: build.encoder_versions()
        except OSError: self.skipTest('libvorbis/libsndfile unavailable')
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); source = root / 'source'; output = root / 'output'; source.mkdir()
            path = source / 'cut_C4.wav'
            with wave.open(str(path), 'wb') as f:
                f.setparams((2, 3, 44100, 0, 'NONE', 'not compressed')); f.writeframes(b'\0' * (4410 * 2 * 3))
            before = build.digest(path); entry = {'sourcePath': path.name}
            one = build.encode_one(source, output, entry)
            self.assertEqual(one['codec'], 'vorbis'); self.assertEqual(one['channels'], 2); self.assertEqual(one['sampleRate'], 44100)
            self.assertEqual(one['rootMidi'], 60); self.assertEqual(build.digest(path), before)
            with patch.object(build, 'encode_vorbis', side_effect=AssertionError('must reuse validated encoding')):
                self.assertEqual(build.encode_one(source, output, entry), one)
            # An altered encoded file cannot satisfy a receipt and must be rebuilt.
            encoded = output / unquote(one['url']); encoded.write_bytes(b'corrupt')
            repaired = build.encode_one(source, output, entry)
            self.assertEqual(repaired['codec'], 'vorbis'); self.assertNotEqual((output / unquote(repaired['url'])).read_bytes(), b'corrupt')
            mono = source / 'mono_C4.wav'
            with wave.open(str(mono), 'wb') as f:
                f.setparams((1, 2, 44100, 0, 'NONE', 'not compressed')); f.writeframes(b'\0' * 882)
            with self.assertRaisesRegex(ValueError, 'non-stereo'):
                build.encode_one(source, output, {'sourcePath': mono.name})
            self.assertFalse((output / 'audio' / 'mono_C4.wav.ogg').exists())

    @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'requires local media validation tools')
    def test_failed_later_rebuild_cannot_invalidate_published_assets(self):
        try: build.encoder_versions()
        except OSError: self.skipTest('libvorbis/libsndfile unavailable')
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); source = root / 'source'; output = root / 'output'; source.mkdir()
            def write(name, value):
                with wave.open(str(source / name), 'wb') as f:
                    f.setparams((2, 2, 44100, 0, 'NONE', 'not compressed')); f.writeframes(bytes([value, 0]) * 8820)
            names = ['cut_C4.wav', 'cut_D4.wav']
            for name in names: write(name, 0)
            previous = [build.encode_one(source, output, {'sourcePath': n}) for n in names]
            build.atomic_json(output / 'manifest.json', {'samples': previous})
            published = (output / 'manifest.json').read_bytes()
            for name in names: write(name, 1)
            replacement = build.encode_one(source, output, {'sourcePath': names[0]})
            self.assertNotEqual(replacement['url'], previous[0]['url'])
            with patch.object(build, 'encode_vorbis', side_effect=RuntimeError('later encoder failure')):
                with self.assertRaises(RuntimeError): build.encode_one(source, output, {'sourcePath': names[1]})
            self.assertEqual((output / 'manifest.json').read_bytes(), published)
            for sample in previous:
                self.assertEqual(build.digest(output / unquote(sample['url'])), sample['hash'])
            # Missing cache receipts must not overwrite any valid published object.
            for receipt in (output / '.receipts').glob('*.json'): receipt.unlink()
            build.encode_one(source, output, {'sourcePath': names[0]})
            for sample in previous + [replacement]:
                self.assertEqual(build.digest(output / unquote(sample['url'])), sample['hash'])

if __name__ == '__main__': unittest.main()
