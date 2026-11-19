import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parseJsonImport,ensureImportEntry} from '../src/import-utils.js';
const file='./esempi-importazione/BTO-Lore-v3.1-Riorganizzato.json';
const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
const entries=parseJsonImport(JSON.stringify(manifest),file,'root').map(ensureImportEntry);
const ids=new Set(entries.map(e=>e.id));
assert.equal(ids.size,entries.length,'ID duplicati');
assert.ok(entries.length<40,'Consolidamento delle voci non completato');
for(const required of ['fiamme-essenza','fiamme-categorie','quirk','controcorpi','storia-passato','organizzazioni','organizzazione-catalyst','personaggio-ivory-covenant','atlas-geografico','alchimia-flussi'])assert.ok(ids.has(required),required);
const flames=entries.find(e=>e.id==='fiamme-categorie');assert.equal(flames.flames.length,11);
const names=new Set(flames.flames.map(f=>f.name));for(const name of ['Guerriero','Antico','Eremita','Guaritore','Martire','Sentinella','Cacciatore','Saggio','La Tomba','La Moglie','La Libertà'])assert.ok(names.has(name));
for(const entry of entries){
 assert.ok(['root','alchimia'].includes(entry.parentId)||ids.has(entry.parentId),entry.id+' senza raccolta');
 const html=(entry.blocks||[]).map(b=>b.html||'').join('\n');
 for(const m of html.matchAll(/href="#\/pagina\/([a-z0-9-]+)(?:\?sezione=([a-z0-9-]+))?"/gi)){
  const other=entries.find(e=>e.id===m[1]);assert.ok(other,`${entry.id} collegamento interrotto ${m[1]}`);
  if(m[2]) assert.ok(other.blocks?.some(b=>String(b.html||'').includes(`id="${m[2]}"`)),`${entry.id} ancora ${m[2]} non presente in ${m[1]}`);
 }
}
assert.equal(entries.filter(e=>e.parentId==='root').length,6,'Radici non conformi');
const old=JSON.parse(fs.readFileSync('./src/data/legacy-lore-v30.json','utf8'));assert.equal(old.length,73);
const world=JSON.parse(fs.readFileSync('./src/data/atlas-world.json','utf8'));
assert.ok(world.countries.length>=250);
for(const f of ['app-overhaul.css','LegacyImportReset.jsx','StoriaTimeline.jsx'])assert.ok(fs.existsSync('./src/'+f));
console.log(`OK — v3.1: ${entries.length} voci consolidate, ${flames.flames.length} colori, collegamenti alle sezioni, manifesto reset di ${old.length} ID; ${world.countries.length} Paesi.`);
