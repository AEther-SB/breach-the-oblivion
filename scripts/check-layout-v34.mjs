import fs from 'node:fs';
import assert from 'node:assert/strict';
const app=fs.readFileSync('src/main.jsx','utf8');
const page=fs.readFileSync('src/layout-v34.css','utf8');
const history=fs.readFileSync('src/StoriaTimeline.jsx','utf8');
const historyCss=fs.readFileSync('src/storia-timeline.css','utf8');
assert.ok(!app.includes('Esplora l’ambientazione'));
assert.ok(app.includes('home-grid-centre-last'));
assert.ok(app.includes('function LoreEditorialSidebar(')&&app.includes('<LoreTOC entry={entry}/>'));
assert.ok(app.includes('function LoreRelatedRail(')&&app.includes('SOTTOSEZIONI · CATEGORIE'));
assert.ok(app.includes('entry.layout===\'counterbodies\''),'Le categorie dei Controcorpi diventano sottosezioni cliccabili.');
assert.ok(app.includes('function loreChapters('),'Capitoli per voci importate in singolo HTML.');
assert.ok(app.includes('function LoreChapter('));
assert.ok(app.includes('className="lore-editorial-scroll" tabIndex={0}'));
assert.ok(page.includes('text-align:justify')&&page.includes('max-width:none'));
assert.ok(page.includes('lore-chapter-header')&&page.includes('lore-chapter-body'));
assert.ok(page.includes('.lore-editorial-sidebar h1.lore-long-title'));
assert.ok(page.includes('grid-auto-rows:minmax(116px,1fr)'));
assert.ok(history.includes('p.timeline?.show===true'), 'Solo gli eventi esplicitamente creati dal GM entrano nella cronologia.');
assert.ok(!history.includes('Boolean(BASE[p.id])'), 'Le cinque voci enciclopediche non devono apparire come eventi.');
assert.ok(history.includes('p.timeline?.type===\'period\''),'Gestione di periodi espliciti.');
assert.ok(history.includes('parseYear(')&&history.includes('byYearAndOrder'),'Ordinamento per anno e ordine interno.');
assert.ok(history.includes('groupEvents(')&&history.includes('storia-year-group'));
assert.ok(history.includes('Nuovo periodo')&&history.includes('Nuovo evento'));
assert.ok(history.includes('Storia e Passato')&&history.includes('Lore e Ambientazione'));
assert.ok(history.includes('openEvent({timeline:{year:group.year,periodId'));
assert.ok(history.includes('await saveDraft(record)')&&history.includes('await publish(record)'));
assert.ok(historyCss.includes('storia-period-heading')&&historyCss.includes('storia-year-axis'));
assert.ok(app.includes("entry.id==='storia-passato')return <StoriaTimeline"));
assert.ok(!app.includes('<footer className="site-footer"'));
console.log('OK — v3.4: cronologia GM per periodi, anni e ordine; lore separata; capitoli incorniciati, Controcorpi, titoli e Home.');
// Esercita il parser dei capitoli sui contenuti REALI del pacchetto d'importazione.
// Il vecchio Markdown ## diventa h3, mentre il WYSIWYG produce h2.
const {markdownToHtml}=await import('../src/import-utils.js');
const lore=JSON.parse(fs.readFileSync('esempi-importazione/BTO-Lore-v3.1-Riorganizzato.json','utf8')).entries;
const source=app.slice(app.indexOf('function loreChapters('),app.indexOf('function LoreChapter('));
const slug=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const parseChapters=Function('slug',`${source}; return loreChapters;`)(slug);
const controcorpi=lore.find(p=>p.id==='controcorpi');
const quirk=lore.find(p=>p.id==='quirk');
for(const original of [controcorpi,quirk]){
 const sections=parseChapters({blocks:[{id:'rich',type:'rich',html:markdownToHtml(original.markdown)}]});
 assert.ok(sections.length>=6,`${original.title}: il convertitore Markdown deve generare più capitoli visivi.`);
 for(const topic of original.topics||[]){assert.ok(sections.some(s=>s.id===topic.anchor),`${original.title}: manca il capitolo ${topic.name}.`);}
}
console.log('OK — Controcorpi e Quirk: capitoli reali e ancore del JSON v3.1 riconosciuti.');
