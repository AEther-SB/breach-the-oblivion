import React, {useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowLeft, ArrowUpRight, BookOpen, Check, ChevronRight, Clock3, GitBranch, Plus, Save, X, History, Pencil} from 'lucide-react';
import {newEntry, useContent} from './content-store';
import './storia-timeline.css';

// Ordinamento relativo: non attribuisce date storiche non documentate.
// I campi timeline delle voci già pubblicate restano compatibili con la v3.1/v3.2.
const BASE={
 'testimonianze-antiche':{period:'Antichità',label:'Testimonianze e culti',rank:0,lane:'testimonianze',from:[]},
 'cimeli-artefatti':{period:'Antichità',label:'Cimeli e artefatti',rank:0,lane:'reperti',from:[]},
 'anomalie-cronologiche':{period:'Antichità',label:'Anomalie cronologiche',rank:1,lane:'reperti',from:['cimeli-artefatti']},
 'origine-poteri':{period:'Origini dei poteri',label:'I primi Quirk',rank:2,lane:'poteri',from:['anomalie-cronologiche']},
 'era-dei-poteri':{period:'Era dei Poteri',label:'Era dei Poteri',rank:3,lane:'poteri',from:['origine-poteri']},
};
const sanitizeRank=n=>Math.min(100,Math.max(0,Number.isFinite(Number(n))?Math.floor(Number(n)):0));
const cleanLinks=(value,ids,self)=>String(value||'').split(',').map(x=>x.trim()).filter((id,i,a)=>id!==self&&ids.has(id)&&a.indexOf(id)===i).slice(0,12);
const dataOf=page=>({...BASE[page.id],...(page.timeline||{}),rank:sanitizeRank(page.timeline?.rank??BASE[page.id]?.rank??10)});
const baseOrder=Object.keys(BASE);

