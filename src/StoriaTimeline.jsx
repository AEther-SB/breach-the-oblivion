import React, {useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight, BookOpen, Check, ChevronRight, Clock3, GitBranch, Plus, Save, X, Pencil, CalendarDays, Layers3} from 'lucide-react';
import {newEntry, useContent} from './content-store';
import {buildPeriodForest, createsPeriodCycle} from './storia-periods.js';
import './storia-timeline.css';
import {openContribution} from './ContributionCenter.jsx';
import PlayerNotes from './PlayerNotes.jsx';

// Le voci enciclopediche non sono avvenimenti: nessuna data viene dedotta dalla lore.
// I record timeline.show creati dall'editor GM sono gli unici eventi della cronologia.
const LORE_AREAS={
 'testimonianze-antiche':'Antichità', 'cimeli-artefatti':'Antichità',
 'anomalie-cronologiche':'Antichità', 'origine-poteri':'Origini dei poteri',
 'era-dei-poteri':'Era dei Poteri'
};
const GROUP_ORDER=['Antichità','Origini dei poteri','Era dei Poteri','Altri approfondimenti'];
const BUILTIN_PERIODS=[{id:'era-dei-poteri',title:'Era dei Poteri',builtin:true,parentPeriodId:''},{id:'periodo-antichita',title:'Antichità',builtin:true,parentPeriodId:''}];
const saneOrder=value=>Math.max(0,Math.min(9999,Math.trunc(Number(value)||0)));
const saneRank=value=>Math.max(0,Math.min(9999,Math.trunc(Number(value)||0)));
const parseYear=value=>value===''||value==null?null:Number.isInteger(Number(value))&&Math.abs(Number(value))<=999999?Number(value):null;
const yearText=year=>year==null?'Data non specificata':year<0?`${Math.abs(year)} a.C.`:`Anno ${year}`;
const cleanLinks=(value,ids,self)=>String(value||'').split(',').map(x=>x.trim()).filter((id,i,a)=>id!==self&&ids.has(id)&&a.indexOf(id)===i).slice(0,12);
const historyInfo=page=>page.timeline||{};
const byYearAndOrder=(a,b)=>{
 const ma=historyInfo(a),mb=historyInfo(b),ya=parseYear(ma.year),yb=parseYear(mb.year);
 return (ya==null?1:0)-(yb==null?1:0)||(ya??0)-(yb??0)||saneOrder(ma.sequence??ma.rank)-saneOrder(mb.sequence??mb.rank)||a.title.localeCompare(b.title,'it');
};

function groupEvents(events,yearMarkers=[]){
 const groups=new Map();
 const ensure=year=>{const key=year==null?'undated':`year-${year}`;if(!groups.has(key))groups.set(key,{key,year,events:[],yearMarkers:[]});return groups.get(key);};
 for(const page of yearMarkers)ensure(parseYear(historyInfo(page).year)).yearMarkers.push(page);
 for(const page of [...events].sort(byYearAndOrder))ensure(parseYear(historyInfo(page).year)).events.push(page);
 return [...groups.values()].sort((a,b)=>(a.year==null?1:0)-(b.year==null?1:0)||(a.year??0)-(b.year??0));
}

