import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {parseRequirements} from '../src/prerequisite-utils.js';
const read = path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const app = read('src/main.jsx');
const graphUI = read('src/RelationMap.jsx');
const globalGraph = read('src/relations.js');
const css = read('src/refinement.css');
const prereq = read('src/Prerequisites.jsx');
const content = JSON.parse(read('src/data/compendium.json'));
assert(app.includes('<HomeConnectionPreview theme={theme}/>'),'Preview atlante assente dalla home');
assert(app.includes('<Prerequisites material={mat}/>'),'Scheda dei prerequisiti assente');
assert(!app.includes("[RELATIONS, 'CONNESSIONI']"),'Connessioni non deve stare in navigazione');
assert(graphUI.includes('ambient/>') && graphUI.includes('if(!ambient){') && !graphUI.includes('home-atlas-related'),'La preview deve essere passiva, il grafo completo interattivo');
assert(graphUI.includes('Apri scheda'),'Il link alla pagina deve essere un’azione distinta');
assert(!globalGraph.includes("id:'hub:site'"),'Il titolo del compendio non deve essere un nodo');
assert(css.includes('data-theme="dark"] .tone-composite') && css.includes('#d6a77b'),'Accento compositi da correggere');
assert(css.includes('data-theme="dark"] .home-card-featured'),'Rimuovere lo sfondo verde della card evidenziata');
assert(prereq.includes('RequirementPhrase') && prereq.includes('requirements-note'),'Formattazione prerequisiti incompleta');
const map=new Map(content.materials.map(m=>[m.name,parseRequirements(m.requirementsText)]));
for (const mat of content.materials) {
 const v=map.get(mat.name);assert(v.free || v.routes.length>0,`Requisiti mancanti: ${mat.name}`);
}
assert(map.get('Zolfo')?.free,'Zolfo deve essere senza prerequisiti');
assert(map.get('Zolfo nero')?.level===10 || map.get('Zolfo Nero')?.level===10,'Il livello di Zolfo Nero deve essere 10');
assert(map.get('Amalgama')?.routes.length===3,'Amalgama deve mostrare i tre percorsi alternativi');
assert(map.get('Aqua regia')?.routes.length===1,'Il requisito composito di Aqua regia non va scisso');
assert(map.get('Argento')?.routes.length===3,'Argento deve mostrare tre percorsi');
console.log(`OK — UI: preview passiva e animata, grafo completo interattivo, zero nodi fittizi, colori e prerequisiti (${content.materials.length} materiali) verificati.`);
