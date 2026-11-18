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
export const materialThemeClass = {Elementi:'elements','Metalli Planetari':'planetary','Metalli Pesanti':'heavy','Materia Vitale':'vital',Compositi:'composite'};
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
// Solo collegamenti intenzionali: href espliciti, blocchi Link e prerequisiti effettivi.
// Citare una parola comune (Acqua, Fuoco, Oro...) nel testo NON crea una relazione.
export function getExplicitUrls(entry) {
  const urls = new Set();
  const body=[entry.html,...(entry.abilities||[]).map(a=>a.html),...(entry.blocks||[]).map(b=>b.html)].filter(Boolean).join(' ');
  const rx=/\bhref\s*=\s*["']([^"']+)["']/gi;
  for(const match of body.matchAll(rx))urls.add(match[1].replace(/^#/,'').trim());
  for(const block of entry.blocks||[]) {
    if(['link'].includes(block.type)&&block.url)urls.add(block.url.replace(/^#/,''));
    for(const link of block.links||[])if(link.url)urls.add(link.url.replace(/^#/,''));
  }
  for(const target of entry.relatedUrls||[])urls.add(String(target).replace(/^#/,''));
  return urls;
}
export function buildRelations(materials, processes, pages = []) {
  const nodes = [];
  const alchemy = pages.find(p=>p.id==='alchimia');
  nodes.push({id:'page:alchimia',title:alchemy?.title||'Alchimia',type:'chapter',tone:'amber',url:routes.alchemy,order:-1});
  GROUPS.forEach((title,i)=>nodes.push({id:`group:${title}`,title,type:'group',tone:groupTones[title],url:`${routes.materials}?categoria=${encodeURIComponent(title)}`,order:i}));
  nodes.push({id:'hub:processes',title:'Processi alchemici',type:'group',tone:'violet',url:routes.processes,order:5});
  materials.forEach(m=>nodes.push({id:`material:${m.materialId||m.id}`,title:m.title||m.name,type:'material',tone:groupTones[m.group]||'amber',symbol:m.symbol||'◇',url:materialPath(m),group:m.group}));
  processes.forEach((p,i)=>nodes.push({id:`process:${p.id}`,title:p.title||p.name,type:'process',tone:'violet',url:processPath(p,i)}));
  const extra = pages.filter(p=>!['alchimia','alchimia-materiali','alchimia-genesi'].includes(p.id));
  extra.forEach(p=>nodes.push({id:`page:${p.id}`,title:p.title,type:['chapter','collection'].includes(p.kind)?'chapter':'page',tone:['chapter','collection'].includes(p.kind)?'gold':'steel',url:`/pagina/${p.id}`}));
  const edges=[], keys=new Set(), ids=new Set(nodes.map(n=>n.id));
  const edge=(a,b,type)=>{if(a===b||!ids.has(a)||!ids.has(b))return;const key=`${a}|${b}|${type}`;if(keys.has(key))return;keys.add(key);edges.push({source:a,target:b,type});};
  for(const g of GROUPS)edge('page:alchimia',`group:${g}`,'category');
  edge('page:alchimia','hub:processes','category');
  for(const m of materials)edge(`group:${m.group}`,`material:${m.materialId||m.id}`,'category');
  for(const p of processes)edge('hub:processes',`process:${p.id}`,'category');
  for(const page of extra){
    const parent=['alchimia','alchimia-materiali','alchimia-genesi'].includes(page.parentId)?'page:alchimia':`page:${page.parentId}`;
    if(ids.has(parent))edge(parent,`page:${page.id}`,'category');
  }
  const content=[...materials.map(m=>({id:`material:${m.materialId||m.id}`,entry:m})),
    ...processes.map(p=>({id:`process:${p.id}`,entry:p})),
    ...extra.map(p=>({id:`page:${p.id}`,entry:p})),
    ...(alchemy?[{id:'page:alchimia',entry:alchemy}]:[])];
  for(const src of content){
    const links=getExplicitUrls(src.entry);
    for(const node of nodes){
      if(src.id===node.id)continue;
      const dest=node.url.replace(/^#/, '');
      // Link a pagine specifiche, non a termini comuni nel corpo del testo.
      if([...links].some(url=>url===dest || (node.type==='material'&&url.split('?')[0]===dest) || (node.type==='page'&&url===`/pagina/${node.id.slice(5)}`)))edge(src.id,node.id,'reference');
    }
    if(src.id.startsWith('material:')){
      // I nomi di materiali nei prerequisiti indicano effettive dipendenze alchemiche.
      for(const mat of materials){
        const targetId=`material:${mat.materialId||mat.id}`;
        if(targetId!==src.id && hasMention(src.entry.requirementsText||'',mat.title||mat.name))edge(src.id,targetId,'reference');
      }
    }
  }
  return {nodes,edges,referenceCount:edges.filter(e=>e.type==='reference').length};
}
export function relationsFor(graph,id) {
  const outgoing = graph.edges.filter(e=>e.type==='reference' && e.source===id).map(e=>graph.nodes.find(n=>n.id===e.target)).filter(Boolean);
  const incoming = graph.edges.filter(e=>e.type==='reference' && e.target===id).map(e=>graph.nodes.find(n=>n.id===e.source)).filter(Boolean);
  return {outgoing,incoming};
}
export function glossaryEntries(materials,processes,currentId=null) {
  const entries=[...materials.map(m=>({title:m.title||m.name,url:`#${materialPath(m)}`,id:`material:${m.materialId||m.id}`,tone:materialThemeClass[m.group]})),...processes.map((p,i)=>({title:p.title||p.name,url:`#${processPath(p,i)}`,id:`process:${p.id}`}))];
  return entries.filter(e=>e.id!==currentId).sort((a,b)=>b.title.length-a.title.length);
}
export function linkedHtml(html,glossary,{allowAuto=false}={}) {
  if(!allowAuto)return html;
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
      const a=doc.createElement('a');a.setAttribute('href',best.entry.url);a.setAttribute('class',`bto-context-link ${best.entry.tone?`tone-${best.entry.tone}`:'tone-processes'}`);a.textContent=text.slice(best.ix,best.ix+best.entry.title.length);fragment.append(a);
      cursor=best.ix+best.entry.title.length;
    }
    node.parentNode?.replaceChild(fragment,node);
  }
  return root.innerHTML;
}
