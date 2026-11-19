// Costruzione e validazione di una gerarchia di periodi, indipendente dalle date.
export function createsPeriodCycle(id,parentId,periods){
 if(!parentId)return false;
 const parents=new Map(periods.map(p=>[p.id,p.parentPeriodId||'']));
 const seen=new Set();
 let cursor=parentId;
 while(cursor){
  if(cursor===id||seen.has(cursor))return true;
  seen.add(cursor);cursor=parents.get(cursor)||'';
 }
 return false;
}
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const sortPeriods=(a,b)=>(a.startYear==null?1:0)-(b.startYear==null?1:0)||(a.startYear??0)-(b.startYear??0)||n(a.rank)-n(b.rank)||a.title.localeCompare(b.title,'it');
export function buildPeriodForest(periods,events,yearMarkers){
 const nodes=new Map(periods.map(p=>[p.id,{...p,events:[],yearMarkers:[],children:[]}]));
 const unassigned=[],unassignedYears=[];
 for(const event of events){const pid=event.timeline?.periodId;if(pid&&nodes.has(pid))nodes.get(pid).events.push(event);else unassigned.push(event);}
 for(const marker of yearMarkers){const pid=marker.timeline?.periodId;if(pid&&nodes.has(pid))nodes.get(pid).yearMarkers.push(marker);else unassignedYears.push(marker);}
 const roots=[];
 for(const node of nodes.values()){
  if(node.parentPeriodId&&nodes.has(node.parentPeriodId)&&!createsPeriodCycle(node.id,node.parentPeriodId,periods))nodes.get(node.parentPeriodId).children.push(node);
  else roots.push(node);
 }
 const pruneAndSort=items=>items.sort(sortPeriods).filter(node=>{
  node.children=pruneAndSort(node.children);
  return node.events.length||node.yearMarkers.length||node.children.length||!node.builtin;
 });
 return {periods:pruneAndSort(roots),unassigned,unassignedYears};
}
