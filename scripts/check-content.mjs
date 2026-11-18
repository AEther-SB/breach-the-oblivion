import fs from 'node:fs';
import assert from 'node:assert/strict';
const d = JSON.parse(fs.readFileSync(new URL('../src/data/compendium.json',import.meta.url),'utf8'));
const source = JSON.parse(fs.readFileSync(new URL('../contenuti/materials_v0736.json',import.meta.url),'utf8'));
const editorial = JSON.parse(fs.readFileSync(new URL('../contenuti/ability-editorial-overrides.json',import.meta.url),'utf8'));
const baseline271 = JSON.parse(fs.readFileSync(new URL('../src/data/editorial-baseline-v271-abilities.json',import.meta.url),'utf8'));
const baseline280 = JSON.parse(fs.readFileSync(new URL('../src/data/editorial-baseline-v280-abilities.json',import.meta.url),'utf8'));
const userAuthored = new Set(['acqua','alkahest','aria','fuoco','terra','zero','argento','argentovivo','ferro','rame','oro','stagno','arsenico','platino','zinco','ossigeno','flogisto','cinabro','vitriolum']);
const plainTextAbility = value => String(value).replace(/<\/(?:p|li|h4)>/g,' ').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
const numericValues = value => (String(value).match(/(?<!\w)(?:\d+d\d+|[+−-]?\d+(?:[.,]\d+)?)(?!\w)/g) || []).map(x=>x.replace(/^\+/,''));
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
  assert(mat.name && mat.group && mat.profile?.theme?.length>90 && mat.profile?.history?.length>60 && !mat.profile?.historicalUrl,'Profilo incompleto: '+mat.id);
  const orig=source.materials.find(m=>m.id===mat.id);
  assert(orig && orig.abilities.length===mat.abilities.length,'Materiale incoerente: '+mat.id);
  mat.abilities.forEach((a,i)=>{
    const original=orig.abilities[i];
    const expected=editorial[mat.id]?.[String(a.level)];
    assert.equal(a.name, original.name, 'Nome della capacità alterato: '+mat.id);
    assert.equal(a.html, expected, 'Descrizione non sincronizzata con Foundry: '+mat.id+':'+a.level);
    assert(a.html.includes('<strong>'), 'Grassetti mancanti: '+mat.id+':'+a.level);
    assert(baseline280[mat.id]?.[String(a.level)], 'Base di migrazione v2.8 mancante: '+mat.id+':'+a.level);
    if (userAuthored.has(mat.id)) {
      // Testi originali: autorizzati esclusivamente cambiamenti di formattazione.
      assert.equal(plainTextAbility(a.html), plainTextAbility(baseline271[mat.id]?.[String(a.level)] ?? original.html), 'Testo originale modificato: '+mat.id+':'+a.level);
    } else {
      const before=numericValues(plainTextAbility(baseline271[mat.id]?.[String(a.level)] ?? original.html));
      const after=numericValues(plainTextAbility(a.html));
      assert.deepEqual(before.sort(),after.sort(), 'Valore numerico modificato: '+mat.id+':'+a.level);
    }
  });
}
const processErrata = JSON.parse(fs.readFileSync(new URL('../contenuti/errata-processi.json', import.meta.url), 'utf8'));
function plainText(value) {
  return String(value).replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&').replace(/[•*]/g, '').replace(/\s+/g, ' ').trim();
}
d.genesisProcesses.forEach((a,i) => {
  const original = source.processes[i];
  assert.equal(a.name, original.name, 'Nome del processo alterato: '+i);
  const errata = processErrata[a.name];
  assert(errata, 'Errata mancante per '+a.name);
  let expected = plainText(original.html);
  for (const [before, after] of errata.replacements) {
    assert(expected.includes(before), 'Refuso non trovato: '+before);
    expected=expected.replace(before,after);
  }
  assert.equal(plainText(a.html), expected, 'Testo o regole alterate: '+a.name);
  assert(a.html.includes('<strong>'), 'Titolo capacità non formattato: '+a.name);
  assert(!a.html.includes('<p>•'), 'Elenco non formattato: '+a.name);
  assert(!a.html.includes('<p>*'), 'Corsivo Markdown non convertito: '+a.name);
});
for (const mat of d.materials) {
  assert(!/\b(compendio|qui fantastica|traduzione fantastica|nel gioco|nel mondo di Breach)\b/i.test(mat.profile.history),`Riferimento storico con metatesto: ${mat.id}`);
  assert(!('historicalUrl' in mat.profile),`Fonte esterna ancora esposta: ${mat.id}`);
}
console.log(`OK — ${d.materials.length} materiali, ${abilities} capacità, ${d.genesisProcesses.length} Processi di Genesi; profili presenti e regole identiche alla fonte.`);
