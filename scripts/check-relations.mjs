import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {buildRelations,relationsFor} from '../src/relations.js';
const readJSON=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf-8'));
const source=readJSON('../src/data/compendium.json');
const materials=source.materials.map(m=>({...m,id:`material-${m.id}`,materialId:m.id,title:m.name}));
const processes=source.genesisProcesses.map((p,i)=>({...p,id:`process-${i}`,title:p.name}));
const graph=buildRelations(materials,processes,[{id:'alchimia',kind:'chapter',title:'Alchimia'}]);
assert.equal(materials.length,32);
assert.equal(processes.length,12);
assert.equal(graph.nodes.filter(n=>n.type==='material').length,32);
assert.equal(graph.nodes.filter(n=>n.type==='process').length,12);
assert.equal(graph.edges.filter(e=>e.type==='category').length,50);
assert(!graph.nodes.some(n=>n.id==='hub:site' || n.title==='Breach the Oblivion'),'Il nome del sito non deve essere un nodo');
assert.equal(graph.nodes.find(n=>n.id==='page:alchimia')?.url,'/alchimia');
assert(!graph.edges.some(e=>e.source==='hub:site'),'Il grafo non deve contenere la radice artificiale del sito');
assert(graph.edges.some(e=>e.source==='page:alchimia' && e.target==='hub:processes' && e.type==='category'),'I processi appartengono ad Alchimia');
const ids=new Set(graph.nodes.map(n=>n.id));
for(const edge of graph.edges){assert(ids.has(edge.source),`Origine mancante: ${edge.source}`);assert(ids.has(edge.target),`Destinazione mancante: ${edge.target}`);}
assert(graph.referenceCount>12,`Riferimenti rilevati: ${graph.referenceCount}`);
const fortis=relationsFor(graph,'material:aqua-fortis');
assert(fortis.outgoing.some(n=>n.title==='Acqua'),'Aqua fortis deve avere un riferimento ad Acqua');
assert(fortis.outgoing.some(n=>n.title==='Alkahest'),'Aqua fortis deve avere un riferimento ad Alkahest');
const customGraph=buildRelations(materials,processes,[{id:'alchimia',kind:'chapter',title:'Alchimia'},{id:'test-a',kind:'page',title:'Nuova pagina A',parentId:'alchimia',blocks:[{html:'<p><a href="#/pagina/test-b">Vai a B</a></p>'}]},{id:'test-b',kind:'page',title:'Nuova pagina B',parentId:'alchimia',blocks:[]}]);
assert(customGraph.edges.some(e=>e.source==='page:test-a' && e.target==='page:test-b' && e.type==='reference'),'La mappa deve seguire i link GM tra pagine');
const wholeSite=buildRelations(materials,processes,[
  {id:'alchimia',kind:'chapter',title:'Alchimia',parentId:'root'},
  {id:'ambientazione',kind:'chapter',title:'Ambientazione',parentId:'root'},
  {id:'luoghi',kind:'page',title:'Luoghi',parentId:'ambientazione',blocks:[{html:'<p>La città del Patto Rosso è citata anche in Alchimia.</p>'}]},
  {id:'patto',kind:'page',title:'Patto Rosso',parentId:'ambientazione',blocks:[{html:'<p><a href="#/alchimia/materiali/aqua-fortis">Aqua fortis</a> e <a href="#/pagina/luoghi">Luoghi</a></p>'}]},
  {id:'radice',kind:'page',title:'Cronologia',parentId:'root',blocks:[{html:'<p>Patto Rosso e <a href="#/pagina/luoghi">Luoghi</a></p>'}]}
]);
assert(wholeSite.nodes.some(n=>n.id==='page:ambientazione'),'I nuovi capitoli devono comparire come nodi indipendenti');
assert(!wholeSite.edges.some(e=>e.source==='page:alchimia' && e.target==='page:ambientazione' && e.type==='category'),'Un capitolo autonomo non deve diventare una sottosezione di Alchimia');
assert(wholeSite.edges.some(e=>e.source==='page:ambientazione' && e.target==='page:luoghi' && e.type==='category'),'Le pagine GM devono seguire il capitolo di appartenenza');
assert(wholeSite.nodes.some(n=>n.id==='page:radice'),'Le pagine alla radice rimangono nodi autonomi, senza nodo del titolo');
assert(!wholeSite.edges.some(e=>e.source==='hub:processes' && e.target==='page:luoghi' && e.type==='category'),'Nessun capitolo esterno va collegato ai Processi');
assert(wholeSite.edges.some(e=>e.source==='page:patto' && e.target==='material:aqua-fortis' && e.type==='reference'),'I link tra capitoli e materiali devono funzionare');
assert(wholeSite.edges.some(e=>e.source==='page:radice' && e.target==='page:patto' && e.type==='reference'),'I riferimenti testuali tra pagine GM devono funzionare');
assert(wholeSite.edges.some(e=>e.source==='page:patto' && e.target==='page:luoghi' && e.type==='reference'),'I collegamenti espliciti tra pagine GM devono funzionare');
assert(wholeSite.nodes.length===graph.nodes.length+4,'Il grafo globale deve includere tutti i nuovi contenuti');
assert(!wholeSite.nodes.some(n=>n.id==='hub:site'),'Nessun nodo artificiale del sito anche dopo aggiunte GM');
console.log(`OK — grafo globale: ${graph.nodes.length} nodi iniziali, ${graph.edges.length} archi, ${graph.referenceCount} riferimenti; capitoli e link GM verificati.`);
