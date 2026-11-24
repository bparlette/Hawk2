import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
const [IN, OUT] = process.argv.slice(2); const io = new NodeIO().registerExtensions(ALL_EXTENSIONS); const doc = await io.read(IN);
for (const n of doc.getRoot().listNodes()) { if (n.getMesh()) n.setMesh(null); if (n.getSkin()) n.setSkin(null); }
await doc.transform(prune({ keepLeaves: true }));
for (const a of doc.getRoot().listAnimations()) console.log(a.getName(), a.listChannels().length);
await io.write(OUT, doc);
