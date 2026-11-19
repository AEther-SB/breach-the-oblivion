// Regression test: the graph sidebar must remain renderable when a node is hovered.
// This evaluates the actual state derivation used by RelationMap, including its
// ordering of declarations, without requiring a browser or JSX transpiler.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {connectionDegrees} from '../src/graph-metrics.js';
import {relationsFor} from '../src/relations.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'src/RelationMap.jsx'), 'utf8');
const begin = source.indexOf('  const degrees=useMemo(()=>connectionDegrees(graph,relationsOnly)');
const end = source.indexOf('  return <div className="graph-page', begin);
assert.ok(begin >= 0 && end > begin, 'State derivation for the graph panel must be present');
const declarations = source.slice(begin, end);
// Only declarations/expressions belong here: a compile failure in this test
// means the sidebar logic has been changed and needs to be reviewed.
const derive = new Function('graph', 'selected', 'hovered', 'relationsOnly', 'query', 'useMemo', 'connectionDegrees', 'relationsFor', 'relatedNodes', 'norm', `${declarations}\nreturn {focused, related, degrees, found};`);
const graph = {
  nodes: [
    {id:'a', title:'Alchimia'},
    {id:'b', title:'Quirk'},
    {id:'c', title:'Fiamme'},
    {id:'d', title:'Storia'},
  ],
  edges: [
    {source:'a',target:'b',type:'category'},
    {source:'a',target:'c',type:'reference'},
    {source:'a',target:'d',type:'reference'},
    {source:'b',target:'c',type:'reference'},
  ],
};
function relatedNodes(graph, id) {
  return graph.edges.filter(e => e.source === id || e.target === id).map(e => {
    const otherId = e.source === id ? e.target : e.source;
    return {...graph.nodes.find(n => n.id === otherId), relation: e.type};
  });
}
const norm = value => String(value || '').toLocaleLowerCase('it');
for (const {selected, hovered, relationsOnly, query} of [
  {selected:null, hovered:null, relationsOnly:false, query:''},
  {selected:null, hovered:'a', relationsOnly:false, query:''},
  {selected:null, hovered:'a', relationsOnly:true, query:''},
  {selected:'b', hovered:'a', relationsOnly:false, query:'q'},
]) {
  const result = derive(graph, selected, hovered, relationsOnly, query, fn => fn(), connectionDegrees, relationsFor, relatedNodes, norm);
  assert.equal(result.focused?.id ?? null, selected || hovered);
  assert.equal(result.degrees.get('a'), relationsOnly ? 2 : 3);
  assert.ok(result.found.every(n => norm(n.title).includes(norm(query))));
  if (selected || hovered) assert.ok(result.related.length > 0);
}
console.log('OK: sidebar grafo, hover, selezione, filtro riferimenti e ricerca');
