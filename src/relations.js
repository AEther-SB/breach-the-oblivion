// Relazioni generate dai riferimenti effettivi nel compendio e dalla sua gerarchia.
// Nessun legame narrativo viene creato per semplice somiglianza tematica.
const GROUPS = ['Elementi', 'Metalli Planetari', 'Metalli Pesanti', 'Materia Vitale', 'Compositi'];
const strip = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi, (_s, decimal, hex, named) => {
  if (decimal) return String.fromCodePoint(Number(decimal));
  if (hex) return String.fromCodePoint(parseInt(hex,16));
  return ({nbsp:' ',amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'})[String(named).toLowerCase()] || ' ';
}).replace(/\s+/g, ' ');
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it');
const escapeRx = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const groupTones = {Elementi:'azure','Metalli Planetari':'lilac','Metalli Pesanti':'steel','Materia Vitale':'rose',Compositi:'amber'};
export const routes = {alchemy:'/alchimia',materials:'/alchimia/materiali',processes:'/alchimia/processi',graph:'/connessioni'};
export const materialPath = m => `${routes.materials}/${m.materialId || m.id}`;
export const processPath = (p, index) => `${routes.processes}?abilita=${index}`;
export function entryText(entry) {
  return strip([entry.description,entry.requirementsText, entry.bonus, entry.profile?.theme,entry.profile?.history,entry.html,...(entry.abilities || []).map(a => a.html),...(entry.blocks || []).map(b => [b.html,b.text,b.url].join(' '))].filter(Boolean).join(' '));
}
export function hasMention(text, phrase) {
  if (!phrase || phrase.length < 3) return false;
  const expression = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRx(normalize(phrase))}(?=$|[^\\p{L}\\p{N}])`, 'iu');
  return expression.test(normalize(text));
}
export function buildRelations(materials, processes, pages = []) {
  // Il grafo copre il compendio completo: capitoli GM, pagine, materiali e processi.
  const nodes = []; // Nessun nodo artificiale per il titolo del sito.
  const alchemy = pages.find(p=>p.id==='alchimia');
  nodes.push({id:'page:alchimia',title:alchemy?.title||'Alchimia',type:'chapter',tone:'amber',url:routes.alchemy,order:-1});
  GROUPS.forEach((title,i)=>nodes.push({id:`group:${title}`,title,type:'group',tone:groupTones[title],url:`${routes.materials}?categoria=${encodeURIComponent(title)}`,order:i}));
  nodes.push({id:'hub:processes',title:'Processi alchemici',type:'group',tone:'violet',url:routes.processes,order:5});
  materials.forEach(m=>nodes.push({id:`material:${m.materialId||m.id}`,title:m.title||m.name,type:'material',tone:groupTones[m.group]||'amber',symbol:m.symbol||'◇',url:materialPath(m),group:m.group}));
  processes.forEach((p,i)=>nodes.push({id:`process:${p.id}`,title:p.title||p.name,type:'process',tone:'violet',url:processPath(p,i)}));
  const extra = pages.filter(p=>p.id!=='alchimia');
  extra.forEach(p=>nodes.push({id:`page:${p.id}`,title:p.title,type:p.kind==='chapter'?'chapter':'page',tone:p.kind==='chapter'?'gold':'steel',url:`/pagina/${p.id}`}));
  const edges = [], keys = new Set();
  const ids = new Set(nodes.map(n=>n.id));
  const edge = (a,b,type) => { if(a===b || !ids.has(a) || !ids.has(b)) return; const key=`${a}|${b}|${type}`;if(keys.has(key))return;keys.add(key);edges.push({source:a,target:b,type});};
  for (const g of GROUPS) edge('page:alchimia',`group:${g}`,'category');
  edge('page:alchimia','hub:processes','category');
  for (const m of materials) edge(`group:${m.group}`, `material:${m.materialId||m.id}`, 'category');
  for (const p of processes) edge('hub:processes',`process:${p.id}`,'category');
  for (const page of extra) {
    const parent = page.parentId==='alchimia' ? 'page:alchimia' : `page:${page.parentId}`;
    if (ids.has(parent)) edge(parent,`page:${page.id}`,'category'); // Le sezioni di primo livello sono radici autonome.
  }
  const content = [
    ...materials.map(m=>({id:`material:${m.materialId||m.id}`, text:entryText(m),raw:JSON.stringify(m)})),
    ...processes.map(p=>({id:`process:${p.id}`,text:entryText(p),raw:JSON.stringify(p)})),
    ...extra.map(p=>({id:`page:${p.id}`,text:entryText(p),raw:JSON.stringify(p)})),
    ...(alchemy ? [{id:'page:alchimia',text:entryText(alchemy),raw:JSON.stringify(alchemy)}] : []),
  ];
  for (const src of content) {
    for (const target of materials) {
      const id=`material:${target.materialId||target.id}`;
      const route=materialPath(target);
      if (src.id!==id && (hasMention(src.text,target.title||target.name) || src.raw.includes(route))) edge(src.id,id,'reference');
    }
    for (const [i,target] of processes.entries()) {
      const id=`process:${target.id}`;
      if (src.id!==id && (hasMention(src.text,target.title||target.name) || src.raw.includes(processPath(target,i)))) edge(src.id,id,'reference');
    }
    for (const target of extra) {
      const id=`page:${target.id}`;
      const explicit=src.raw.includes(`#/pagina/${target.id}`) || src.raw.includes(`/pagina/${target.id}`);
      if(src.id!==id && (explicit || hasMention(src.text,target.title))) edge(src.id,id,'reference');
    }
    // Collegamenti espliciti verso il capitolo Alchimia, mai dedotti dalla parola generica.
    if(src.id!=='page:alchimia' && /["']#?\/alchimia["']/i.test(src.raw)) edge(src.id,'page:alchimia','reference');
  }
  return {nodes,edges,referenceCount:edges.filter(e=>e.type==='reference').length};
}
export function relationsFor(graph,id) {
  const outgoing = graph.edges.filter(e=>e.type==='reference' && e.source===id).map(e=>graph.nodes.find(n=>n.id===e.target)).filter(Boolean);
  const incoming = graph.edges.filter(e=>e.type==='reference' && e.target===id).map(e=>graph.nodes.find(n=>n.id===e.source)).filter(Boolean);
  return {outgoing,incoming};
}
export function glossaryEntries(materials,processes,currentId=null) {
  const entries=[...materials.map(m=>({title:m.title||m.name,url:`#${materialPath(m)}`,id:`material:${m.materialId||m.id}`})),...processes.map((p,i)=>({title:p.title||p.name,url:`#${processPath(p,i)}`,id:`process:${p.id}`}))];
  return entries.filter(e=>e.id!==currentId).sort((a,b)=>b.title.length-a.title.length);
}
export function linkedHtml(html,glossary) {
  if(typeof document==='undefined')return html;
  const parser = new DOMParser(),doc=parser.parseFromString(`<div id="bto-linkified">${html}</div>`,'text/html');
  const root = doc.getElementById('bto-linkified');
  if(!root)return html;
  const walker = doc.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const textNodes=[];
  while(walker.nextNode()) {
    const node=walker.currentNode;
    if(!node.textContent?.trim() || node.parentElement?.closest('a,pre,code,button'))continue;
    textNodes.push(node);
  }
  for(const node of textNodes){
    const text=node.textContent || '';
    let cursor=0;
    const fragment=doc.createDocumentFragment();
    while(cursor<text.length){
      let best=null;
      for(const entry of glossary){
        const name=entry.title,ix=text.toLocaleLowerCase('it').indexOf(name.toLocaleLowerCase('it'),cursor);
        if(ix<0)continue;
        const before=ix>0?text[ix-1]:'';const after=text[ix+name.length]||'';
        if((before && /[\p{L}\p{N}]/u.test(before)) || (after && /[\p{L}\p{N}]/u.test(after)))continue;
        if(!best || ix<best.ix || (ix===best.ix && name.length>best.entry.title.length))best={ix,entry};
      }
      if(!best){fragment.append(doc.createTextNode(text.slice(cursor)));break;}
      if(best.ix>cursor)fragment.append(doc.createTextNode(text.slice(cursor,best.ix)));
      const a=doc.createElement('a');a.setAttribute('href',best.entry.url);a.setAttribute('class','bto-context-link');a.textContent=text.slice(best.ix,best.ix+best.entry.title.length);fragment.append(a);
      cursor=best.ix+best.entry.title.length;
    }
    node.parentNode?.replaceChild(fragment,node);
  }
  return root.innerHTML;
}
