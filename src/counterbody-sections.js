// Le categorie principali dei Controcorpi sono vere sottosezioni navigabili.
// La categoria Hybrid resta un paragrafo nell'articolo introduttivo.
export const COUNTERBODY_SECTIONS = ['Vessel','Sentinel','Tether','Warrior','Container','Special'];
const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/<[^>]*>/g,'').trim();
export const isCounterbodySubsection = title => COUNTERBODY_SECTIONS.some(name=>norm(name)===norm(title));

// Recupera il contenuto dei vecchi capitoli Markdown, per non perdere eventuali
// modifiche dell'autore quando le categorie vengono presentate come sottosezioni.
function extractExistingSections(blocks=[]){
 const sections = new Map();
 let active='';
 for (const block of blocks){
  if (block.type === 'heading') {
   active = isCounterbodySubsection(block.text) ? norm(block.text) : '';
   if(active && !sections.has(active)) sections.set(active,[]);
   continue;
  }
  if (block.type !== 'rich') {
   if(active) sections.get(active)?.push(block);
   continue;
  }
  const source=String(block.html||'');
  const headings=[...source.matchAll(/<h([234])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
  if(!headings.length){if(active && source.trim())sections.get(active)?.push({...block,html:source});continue;}
  let from=0;
  for (let i=0;i<headings.length;i++){
   const match=headings[i];
   if(active && match.index > from){const preceding=source.slice(from,match.index).trim();if(preceding)sections.get(active)?.push({...block,html:preceding});}
   active=isCounterbodySubsection(match[2])?norm(match[2]):'';
   if(active && !sections.has(active))sections.set(active,[]);
   from=match.index+match[0].length;
  }
  if(active && source.slice(from).trim())sections.get(active)?.push({...block,html:source.slice(from).trim()});
 }
 return sections;
}

export function expandCounterbodyPages(basePages){
 const parent=basePages.find(page=>page.id==='controcorpi');
 if(!parent)return basePages;
 const existing=new Set(basePages.map(page=>page.id));
 const fragments=extractExistingSections(parent.blocks);
 const additions=COUNTERBODY_SECTIONS.flatMap((name,index)=>{
  const id=`controcorpi-${name.toLowerCase()}`;
  if(existing.has(id))return [];
  const blocks=fragments.get(name.toLowerCase())?.filter(x=>x.type!=='heading')||[];
  return [{id,kind:'collection',title:name,parentId:'controcorpi',order:index+1,layout:'lore',icon:'shield',description:'Categoria di Controcorpo',blocks:blocks.length?blocks:[{id:`${id}-descrizione`,type:'rich',html:'<p><em>Definizione enciclopedica non ancora fornita.</em></p>'}],virtualSubsection:true}];
 });
 return [...basePages,...additions];
}
