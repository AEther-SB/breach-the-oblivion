import fs from 'node:fs';
import assert from 'node:assert/strict';
const d = JSON.parse(fs.readFileSync(new URL('../src/data/compendium.json',import.meta.url),'utf8'));
const source = JSON.parse(fs.readFileSync(new URL('../contenuti/materials_v0736.json',import.meta.url),'utf8'));
const ids = new Set(d.materials.map(m=>m.id));
const abilities=d.materials.reduce((n,m)=>n+m.abilities.length,0);
for(const r of ['amalgama','zolfo','zolfo-nero','piombo','oro','aqua-fortis','aqua-regia','aqua-vitae']) {
  assert(ids.has(r),`Materiale mancante: ${r}`);
}
assert.equal(d.materials.length,32);
assert.equal(abilities,120);
assert.equal(d.genesisProcesses.length,12);
assert(!('classFeatures' in d) && !('subclasses' in d),'Il sito non deve includere classi o archetipi');
for(const mat of d.materials){
  assert(mat.name && mat.group && mat.profile?.theme?.length>90 && mat.profile?.history?.length>70 && mat.profile?.historicalUrl,'Profilo incompleto: '+mat.id);
  const orig=source.materials.find(m=>m.id===mat.id);
  assert(orig && orig.abilities.length===mat.abilities.length,'Materiale incoerente: '+mat.id);
  mat.abilities.forEach((a,i)=>assert.deepEqual(a,orig.abilities[i],'Descrizione regole alterata: '+mat.id));
}
d.genesisProcesses.forEach((a,i)=>assert.deepEqual(a,source.processes[i],'Processo alterato: '+i));
console.log(`OK — ${d.materials.length} materiali, ${abilities} capacità, ${d.genesisProcesses.length} Processi di Genesi; profili presenti e regole identiche alla fonte.`);
