// Importazione di documenti del GM, indipendente dal database per poter verificare
// gli input prima di una sola scrittura. Solo HTML/Markdown/JSON: nessun upload media.
const escape = value => String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const slug = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,65) || 'senza-titolo';
const hash = str => {let h=2166136261;for(const c of str){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);};
const identity = (prefix,str) => `${prefix}-import-${slug(str)}-${hash(str).slice(0,7)}`;
const rich = html=>({type:'rich',id:`blocco-${hash(html)}`,html});
const anchorSlug = text => slug(String(text).replace(/<[^>]*>/g,'').replace(/\*\*/g,''));
const inline = value => {
  let out=escape(value);
  // I link sono intenzionali, mai generati dalla semplice presenza di una parola.
  out=out.replace(/!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)/g,(_all,alt,url)=>`<img src="${url}" alt="${alt}"/>`);
  out=out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|#\/[^\s)]+)\)/g,(_all,label,url)=>`<a href="${url}">${label}</a>`);
  out=out.replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g,'<em>$1</em>')
    .replace(/`([^`\n]+)`/g,'<code>$1</code>');
  return out;
};
export function markdownToHtml(markdown) {
  const lines=String(markdown||'').replace(/\r\n?/g,'\n').split('\n');
  const result=[];let i=0;
  while(i<lines.length){
    const t=lines[i].trim();if(!t){i++;continue;}
    const head=t.match(/^(#{1,4})\s+(.+)$/);
    if(head){result.push(`<h${Math.min(4,head[1].length+1)} id="${anchorSlug(head[2])}">${inline(head[2])}</h${Math.min(4,head[1].length+1)}>`);i++;continue;}
    if(/^(-{3,}|\*{3,})$/.test(t)){result.push('<hr/>');i++;continue;}
    if(/^>\s?/.test(t)){let bits=[];while(i<lines.length&&/^>\s?/.test(lines[i].trim()))bits.push(inline(lines[i++].trim().replace(/^>\s?/,'')));result.push(`<blockquote>${bits.join(' ')}</blockquote>`);continue;}
    if(/^(- |\* |\d+\. )/.test(t)){
      const ordered=/^\d+\. /.test(t), items=[];
      while(i<lines.length&&/^(- |\* |\d+\. )/.test(lines[i].trim()))items.push(`<li>${inline(lines[i++].trim().replace(/^(- |\* |\d+\. )/,''))}</li>`);
      result.push(`<${ordered?'ol':'ul'}>${items.join('')}</${ordered?'ol':'ul'}>`);continue;
    }
    if(t.includes('|')&&i+1<lines.length&&/^\|?\s*:?-{3,}/.test(lines[i+1].trim())){
      const cells=s=>s.trim().replace(/^\||\|$/g,'').split('|').map(x=>inline(x.trim()));
      const columns=cells(lines[i]);i+=2;const rows=[];
      while(i<lines.length&&lines[i].includes('|')&&lines[i].trim())rows.push(cells(lines[i++]));
      result.push(`<table><thead><tr>${columns.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${columns.map((_,j)=>`<td>${r[j]||''}</td>`).join('')}</tr>`).join('')}</tbody></table>`);continue;
    }
    if(/^!\[[^\]]*\]\(https:\/\//.test(t)){
      const match=t.match(/^!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)$/);
      if(match){result.push(`<p><img src="${escape(match[2])}" alt="${escape(match[1])}"/></p>`);i++;continue;}
    }
    const paragraph=[];
    while(i<lines.length&&lines[i].trim()&&!/^(#{1,4} |\s*[-*] |\s*\d+\. |\s*>|\s*---)/.test(lines[i]))paragraph.push(inline(lines[i++].trim()));
    if(!paragraph.length){paragraph.push(inline(lines[i++]));}
    result.push(`<p>${paragraph.join('<br/>')}</p>`);
  }
  return result.join('\n');
}
export const fromMarkdown = (name, body, path, parentId) => {
  let source=String(body||''),meta={};const matter=source.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if(matter){for(const line of matter[1].split('\n')){const item=line.match(/^([\w-]+):\s*(.*)$/);if(item)meta[item[1].toLowerCase()]=item[2].trim().replace(/^['"]|['"]$/g,'');}source=source.slice(matter[0].length);}
  const title=meta.title||name.replace(/\.(md|markdown|html?)$/i,'').replace(/[-_]/g,' ');
  const kind=(meta.type==='collection'||meta.kind==='collection')?'collection':'page';
  const html=/\.html?$/i.test(name)?source:markdownToHtml(source);
  return {id:meta.id||identity(kind,path),kind,title,description:meta.description||'',parentId:meta.parentid||meta.parent||parentId,blocks:[rich(html)],imageUrl:'',imageAlt:'',order:0};
};
export function parseJsonImport(text, filePath, parentId) {
  const json=JSON.parse(text);
  const items=Array.isArray(json)?json:Array.isArray(json.entries)?json.entries:Array.isArray(json.pages)?json.pages:[json];
  if(!items.length)return [];
  return items.map((value,i)=>{
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error(`Voce ${i+1}: documento non valido.`);
    const kind=value.kind||'page';
    if(!['page','collection','chapter','material','genesis'].includes(kind))throw Error(`Voce ${i+1}: tipo «${kind}» non supportato.`);
    const title=String(value.title||value.name||'').trim();if(!title)throw Error(`Voce ${i+1}: manca il titolo.`);
    const name=`${filePath}:${i}:${title}`;
    const blocks=Array.isArray(value.blocks)?value.blocks.map((b,j)=>({...b,id:b.id||`blocco-${j}-${hash(name)}`})):
      [rich(value.html||markdownToHtml(value.markdown||value.body||value.content||''))];
    const id=value.id||identity(kind,name);
    return {...value,id,kind,title,description:value.description||'',parentId:value.parentId||parentId,order:Number.isFinite(value.order)?value.order:0,blocks};
  });
}
export function ensureImportEntry(entry) {
  if(!entry?.title?.trim()||!entry?.id?.trim()||!['page','collection','chapter','material','genesis'].includes(entry.kind)) throw Error('ID, titolo o tipo non valido.');
  if(!/^[a-z\d][a-z\d_-]{0,110}$/i.test(entry.id))throw Error(`ID non valido: ${entry.id}`);
  if(entry.kind==='material' && !entry.materialId)throw Error(`${entry.title}: un materiale richiede materialId.`);
  if(entry.kind==='genesis' && !entry.html)throw Error(`${entry.title}: un processo richiede html.`);
  if(JSON.stringify(entry).length > 700000)throw Error(`${entry.title}: file troppo grande per un singolo documento Firestore.`);
  return entry;
}
export async function readImportFiles(files,parentId,existingEntries=[]) {
  const records=[],errors=[],idIndex=new Set(),parentOrder=new Map();
  const reserved=new Map(existingEntries.map(e=>[e.id,e]));
  const list=[...files];
  if(list.length>160)throw Error('Massimo 160 file per importazione.');
  const folderIds=new Map();
  const makeFolder = (path,defaultParent) => {
    let current=defaultParent, acc='';
    for(const folder of path.split('/').filter(Boolean)){
      acc+=(acc?'/':'')+folder;const key=`${defaultParent}/${acc}`;
      const id=identity('collection',key);
      if(!folderIds.has(key)){
        folderIds.set(key,id);
        records.push({id,kind:'collection',title:folder.replace(/[-_]/g,' '),description:'',parentId:current,order:0,blocks:[]});
        idIndex.add(id);
      }
      current=id;
    }
    return current;
  };
  for(const file of list){
    try{
      if(file.size>5_000_000)throw Error('File oltre 5 MB.');
      const rel=(file.webkitRelativePath||file.name).replace(/\\/g,'/');
      const name=rel.split('/').pop();if(!/\.(md|markdown|json|html?)$/i.test(name)){errors.push(`${name}: formato non supportato.`);continue;}
      const folders=rel.includes('/')?rel.slice(0,rel.lastIndexOf('/')):'';
      const root=makeFolder(folders,parentId);
      const content=await file.text();
      const items=/\.json$/i.test(name)?parseJsonImport(content,rel,root):[fromMarkdown(name,content,`${parentId}/${rel}`,root)];
      for(const raw of items){
        const entry=ensureImportEntry(raw);
        if(idIndex.has(entry.id)){errors.push(`${name}: identificativo duplicato «${entry.id}».`);continue;}
        idIndex.add(entry.id);
        const parent=entry.parentId||root;
        const order=(parentOrder.get(parent)??0);
        parentOrder.set(parent,order+1);
        records.push({...entry,parentId:parent,order:Number.isFinite(entry.order)&&entry.order!==0?entry.order:1000000+order});
      }
    }catch(e){errors.push(`${file.name}: ${e.message}`);}
  }
  return {records:records.map(e=>({...e,existing:reserved.has(e.id)})),errors};
}
export const insertionOrder=(siblings,index)=>{
  const list=[...siblings].sort((a,b)=>Number(a.order||0)-Number(b.order||0)||a.title.localeCompare(b.title,'it'));
  if(!list.length)return 0;
  if(index<=0)return Number(list[0].order||0)-1;
  if(index>=list.length)return Number(list.at(-1).order||0)+1;
  const before=Number(list[index-1].order||0),after=Number(list[index].order||0);
  if(after>before && after-before>1e-7)return before+(after-before)/2;
  return before+0.000001;
};