export default function StoriaTimeline({pages,editControl}){
 const {gm,contributor,seeded,saveDraft,publish}=useContent();
 const canEdit=gm&&seeded;
 const [edit,setEdit]=useState(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const timelinePages=useMemo(()=>pages.filter(p=>p.kind==='page'&&p.timeline?.show===true),[pages]);
 const periodPages=useMemo(()=>timelinePages.filter(p=>p.timeline?.type==='period'),[timelinePages]);
 const yearPages=useMemo(()=>timelinePages.filter(p=>p.timeline?.type==='year'),[timelinePages]);
 const events=useMemo(()=>timelinePages.filter(p=>!['period','year'].includes(p.timeline?.type)),[timelinePages]);
 const periodOptions=useMemo(()=>[
  ...BUILTIN_PERIODS,
  ...periodPages.filter(p=>!BUILTIN_PERIODS.some(b=>b.id===p.id)).map(p=>({id:p.id,title:p.timeline.label||p.title,builtin:false,rank:saneRank(p.timeline.rank),startYear:parseYear(p.timeline.startYear),endYear:parseYear(p.timeline.endYear),parentPeriodId:p.timeline.parentPeriodId||''}))
 ],[periodPages]);
 const loreGroups=useMemo(()=>{
  const groups=new Map();
  const lore=pages.filter(p=>p.kind==='page'&&p.parentId==='storia-passato'&&!p.timeline?.show);
  for(const page of lore){const group=page.loreCategory||LORE_AREAS[page.id]||'Altri approfondimenti';if(!groups.has(group))groups.set(group,[]);groups.get(group).push(page);}
  return [...groups].sort(([a],[b])=>(GROUP_ORDER.includes(a)?GROUP_ORDER.indexOf(a):GROUP_ORDER.length)-(GROUP_ORDER.includes(b)?GROUP_ORDER.indexOf(b):GROUP_ORDER.length)||a.localeCompare(b,'it')).map(([name,items])=>({name,items:items.sort((a,b)=>(a.order||0)-(b.order||0)||a.title.localeCompare(b.title,'it'))}));
 },[pages]);
 const eventById=useMemo(()=>new Map(events.map(p=>[p.id,p])),[events]);
 const periodBlocks=useMemo(()=>buildPeriodForest(periodOptions,events,yearPages),[periodOptions,events,yearPages]);
 const total=events.length;
 function openEvent(page){const m=page?.timeline||{};setEdit({mode:'event',id:page?.id||'',title:page?.title||'',description:page?.description||'',label:m.label||page?.title||'',periodId:m.periodId||'',year:m.year==null?'':String(m.year),sequence:String(m.sequence??m.rank??0),from:(m.from||[]).join(', ')});setError('');setMessage('');}
 function openYear(page){const m=page?.timeline||{};setEdit({mode:'year',id:page?.id||'',title:page?.title||'',description:page?.description||'',periodId:m.periodId||'',year:m.year==null?'':String(m.year)});setError('');setMessage('');}
 function openPeriod(page,parentId=''){const m=page?.timeline||{};setEdit({mode:'period',id:page?.id||'',title:page?.title||'',description:page?.description||'',label:m.label||page?.title||'',parentPeriodId:m.parentPeriodId||parentId||'',startYear:m.startYear==null?'':String(m.startYear),endYear:m.endYear==null?'':String(m.endYear),rank:String(m.rank??10)});setError('');setMessage('');}
 function close(){setEdit(null);setError('');}
 async function save(publishNow=false){
  if(!canEdit||!edit||busy)return;
  const title=edit.title.trim()||(edit.mode==='year'&&parseYear(edit.year)!=null?yearText(parseYear(edit.year)):'');if(!title){setError('Inserisci il titolo.');return;}
  const inputYear=edit.mode==='period'?edit.startYear:edit.year;
  if(inputYear!==''&&parseYear(inputYear)==null){setError('L’anno deve essere un numero intero (negativo per gli anni a.C.).');return;}
  if(edit.mode==='year'&&edit.year===''){setError('Per inserire un anno nella cronologia indica un valore.');return;}
  if(edit.mode==='year'&&yearPages.some(p=>p.id!==edit.id&&p.timeline?.periodId===(edit.periodId||'')&&parseYear(p.timeline?.year)===parseYear(edit.year))){setError('Questo anno è già presente nel periodo scelto.');return;}
  if(edit.mode==='period'&&edit.endYear!==''&&parseYear(edit.endYear)==null){setError('L’anno finale deve essere un numero intero.');return;}
  if(edit.mode==='period'&&edit.startYear!==''&&edit.endYear!==''&&Number(edit.endYear)<Number(edit.startYear)){setError('La fine del periodo non può precedere l’inizio.');return;}
  if(edit.mode==='period'&&edit.parentPeriodId&&!periodOptions.some(p=>p.id===edit.parentPeriodId)){setError('Il periodo contenitore non esiste più.');return;}
  if(edit.mode==='period'&&edit.parentPeriodId&&createsPeriodCycle(edit.id,edit.parentPeriodId,periodOptions)){setError('Un periodo non può contenere sé stesso o un proprio antenato.');return;}
  if(edit.mode!=='period'&&edit.periodId&& !periodOptions.some(p=>p.id===edit.periodId)){setError('Il periodo selezionato non esiste più.');return;}
  setBusy(true);setError('');
  try{
   const original=edit.id?pages.find(p=>p.id===edit.id):newEntry('page',title,'storia-passato');
   if(!original)throw Error('Voce storica non trovata.');
   const timeline=edit.mode==='period'
    ?{show:true,type:'period',label:edit.label.trim()||title,parentPeriodId:edit.parentPeriodId||'',startYear:parseYear(edit.startYear),endYear:parseYear(edit.endYear),rank:saneRank(edit.rank)}
    :edit.mode==='year'?{show:true,type:'year',periodId:edit.periodId||'',year:parseYear(edit.year)}
    :{show:true,type:'event',label:edit.label.trim()||title,periodId:edit.periodId||'',year:parseYear(edit.year),sequence:saneOrder(edit.sequence),from:cleanLinks(edit.from,new Set(events.map(p=>p.id)),original.id)};
   const record={...original,title,parentId:'storia-passato',description:edit.description??original.description??'',timeline};
   if(publishNow)await publish(record);else await saveDraft(record);
   setMessage(publishNow?'Voce pubblicata.':'Bozza salvata.');setEdit(null);
  }catch(e){setError(e.message||'Salvataggio non riuscito.');}finally{setBusy(false);}
 }
 const renderEvents=(grouped,periodId='')=>grouped.map(group=><div className="storia-year-group" key={group.key}>
  <div className="storia-year-axis"><CalendarDays size={16}/><span>{yearText(group.year)}</span><small>{group.events.length} {group.events.length===1?'evento':'eventi'}</small>{canEdit&&group.yearMarkers.length>0&&<button type="button" className="storia-year-add" onClick={()=>openYear(group.yearMarkers[0])} title="Modifica anno"><Pencil size={14}/></button>}{canEdit&&<button type="button" className="storia-year-add" onClick={()=>openEvent({timeline:{year:group.year,periodId,sequence:Math.max(-1,...group.events.map(p=>saneOrder(p.timeline?.sequence??p.timeline?.rank)))+1}})} title={`Aggiungi evento in ${yearText(group.year)}`}><Plus size={14}/></button>}</div>
  <div className="storia-year-events">{group.events.map(page=>{
   const m=historyInfo(page),refs=(m.from||[]).map(id=>eventById.get(id)).filter(Boolean);
   return <article className="storia-event-card" key={page.id}>
    <div className="storia-event-meta"><span>ORDINE {String(saneOrder(m.sequence??m.rank)+1).padStart(2,'0')}</span>{canEdit&&<button type="button" onClick={()=>openEvent(page)}><Pencil size={13}/> Modifica</button>}</div>
    <Link to={`/pagina/${page.id}`} className="storia-event-link"><strong>{m.label||page.title}</strong><ArrowUpRight size={16}/></Link>
    {page.description&&<p>{page.description}</p>}
    {refs.length>0&&<div className="storia-event-relations"><GitBranch size={13}/><span>Collegamenti:</span>{refs.map(ref=><Link key={ref.id} to={`/pagina/${ref.id}`}>{ref.timeline?.label||ref.title}</Link>)}</div>}
   </article>;
  })}</div>
 </div>);
 const renderPeriod=(period,depth=0)=><section className={`storia-period ${depth?'storia-period-nested':''}`} style={{'--period-depth':Math.min(depth,4)}} key={period.id}>
  <header className="storia-period-heading"><div><span className="eyebrow">{depth?'SOTTOPERIODO':'PERIODO STORICO'}</span><h3>{period.title}</h3><small>{period.startYear!=null?yearText(period.startYear):'Data iniziale non indicata'}{period.endYear!=null?` — ${yearText(period.endYear)}`:''}</small></div>
   {canEdit&&<div className="storia-period-controls"><button type="button" onClick={()=>openPeriod(null,period.id)} title={`Crea un sottoperiodo in ${period.title}`}><Layers3 size={14}/> Sottoperiodo</button><button type="button" onClick={()=>openEvent({timeline:{periodId:period.id}})} title={`Aggiungi evento in ${period.title}`}><Plus size={14}/> Evento</button>{!period.builtin&&<button type="button" onClick={()=>openPeriod(pages.find(p=>p.id===period.id))} title={`Modifica il periodo ${period.title}`}><Pencil size={14}/> Modifica</button>}</div>}
  </header>
  {(period.events.length>0||period.yearMarkers.length>0)&&renderEvents(groupEvents(period.events,period.yearMarkers),period.id)}
  {period.children.length>0&&<div className="storia-period-children">{period.children.map(child=>renderPeriod(child,depth+1))}</div>}
  {!period.events.length&&!period.yearMarkers.length&&!period.children.length&&<div className="storia-period-empty">Nessun evento ancora associato. {canEdit&&<button type="button" onClick={()=>openPeriod(null,period.id)}><Layers3 size={14}/> Aggiungi sottoperiodo</button>}</div>}
 </section>;
 return <div className="storia-workspace">
  <header className="storia-workspace-header">
   <div className="storia-workspace-title"><div className="storia-workspace-breadcrumb"><Link to="/">Home</Link><ChevronRight size={13}/>Storia e Passato</div><div><span className="eyebrow">ARCHIVIO STORICO · COMPENDIO</span><h1>Storia e Passato</h1><p>Cronologia documentata e approfondimenti sull’ambientazione.</p></div></div>
   <div className="storia-workspace-actions">{editControl}{canEdit&&<><button type="button" className="storia-add storia-add-secondary" onClick={()=>openYear()}><CalendarDays size={16}/> Nuovo anno</button><button type="button" className="storia-add storia-add-secondary" onClick={()=>openPeriod()}><Layers3 size={16}/> Nuovo periodo</button><button type="button" className="storia-add" onClick={()=>openEvent()}><Plus size={16}/> Nuovo evento</button></>}{!gm&&contributor&&<button type="button" className="storia-add" onClick={()=>openContribution({parentId:'storia-passato',event:true})}><Plus size={16}/> Proponi evento</button>}</div>
  </header>
  {message&&<p className="storia-confirm" role="status"><Check size={15}/>{message}</p>}
  <div className="storia-workspace-layout">
   <section className="storia-events" aria-label="Avvenimenti storici">
    <div className="storia-column-head"><Clock3 size={19}/><div><span className="eyebrow">CRONOLOGIA</span><h2>Avvenimenti storici</h2></div><span className="storia-count">{total}</span></div>
    <p className="storia-column-intro">Solo eventi inseriti come tali. Gli eventi dello stesso anno sono ordinati nel relativo gruppo. I periodi possono contenere altri periodi anche quando non hanno date.</p>
    <div className="storia-chronology">
     {periodBlocks.periods.map(period=>renderPeriod(period))}
     {(periodBlocks.unassigned.length>0||periodBlocks.unassignedYears.length>0)&&<section className="storia-period storia-period-ungrouped"><header className="storia-period-heading"><div><span className="eyebrow">CRONOLOGIA GENERALE</span><h3>Altri avvenimenti</h3></div></header>{renderEvents(groupEvents(periodBlocks.unassigned,periodBlocks.unassignedYears))}</section>}
     {!total&&!yearPages.length&&!periodBlocks.periods.length&&<div className="storia-empty"><CalendarDays size={22}/><strong>Nessun evento storico registrato</strong><p>Le pagine di lore sono raccolte a destra. Il GM può aggiungere qui eventi, assegnare anni e creare periodi come l’Era dei Poteri, senza attribuire date non documentate.</p>{canEdit&&<button type="button" className="storia-add" onClick={()=>openEvent()}><Plus size={15}/> Inserisci il primo evento</button>}</div>}
    </div>
   </section>
   <section className="storia-lore" aria-label="Lore e ambientazione">
    <div className="storia-column-head"><BookOpen size={19}/><div><span className="eyebrow">ARCHIVIO ENCICLOPEDICO</span><h2>Lore e Ambientazione</h2></div></div>
    <p className="storia-column-intro">Fonti, ricerche e ricostruzioni. Sono distinte dagli avvenimenti effettivamente inseriti nella cronologia.</p>
    {(gm||contributor)&&<button type="button" className="storia-lore-add" onClick={()=>openContribution({parentId:'storia-passato',historical:true})}><Plus size={16}/>{gm?'Nuovo approfondimento':'Proponi approfondimento'}</button>}
    <div className="storia-lore-groups">{loreGroups.map((group,i)=><section className="storia-lore-group" key={group.name}><div className="storia-lore-group-heading"><small>{String(i+1).padStart(2,'0')} / AMBITO</small><h3>{group.name}</h3></div><div className="storia-lore-cards">{group.items.map(page=><Link to={`/pagina/${page.id}`} key={page.id} className="storia-lore-card"><span><strong>{page.title}</strong><small>{page.description||'Approfondimento dell’ambientazione'}</small></span><ArrowUpRight size={16}/></Link>)}</div></section>)}</div>
    {!loreGroups.length&&<p className="storia-empty">Non sono ancora disponibili approfondimenti storici.</p>}
    <PlayerNotes entryId="storia-passato"/>
   </section>
  </div>
  {edit&&<div className="storia-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)close()}}><form className="storia-modal" onSubmit={e=>{e.preventDefault();save(false)}} role="dialog" aria-modal="true" aria-label={edit.mode==='period'?'Editor periodo storico':edit.mode==='year'?'Editor anno storico':'Editor evento storico'}>
   <div className="storia-modal-top"><div><span className="eyebrow">EDITOR GM · STORIA</span><h2>{edit.mode==='period'?(edit.id?'Modifica periodo':'Nuovo periodo'):edit.mode==='year'?(edit.id?'Modifica anno':'Nuovo anno'):(edit.id?'Modifica evento':'Nuovo evento')}</h2></div><button type="button" onClick={close} aria-label="Chiudi"><X size={19}/></button></div>
   <label>Titolo della pagina<input required={edit.mode!=='year'} value={edit.title} onChange={e=>setEdit(v=>({...v,title:e.target.value}))}/></label>
   {edit.mode!=='year'&&<label>Nome visualizzato<input value={edit.label} onChange={e=>setEdit(v=>({...v,label:e.target.value}))}/></label>}
   <label>Descrizione breve<textarea rows={2} value={edit.description||''} onChange={e=>setEdit(v=>({...v,description:e.target.value}))} placeholder="Una breve descrizione del contenuto…"/></label>
   {edit.mode==='year'?<><label>Anno<input type="number" required value={edit.year} onChange={e=>setEdit(v=>({...v,year:e.target.value}))} placeholder="Per esempio 2024 o -500"/></label><label>Periodo storico<select value={edit.periodId} onChange={e=>setEdit(v=>({...v,periodId:e.target.value}))}><option value="">Cronologia generale</option>{periodOptions.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><p>Il nuovo anno compare nella linea temporale anche senza eventi. Puoi aggiungerne più di uno allo stesso periodo.</p></>
    :edit.mode==='period'?<><label>Periodo contenitore (facoltativo)<select value={edit.parentPeriodId||''} onChange={e=>setEdit(v=>({...v,parentPeriodId:e.target.value}))}><option value="">Nessuno — periodo principale</option>{periodOptions.filter(p=>p.id!==edit.id&&!createsPeriodCycle(edit.id,p.id,periodOptions)).map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><div className="storia-modal-grid"><label>Anno iniziale (facoltativo)<input type="number" value={edit.startYear} onChange={e=>setEdit(v=>({...v,startYear:e.target.value}))} placeholder="Sconosciuto"/></label><label>Anno finale (facoltativo)<input type="number" value={edit.endYear} onChange={e=>setEdit(v=>({...v,endYear:e.target.value}))} placeholder="Sconosciuto"/></label></div><label>Ordine relativo dei periodi senza data<input type="number" min="0" max="9999" value={edit.rank} onChange={e=>setEdit(v=>({...v,rank:e.target.value}))}/></label><p>Per gli anni prima dell’era comune usa numeri negativi. Puoi annidare periodi senza inserire alcun anno; puoi anche inserire eventi direttamente nel periodo. L’ordine relativo regola i periodi privi di date.</p></>
    :<><label>Periodo storico<select value={edit.periodId} onChange={e=>setEdit(v=>({...v,periodId:e.target.value}))}><option value="">Nessun periodo — cronologia generale</option>{periodOptions.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><div className="storia-modal-grid"><label>Anno (facoltativo)<input type="number" value={edit.year} onChange={e=>setEdit(v=>({...v,year:e.target.value}))} placeholder="Data non nota"/></label><label>Ordine dentro l’anno / periodo<input type="number" min="0" max="9999" value={edit.sequence} onChange={e=>setEdit(v=>({...v,sequence:e.target.value}))}/></label></div><p>Più eventi possono condividere lo stesso anno o periodo. Usa «Ordine» per stabilirne la posizione; una data non indicata rimane sconosciuta.</p><label>Collegamenti a eventi (ID separati da virgole)<input value={edit.from} onChange={e=>setEdit(v=>({...v,from:e.target.value}))} placeholder="ID di altri eventi…"/></label>{events.length>0&&<p>ID disponibili: {events.map(p=>p.id).join(' · ')}</p>}</>}
   {error&&<p className="storia-error" role="alert">{error}</p>}
   <div className="storia-modal-actions"><button type="button" onClick={close} disabled={busy}>Annulla</button><button type="submit" disabled={busy}><Save size={15}/> Salva bozza</button><button type="button" className="storia-publish" onClick={()=>save(true)} disabled={busy}><Check size={15}/> Pubblica</button></div>
  </form></div>}
 </div>;
}
