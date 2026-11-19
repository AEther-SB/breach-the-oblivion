import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parseJsonImport,ensureImportEntry} from '../src/import-utils.js';
const path='./esempi-importazione/BTO-Lore-v3.1-Riorganizzato.json';
const data=fs.readFileSync(path,'utf8');
const entries=parseJsonImport(data,path,'root').map(ensureImportEntry);
const ids=new Set(entries.map(e=>e.id));
assert.equal(ids.size,entries.length,'ID duplicati');
assert.equal(entries.length,30,'Voci mancanti');
assert.equal(entries.find(e=>e.id==='fiamme-categorie')?.flames?.length,11,'Fiamme mancanti');
assert.equal(entries.find(e=>e.id==='controcorpi')?.blocks?.[0]?.html?.match(/<h3 id="(?:vessel|sentinel|tether|warrior|container|special|hybrid)">/g)?.length,7,'Categorie Controcorpi mancanti');
assert.equal(entries.find(e=>e.id==='quirk')?.blocks?.[0]?.html?.match(/<h3 id="(?:mutant|transformation|emitter|hybrid)">/g)?.length,4,'Tipi Quirk mancanti');
for(const e of entries){
 assert.ok(['root','alchimia'].includes(e.parentId)||ids.has(e.parentId),e.id+' senza parent');
 const html=e.blocks.map(b=>b.html||'').join('\n');
 for(const ref of html.matchAll(/href="\#\/pagina\/([a-z0-9-]+)(?:\?sezione=[a-z0-9-]+)?"/gi))assert.ok(ids.has(ref[1]),`Link rotto ${e.id} => ${ref[1]}`);
}
const world=JSON.parse(fs.readFileSync('./src/data/atlas-world.json','utf8'));
assert.ok(world.countries.length>=250,'Elenco paesi incompleto');
const polygonCount=world.countries.filter(c=>c.path).length;
assert.ok(polygonCount>=170,'Geometrie mondiali incomplete');
assert.equal(new Set(world.countries.map(c=>c.id)).size,world.countries.length,'Paesi duplicati');
assert.ok(fs.readFileSync('./src/AtlasGeografico.jsx','utf8').includes('setPointerCapture'),'Interazione di trascinamento assente');
assert.ok(fs.readFileSync('./src/main.jsx','utf8').includes('path="/atlante"'),'Route Atlante mancante');
console.log(`OK — ${entries.length} voci lore, 11 Fiamme, 4 Quirk, 7 Controcorpi; ${world.countries.length} Paesi/territori, ${polygonCount} con contorno.`);
