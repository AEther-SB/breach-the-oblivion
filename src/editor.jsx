import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, ChevronUp, Clock3, Edit3, ExternalLink, FilePlus2, Image as ImageIcon, Link2, LockKeyhole, LogIn, LogOut, Plus, Save, Send, ShieldCheck, Trash2, X } from 'lucide-react';
import { useContent, newEntry, safeUrl } from './content-store';
import { sanitizeHtml, validatedImageUrl } from './sanitize';

const kinds = { chapter:'Capitolo',page:'Pagina',material:'Materiale',genesis:'Processo' };
function Wysiwyg({value,onChange,label}) {
  const ref = useRef(null);
  useEffect(() => {if(ref.current && ref.current.innerHTML !== (value || '')) ref.current.innerHTML=value || '<p></p>';},[value]);
  function format(command, param) {
    ref.current?.focus();
    document.execCommand(command, false, param);
    onChange(ref.current?.innerHTML || '');
  }
  function link() {
    const url = window.prompt('URL del collegamento (https:// oppure #/pagina/…):', 'https://');
    if(!url)return;
    const allowed = safeUrl(url,true);
    if(!allowed){window.alert('Usa un URL http(s) o un link interno che inizia con #/.');return;}
    format('createLink',allowed);
  }
  return <div className="gm-wysiwyg-field"><label>{label}</label><div className="gm-formatbar" role="toolbar" aria-label={`Formato: ${label}`}>
    <button type="button" title="Grassetto" onClick={()=>format('bold')}><strong>B</strong></button>
    <button type="button" title="Corsivo" onClick={()=>format('italic')}><em>I</em></button>
    <button type="button" title="Elenco puntato" onClick={()=>format('insertUnorderedList')}>• ≡</button>
    <button type="button" title="Elenco numerato" onClick={()=>format('insertOrderedList')}>1. ≡</button>
    <button type="button" title="Collegamento" onClick={link}><Link2 size={16}/></button>
    <button type="button" title="Rimuovi formattazione" onClick={()=>format('removeFormat')}>Tx</button>
  </div><div ref={ref} contentEditable suppressContentEditableWarning className="gm-wysiwyg" role="textbox" aria-multiline="true" aria-label={label} onInput={e=>onChange(e.currentTarget.innerHTML)} onPaste={e=>{ e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'));onChange(e.currentTarget.innerHTML);}}/></div>;
}
const Input=({label,value,onChange,as='input',...props})=><label className="gm-input"><span>{label}</span>{as==='textarea'? <textarea value={value||''} onChange={e=>onChange(e.target.value)} {...props}/>:<input value={value||''} onChange={e=>onChange(e.target.value)} {...props}/>}</label>;
const SectionActions=({up,down,remove})=><div className="gm-reorder"><button title="Sposta su" type="button" onClick={up}><ChevronUp size={16}/></button><button title="Sposta giù" type="button" onClick={down}><ChevronDown size={16}/></button><button title="Rimuovi" type="button" onClick={remove}><Trash2 size={16}/></button></div>;
function updateArray(items,index,patch) {return items.map((v,i)=>i===index?{...v,...patch}:v);}
function swap(items, i, direction){const j=i+direction;if(j<0||j>=items.length)return items;const out=[...items];[out[i],out[j]]=[out[j],out[i]];return out;}

export function EntryEditor({entry,open,onClose}) {
  const {gm,saveDraft,publish,remove,loadHistory,isDraft,pages,setError} = useContent();
  const navigate=useNavigate();
  const [form,setForm] = useState(entry);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const [revisions,setRevisions] = useState([]);
  const [showHistory,setShowHistory] = useState(false);
  useEffect(()=>{setForm(JSON.parse(JSON.stringify(entry)));setMessage('');setRevisions([]);setShowHistory(false);},[entry?.id,open]);
  if(!open||!gm||!form) return null;
  const field=(key,value)=>setForm(old=>({...old,[key]:value}));
  const profile=(key,value)=>setForm(old=>({...old,profile:{...(old.profile||{}),[key]:value}}));
  const run=async(cb,success)=>{setBusy(true);setMessage('');try{await cb();setMessage(success);}catch(e){setMessage(e.message);setError(e.message);}finally{setBusy(false);}};
  const save=()=>run(()=>saveDraft(form),'Bozza salvata. Soltanto il GM può visualizzarla.');
  const goPublish=()=>run(async()=>{await publish(form);onClose();},'Pubblicato.');
  const del=()=>{if(entry.id==='alchimia')return;if(!window.confirm(`Eliminare definitivamente «${form.title}» dalla pubblicazione e dalle bozze?`))return;run(async()=>{await remove(entry.id);onClose();navigate('/');},'Eliminato.');};
  const findHistory=()=>run(async()=>{setRevisions(await loadHistory(entry.id));setShowHistory(true);},'');
  return createPortal(<div className="gm-overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <section className="gm-drawer" role="dialog" aria-modal="true" aria-label={`Modifica ${form.title}`}>
      <div className="gm-drawer-header"><div><small>MODALITÀ GM · {kinds[form.kind]||'Voce'}</small><h2>Modifica contenuto</h2><p>{form.title}</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Chiudi"><X/></button></div>
      <div className="gm-drawer-body">
        <Input label="Titolo" value={form.title} onChange={v=>field('title',v)}/>
        {form.kind==='material'&&<>
          <div className="gm-two-col"><Input label="Simbolo" value={form.symbol} onChange={v=>field('symbol',v)}/><label className="gm-input"><span>Categoria</span><select value={form.group} onChange={e=>field('group',e.target.value)}>{['Elementi','Metalli Planetari','Metalli Pesanti','Materia Vitale','Compositi'].map(g=><option key={g}>{g}</option>)}</select></label></div>
          <Input label="Bonus di Purezza" value={form.bonus} onChange={v=>field('bonus',v)}/>
          <Input label="Prerequisiti" value={form.requirementsText} onChange={v=>field('requirementsText',v)} as="textarea" rows={2}/>
          <Input label="Descrizione nel mondo di gioco" value={form.profile?.theme} onChange={v=>profile('theme',v)} as="textarea" rows={5}/>
          <Input label="Riferimento alchemico reale" value={form.profile?.history} onChange={v=>profile('history',v)} as="textarea" rows={4}/>
          <Input label="URL della fonte storica" value={form.profile?.historicalUrl} onChange={v=>profile('historicalUrl',v)} placeholder="https://…"/>
          <div className="gm-section-heading"><h3>Capacità</h3><button type="button" onClick={()=>field('abilities',[...(form.abilities||[]),{id:`abilita-${Date.now()}`,name:'Nuova capacità',level:1,html:'<p></p>'}])}><Plus size={15}/> Aggiungi</button></div>
          {(form.abilities||[]).map((a,i)=><div className="gm-block-editor" key={a.id||i}><div className="gm-block-title"><strong>Capacità {i+1}</strong><SectionActions up={()=>field('abilities',swap(form.abilities,i,-1))} down={()=>field('abilities',swap(form.abilities,i,1))} remove={()=>field('abilities',form.abilities.filter((_,j)=>i!==j))}/></div><div className="gm-two-col"><Input label="Nome" value={a.name} onChange={v=>field('abilities',updateArray(form.abilities,i,{name:v}))}/><Input label="Grado" type="number" min="1" value={a.level} onChange={v=>field('abilities',updateArray(form.abilities,i,{level:Number(v)}))}/></div><Wysiwyg key={`${entry.id}-${a.id||i}`} label="Descrizione meccanica" value={a.html} onChange={v=>field('abilities',updateArray(form.abilities,i,{html:v}))}/></div>)}
        </>}
        {form.kind==='genesis'&&<Wysiwyg label="Descrizione del processo" value={form.html} onChange={v=>field('html',v)}/>}
        {(form.kind==='page'||form.kind==='chapter')&&<>
          <Input label="Descrizione breve" value={form.description} onChange={v=>field('description',v)} as="textarea" rows={2}/>
          {form.kind==='page'&&<label className="gm-input"><span>Sezione di appartenenza</span><select value={form.parentId||'root'} onChange={e=>field('parentId',e.target.value)}><option value="root">Compendio · Home</option><option value="alchimia">Alchimia</option>{pages.filter(p=>p.kind==='chapter'&&p.id!==form.id&&p.id!=='alchimia').map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>}
          <div className="gm-section-heading"><h3>Blocchi</h3><div className="gm-add-block">{[['rich','Testo'],['image','Immagine URL'],['link','Collegamento']].map(([type,label])=><button type="button" key={type} onClick={()=>field('blocks',[...(form.blocks||[]),{id:`blocco-${Date.now()}`,type,html:'<p></p>',url:'',text:'',alt:''}])}><Plus size={14}/>{label}</button>)}</div></div>
          {(form.blocks||[]).map((block,i)=><div className="gm-block-editor" key={block.id||i}><div className="gm-block-title"><strong>{block.type==='rich'?'Testo':block.type==='image'?'Immagine':'Collegamento'} · {i+1}</strong><SectionActions up={()=>field('blocks',swap(form.blocks,i,-1))} down={()=>field('blocks',swap(form.blocks,i,1))} remove={()=>field('blocks',form.blocks.filter((_,j)=>i!==j))}/></div>
            {block.type==='rich'&&<Wysiwyg key={block.id} label="Contenuto" value={block.html} onChange={v=>field('blocks',updateArray(form.blocks,i,{html:v}))}/>}
            {block.type==='image'&&<><Input label="URL immagine HTTPS" value={block.url} onChange={v=>field('blocks',updateArray(form.blocks,i,{url:v}))} placeholder="https://…"/><Input label="Testo alternativo (accessibilità)" value={block.alt} onChange={v=>field('blocks',updateArray(form.blocks,i,{alt:v}))}/>{validatedImageUrl(block.url)&&<img className="gm-image-preview" src={validatedImageUrl(block.url)} alt={block.alt||'Anteprima'} referrerPolicy="no-referrer"/>}</>}
            {block.type==='link'&&<><Input label="Testo del collegamento" value={block.text} onChange={v=>field('blocks',updateArray(form.blocks,i,{text:v}))}/><Input label="URL esterno o #/pagina/…" value={block.url} onChange={v=>field('blocks',updateArray(form.blocks,i,{url:v}))}/></>}
          </div>)}
        </>}
        {(form.kind==='material'||form.kind==='page'||form.kind==='chapter')&&<div className="gm-image-fields"><h3>Immagine introduttiva (solo URL)</h3><Input label="URL HTTPS" value={form.imageUrl} onChange={v=>field('imageUrl',v)} placeholder="https://…"/><Input label="Testo alternativo" value={form.imageAlt} onChange={v=>field('imageAlt',v)}/>{validatedImageUrl(form.imageUrl)&&<img className="gm-image-preview" alt={form.imageAlt||'Anteprima'} src={validatedImageUrl(form.imageUrl)} referrerPolicy="no-referrer"/>}</div>}
        <div className="gm-history"><button type="button" onClick={findHistory}><Clock3 size={16}/> Cronologia pubblicazioni</button>{showHistory&&<div>{revisions.length===0?<p>Nessuna versione precedente.</p>:revisions.map(rev=><button type="button" key={rev.id} onClick={()=>{setForm(rev.content);setMessage('Versione caricata nell’editor. Salva come bozza o pubblicala per ripristinarla.');}}>{rev.at?.toDate?.().toLocaleString('it-IT')||'Versione precedente'} · Ripristina nell’editor</button>)}</div>}</div>
      </div>
      <div className="gm-drawer-footer"><div className="gm-status" role="status">{message|| (isDraft(entry.id)?'Esiste una bozza non pubblicata.':'I lettori vedono soltanto la versione pubblicata.')}</div><div className="gm-footer-actions">{entry.id!=='alchimia'&&<button className="gm-danger" type="button" onClick={del} disabled={busy}><Trash2 size={15}/> Elimina</button>}<button className="gm-secondary" type="button" disabled={busy} onClick={save}><Save size={16}/> Salva bozza</button><button className="gm-primary" type="button" disabled={busy} onClick={goPublish}><Send size={16}/> Pubblica</button></div></div>
    </section>
  </div>, document.body);
}
export function EditTrigger({entry,children}) {const {gm,seeded,isDraft}=useContent();const[open,setOpen]=useState(false);if(!gm||!seeded||!entry)return null;return <>{<button type="button" className="gm-edit-trigger" onClick={()=>setOpen(true)}><Edit3 size={15}/>{children||'Modifica pagina'}{isDraft(entry.id)&&<span>Bozza</span>}</button>}<EntryEditor entry={entry} open={open} onClose={()=>setOpen(false)}/></>;}

export function GMControls() {
  const {configured,user,gm,authPending,seeded,login,logout,bootstrap,pages,setError,error}=useContent();
  const [open,setOpen]=useState(false);const [add,setAdd]=useState(false);
  const [type,setType]=useState('page');const [title,setTitle]=useState('');const [parent,setParent]=useState('alchimia');const [busy,setBusy]=useState(false);
  const navigate=useNavigate();
  const {saveDraft}=useContent();
  async function create(e) {e.preventDefault();if(!title.trim())return;setBusy(true);try{const entry=newEntry(type,title.trim(),type==='chapter'?'root':parent);await saveDraft(entry);setAdd(false);setTitle('');navigate(type==='material'?`/alchimia/materiali/${entry.materialId}`:type==='genesis'?'/alchimia/processi':`/pagina/${entry.id}`);}catch(e){setError(e.message);window.alert(e.message);}finally{setBusy(false);}}
  const loginAction=async()=>{try{await login();}catch(e){setError(e.message);window.alert(e.message);}};
  const seedAction=async()=>{if(!window.confirm('Importare 32 materiali, 12 processi e la sezione Alchimia in Firestore? Esegui questa operazione una sola volta.'))return;setBusy(true);try{await bootstrap();}catch(e){setError(e.message);window.alert(e.message);}finally{setBusy(false);}};
  return <>
    <div className="gm-header-area"><button type="button" className="icon-button gm-account-trigger" onClick={()=>setOpen(!open)} title="Accesso GM" aria-label="Accesso GM"><LockKeyhole size={18}/>{gm&&<span className="gm-live-dot"/>}</button>
    {open&&<div className="gm-account-menu">{!configured?<p>Firebase non configurato. Inserisci i parametri della Web App nelle variabili VITE_FIREBASE_*.</p>:!user?<><strong>Accesso Game Master</strong><p>Accedi con Google. Il proprietario del progetto deve abilitare il tuo UID in Firestore.</p><button className="gm-primary" type="button" onClick={loginAction}><LogIn size={16}/> Accedi con Google</button></>:<><strong>{gm?'Game Master':'Account non abilitato'}</strong><small>{user.email}</small><button type="button" title="Copia UID" className="gm-uid gm-uid-button" onClick={()=>navigator.clipboard?.writeText(user.uid)}>UID: {user.uid} · Copia</button>{error&&<small className="gm-error">{error}</small>}{gm&&<>{seeded&&<button type="button" className="gm-primary" onClick={()=>{setAdd(true);setOpen(false);}}><FilePlus2 size={15}/> Nuova pagina / sezione</button>}{!seeded&&<button type="button" disabled={busy} className="gm-secondary" onClick={seedAction}>Importa compendio iniziale</button>}</>}<button type="button" className="gm-secondary" onClick={()=>logout().then(()=>setOpen(false))}><LogOut size={15}/> Esci</button></>}</div>}</div>
    {add&&createPortal(<div className="gm-overlay" onMouseDown={e=>e.target===e.currentTarget&&setAdd(false)}><form onSubmit={create} className="gm-create-modal" role="dialog" aria-modal="true" aria-label="Nuova voce"><div className="gm-create-top"><h2>Nuova voce</h2><button type="button" className="icon-button" onClick={()=>setAdd(false)}><X/></button></div><label className="gm-input"><span>Tipo</span><select value={type} onChange={e=>setType(e.target.value)}><option value="page">Pagina</option><option value="chapter">Sezione principale</option><option value="material">Materiale alchemico</option><option value="genesis">Processo alchemico</option></select></label><Input label="Titolo" value={title} onChange={setTitle} required placeholder="Nome della nuova voce"/>{type==='page'&&<label className="gm-input"><span>In quale sezione?</span><select value={parent} onChange={e=>setParent(e.target.value)}><option value="root">Home</option><option value="alchimia">Alchimia</option>{pages.filter(p=>p.kind==='chapter'&&p.id!=='alchimia').map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>}<div className="gm-footer-actions"><button className="gm-secondary" type="button" onClick={()=>setAdd(false)}>Annulla</button><button className="gm-primary" type="submit" disabled={busy}><Plus size={15}/> Crea bozza</button></div></form></div>,document.body)}
  </>;
}

export function GenericBlocks({entry}) {
  return <>
    {entry.imageUrl&&validatedImageUrl(entry.imageUrl)&&<figure className="gm-content-image"><img src={validatedImageUrl(entry.imageUrl)} alt={entry.imageAlt||entry.title} loading="lazy" referrerPolicy="no-referrer"/></figure>}
    {(entry.blocks||[]).map((block,i)=><div key={block.id||i} className={`gm-content-block gm-content-${block.type}`}>
      {block.type==='rich'&&<div className="rules" dangerouslySetInnerHTML={{__html:sanitizeHtml(block.html)}}/>}
      {block.type==='image'&&validatedImageUrl(block.url)&&<figure className="gm-content-image"><img src={validatedImageUrl(block.url)} alt={block.alt||''} loading="lazy" referrerPolicy="no-referrer"/></figure>}
      {block.type==='link'&&safeUrl(block.url,true)&&(block.url.startsWith('#/')?<a href={block.url} className="gm-content-link">{block.text||block.url} <ExternalLink size={16}/></a>:<a href={safeUrl(block.url)} target="_blank" rel="noopener noreferrer" className="gm-content-link">{block.text||block.url}<ExternalLink size={16}/></a>)}
    </div>)}
  </>;
}