export default function StoriaTimeline({pages,entry,editControl}){
 const {gm,seeded,saveDraft,publish}=useContent();
 const [edit,setEdit]=useState(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const entries=useMemo(()=>pages.filter(p=>Boolean(BASE[p.id])||p.timeline?.show===true).sort((a,b)=>dataOf(a).rank-dataOf(b).rank||(baseOrder.includes(a.id)&&baseOrder.includes(b.id)?baseOrder.indexOf(a.id)-baseOrder.indexOf(b.id):a.title.localeCompare(b.title,'it'))),[pages]);
 const loreGroups=useMemo(()=>{
  const ordered=pages.filter(p=>p.parentId==='storia-passato'&&p.kind==='page'&&(!p.timeline?.show||BASE[p.id]));
  const groups=new Map();
  for(const page of ordered){
   const group=BASE[page.id]?.period||'Altri approfondimenti';
   if(!groups.has(group))groups.set(group,[]);
   groups.get(group).push(page);
  }
  const order=['Antichità','Origini dei poteri','Era dei Poteri','Altri approfondimenti'];
  return [...groups].sort(([a],[b])=>order.indexOf(a)-order.indexOf(b)).map(([name,items])=>({name,items:items.sort((a,b)=>(a.order||0)-(b.order||0)||a.title.localeCompare(b.title,'it'))}));
 },[pages]);
 const entryById=new Map(entries.map(p=>[p.id,p]));
 const maxRank=Math.max(3,...entries.map(p=>dataOf(p).rank));
 const canEdit=gm&&seeded;
 function editEvent(page){const meta=dataOf(page);setEdit({id:page.id,title:page.title,period:meta.period||'',label:meta.label||page.title,rank:meta.rank,lane:meta.lane||'testimonianze',from:(meta.from||[]).join(', '),show:true});setError('');}
 function addEvent(){setEdit({id:'',title:'',period:'',label:'',rank:maxRank+1,lane:'testimonianze',from:'',show:true});setError('');}
 function cancel(){setEdit(null);setError('');}
 async function save(publishNow=false){
  if(!canEdit||!edit||busy)return;
  const title=edit.title.trim();if(!title){setError('Inserisci il titolo dell’evento.');return;}
  const rank=sanitizeRank(edit.rank);
  const ids=new Set(entries.map(p=>p.id));
  setBusy(true);setError('');
  try{
   const original=edit.id?pages.find(p=>p.id===edit.id):newEntry('page',title,'storia-passato');
   if(!original)throw Error('Voce storica non trovata.');
   const record={...original,title,description:original.description||'',parentId:original.parentId||'storia-passato',timeline:{show:true,label:edit.label.trim()||title,period:edit.period.trim()||'Periodo non definito',rank,lane:edit.lane||'testimonianze',from:cleanLinks(edit.from,ids,original.id)}};
   if(publishNow)await publish(record);else await saveDraft(record);
   setMessage(publishNow?'Evento pubblicato nella cronologia.':'Evento salvato come bozza.');setEdit(null);
  }catch(e){setError(e.message||'Salvataggio non riuscito.');}finally{setBusy(false);}
 }
 return <div className="storia-workspace">
  <header className="storia-workspace-header">
   <div className="storia-workspace-title"><div className="storia-workspace-breadcrumb"><Link to="/">Home</Link><ChevronRight size={13}/>Storia e Passato</div>
    <div><span className="eyebrow">ARCHIVIO STORICO · COMPENDIO</span><h1>Storia e Passato</h1><p>Cronologia degli avvenimenti e approfondimenti sull’ambientazione.</p></div></div>
   <div className="storia-workspace-actions">{editControl}{canEdit&&<button type="button" className="storia-add" onClick={addEvent}><Plus size={16}/> Nuovo evento</button>}</div>
  </header>
  {message&&<p className="storia-confirm" role="status"><Check size={15}/>{message}</p>}
  <div className="storia-workspace-layout">
   <section className="storia-events" aria-label="Avvenimenti storici in ordine cronologico">
    <div className="storia-column-head"><Clock3 size={19}/><div><span className="eyebrow">DAL PIÙ ANTICO AL PIÙ RECENTE</span><h2>Avvenimenti storici</h2></div><span className="storia-count">{entries.length}</span></div>
    <p className="storia-column-intro">L’ordine rappresenta una ricostruzione relativa. Dove non esistono date certe, non ne vengono attribuite.</p>
    <div className="storia-event-list">{entries.map((page,i)=>{
      const meta=dataOf(page);const refs=(meta.from||[]).map(id=>entryById.get(id)).filter(Boolean);
      return <div className="storia-event" key={page.id}>
       <div className="storia-event-axis"><span className="storia-event-dot"/><span>{String(i+1).padStart(2,'0')}</span></div>
       <div className="storia-event-card"><div className="storia-event-meta"><span>{meta.period||'Periodo non definito'}</span>{canEdit&&<button type="button" onClick={()=>editEvent(page)} title={`Modifica ${page.title}`}><Pencil size={13}/> Modifica</button>}</div>
        <Link to={`/pagina/${page.id}`} className="storia-event-link"><strong>{meta.label||page.title}</strong><ArrowUpRight size={17}/></Link>
        <p>{page.description||'Consulta la scheda per conoscere le informazioni disponibili.'}</p>
        {refs.length>0&&<div className="storia-event-relations"><GitBranch size={13}/><span>Collegamenti:</span>{refs.map(ref=><Link to={`/pagina/${ref.id}`} key={ref.id}>{dataOf(ref).label||ref.title}</Link>)}</div>}
       </div>
      </div>;
    })}</div>
    {!entries.length&&<p className="storia-empty">Non sono ancora stati inseriti eventi nella cronologia.</p>}
   </section>
   <section className="storia-lore" aria-label="Lore e ambientazione">
    <div className="storia-column-head"><BookOpen size={19}/><div><span className="eyebrow">CONTESTO E RICERCHE</span><h2>Lore e Ambientazione</h2></div></div>
    <p className="storia-column-intro">Approfondimenti, reperti, origini e interpretazioni storiche. Le ipotesi sono distinte dai fatti documentati.</p>
    <div className="storia-lore-groups">{loreGroups.map((group,i)=><section className="storia-lore-group" key={group.name}>
     <div className="storia-lore-group-heading"><small>{String(i+1).padStart(2,'0')} / AMBITO</small><h3>{group.name}</h3></div>
     <div className="storia-lore-cards">{group.items.map(page=><Link to={`/pagina/${page.id}`} key={page.id} className="storia-lore-card"><span><strong>{page.title}</strong><small>{page.description||'Approfondimento dell’ambientazione'}</small></span><ArrowUpRight size={17}/></Link>)}</div>
    </section>)}</div>
    {!loreGroups.length&&<p className="storia-empty">Non sono ancora disponibili approfondimenti storici.</p>}
   </section>
  </div>
  {edit&&<div className="storia-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)cancel()}}><form className="storia-modal" onSubmit={e=>{e.preventDefault();save(false)}} role="dialog" aria-modal="true" aria-label="Editor evento storico">
   <div className="storia-modal-top"><div><span className="eyebrow">EDITOR GM · STORIA</span><h2>{edit.id?'Modifica evento':'Nuovo evento storico'}</h2></div><button type="button" onClick={cancel} aria-label="Chiudi"><X size={19}/></button></div>
   <label>Titolo della pagina<input required value={edit.title} onChange={e=>setEdit(v=>({...v,title:e.target.value}))}/></label>
   <label>Nome visualizzato nella cronologia<input value={edit.label} onChange={e=>setEdit(v=>({...v,label:e.target.value}))}/></label>
   <label>Periodo (anche se la data è sconosciuta)<input value={edit.period} onChange={e=>setEdit(v=>({...v,period:e.target.value}))} placeholder="Per es. Antichità, era moderna, periodo non definito…"/></label>
   <label>Posizione cronologica relativa<input type="number" min="0" max="100" step="1" value={edit.rank} onChange={e=>setEdit(v=>({...v,rank:e.target.value}))}/></label>
   <label>Collegamenti a eventi precedenti (ID separati da virgole)<input value={edit.from} onChange={e=>setEdit(v=>({...v,from:e.target.value}))} placeholder="Per esempio cimeli-artefatti"/></label>
   <p>Eventi disponibili: {entries.map(p=>p.id).join(' · ')}. I collegamenti possono esprimere anche teorie e devono essere spiegati nella scheda.</p>
   {error&&<p className="storia-error" role="alert">{error}</p>}
   <div className="storia-modal-actions"><button type="button" onClick={cancel} disabled={busy}>Annulla</button><button type="submit" disabled={busy}><Save size={15}/> Salva bozza</button><button type="button" className="storia-publish" onClick={()=>save(true)} disabled={busy}><Check size={15}/> Pubblica</button></div>
  </form></div>}
 </div>;
}
