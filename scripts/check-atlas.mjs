import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parseJsonImport,ensureImportEntry} from '../src/import-utils.js';
const path='./esempi-importazione/BTO-Lore-Fiamme-Quirk-Controcorpi-Atlante.json';
const data=fs.readFileSync(path,'utf8');
const entries=parseJsonImport(data,path,'root').map(ensureImportEntry);
const ids=new Set(entries.map(e=>e.id));
assert.equal(ids.size,entries.length,'ID duplicati');
assert.equal(entries.length,73,'Voci mancanti');
assert.equal(entries.filter(e=>e.parentId==='fiamme-categorie').length,11,'Fiamme mancanti');
assert.equal(entries.filter(e=>e.parentId==='controcorpi-categorie').length,7,'Categorie Controcorpi mancanti');
assert.equal(entries.filter(e=>e.parentId==='quirk-tipologie').length,4,'Tipi Quirk mancanti');
for(const e of entries){
 assert.ok(['root','alchimia'].includes(e.parentId)||ids.has(e.parentId),e.id+' senza parent');
 const html=e.blocks.map(b=>b.html||'').join('\n');
 for(const ref of html.matchAll(/href="\#\/pagina\/([^\"]+)"/g))assert.ok(ids.has(ref[1]),`Link rotto ${e.id} => ${ref[1]}`);
}
const world=JSON.parse(fs.readFileSync('./src/data/atlas-world.json','utf8'));
assert.ok(world.countries.length>=250,'Elenco paesi incompleto');
const polygonCount=world.countries.filter(c=>c.path).length;
assert.ok(polygonCount>=170,'Geometrie mondiali incomplete');
assert.equal(new Set(world.countries.map(c=>c.id)).size,world.countries.length,'Paesi duplicati');
assert.ok(fs.readFileSync('./src/AtlasGeografico.jsx','utf8').includes('setPointerCapture'),'Interazione di trascinamento assente');
assert.ok(fs.readFileSync('./src/main.jsx','utf8').includes('path="/atlante"'),'Route Atlante mancante');
console.log(`OK — ${entries.length} voci lore, 11 Fiamme, 4 Quirk, 7 Controcorpi; ${world.countries.length} Paesi/territori, ${polygonCount} con contorno.`);
