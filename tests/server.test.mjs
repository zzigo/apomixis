import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHylonServer } from '../tools/serve.mjs';

test('offline server mounts only instrument files; handles escaped notes, ranges and boundary escapes', async () => {
  const dir = await mkdtemp(join(tmpdir(),'hylon-http-'));
  const root=join(dir,'dist'), instrumentRoot=join(dir,'bank');
  await mkdir(root);await mkdir(join(instrumentRoot,'audio'),{recursive:true});
  await writeFile(join(root,'index.html'),'<title>HYLON</title>');
  await writeFile(join(instrumentRoot,'manifest.json'),'{}');
  await writeFile(join(instrumentRoot,'audio','C#4.ogg'),Buffer.from([10,20,30,40]));
  await writeFile(join(dir,'private.txt'),'private');
  await symlink(join(dir,'private.txt'),join(instrumentRoot,'leak'));
  const server=createHylonServer({root,instrumentRoot});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(url)).status,200);
    const file=await fetch(`${url}/instruments/klais/audio/C%234.ogg`);
    assert.equal(file.headers.get('content-type'),'audio/ogg');
    assert.deepEqual([...new Uint8Array(await file.arrayBuffer())],[10,20,30,40]);
    const part=await fetch(`${url}/instruments/klais/audio/C%234.ogg`,{headers:{Range:'bytes=1-2'}});
    assert.equal(part.status,206);assert.deepEqual([...new Uint8Array(await part.arrayBuffer())],[20,30]);
    assert.equal((await fetch(`${url}/instruments/klais/audio/C%234.ogg`,{headers:{Range:'bytes=10-20'}})).status,416);
    assert.equal((await fetch(`${url}/instruments/klais/leak`)).status,403);
    assert.equal((await fetch(`${url}/instruments/klais/%2e%2e%2fprivate.txt`)).status,403);
    assert.equal((await fetch(`${url}/instruments/klais/manifest.json`,{method:'PUT'})).status,405);
    assert.equal((await fetch(`${url}/instruments/klais/manifest.json`,{method:'HEAD'})).headers.get('content-length'),'2');
  } finally { await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true}); }
});
