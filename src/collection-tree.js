// Struttura delle pagine del Compendio (non delle note o degli appunti).
export const STRUCTURAL_KINDS = new Set(['chapter', 'collection', 'page']);
export const isContainer = entry => entry?.kind === 'chapter' || entry?.kind === 'collection';
export const LOCKED_TREE_IDS = new Set([
  'alchimia', 'alchimia-fondamenti', 'alchimia-materiali', 'alchimia-genesi',
  'fiamme-essenza', 'quirk', 'controcorpi', 'storia-passato',
  'organizzazioni', 'atlas-geografico',
]);
export const orderEntries = items => [...items].sort((a,b) => Number(a.order||0)-Number(b.order||0) || String(a.title||'').localeCompare(String(b.title||''),'it'));
export const editableTreeEntries = entries => entries.filter(entry=>STRUCTURAL_KINDS.has(entry.kind) && !entry.virtualSubsection);

export function getEntryPath(entries, id) {
  const byId=new Map(entries.map(e=>[e.id,e]));
  const path=[], visited=new Set();
  let current=byId.get(id);
  while(current && !visited.has(current.id)){
    visited.add(current.id);path.unshift(current);
    current=byId.get(current.parentId);
  }
  return path;
}
export function descendantsOf(entries, id) {
  const children=new Map();
  for(const entry of entries){if(!children.has(entry.parentId))children.set(entry.parentId,[]);children.get(entry.parentId).push(entry.id);}
  const result=new Set(), pending=[id];
  while(pending.length){const node=pending.pop();for(const child of children.get(node)||[]){if(!result.has(child)&&child!==id){result.add(child);pending.push(child);}}}
  return result;
}
export function assertTreeMove(entries, id, parentId) {
  const byId=new Map(entries.map(e=>[e.id,e]));
  const item=byId.get(id), parent=parentId==='root'?null:byId.get(parentId);
  if(!item || !STRUCTURAL_KINDS.has(item.kind) || item.virtualSubsection)throw Error('Questa voce non può essere spostata con il gestore delle raccolte.');
  if(LOCKED_TREE_IDS.has(id))throw Error('Questa sezione strutturale del Compendio non può essere spostata.');
  if(item.kind==='page' && parentId==='root')throw Error('Le pagine devono appartenere a una raccolta: scegli una sezione o una sottoraccolta.');
  if(parentId!=='root' && (!parent || !isContainer(parent) || parent.virtualSubsection))throw Error('La destinazione deve essere una raccolta o una sezione esistente.');
  if(id===parentId || descendantsOf(entries,id).has(parentId))throw Error('Una raccolta non può essere inserita al proprio interno o in una sua sottoraccolta.');
  return item;
}
export function treeGroups(entries) {
  const items=editableTreeEntries(entries), byId=new Map(items.map(e=>[e.id,e]));
  const children=new Map();
  for(const item of items){const parent=byId.has(item.parentId)||item.parentId==='root'?item.parentId:'__orphans__';if(!children.has(parent))children.set(parent,[]);children.get(parent).push(item);}
  for(const [id,group] of children)children.set(id,orderEntries(group));
  return children;
}
