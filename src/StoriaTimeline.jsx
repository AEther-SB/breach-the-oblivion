import React, {useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight, Check, GitBranch, Plus, Save, X, History, Pencil} from 'lucide-react';
import {newEntry, useContent} from './content-store';
import './storia-timeline.css';

// I rami distinguono filoni di ricerca; non postulano una cronologia inventata.
// Solo le relazioni riportate esplicitamente nel materiale hanno un arco iniziale.
const BASE={
 'testimonianze-antiche':{period:'Antichità',label:'Testimonianze e culti',rank:0,lane:'testimonianze',from:[]},
 'cimeli-artefatti':{period:'Antichità',label:'Cimeli e artefatti',rank:0,lane:'reperti',from:[]},
 'anomalie-cronologiche':{period:'Antichità',label:'Anomalie cronologiche',rank:1,lane:'reperti',from:['cimeli-artefatti']},
 'origine-poteri':{period:'Origini dei poteri',label:'Primi Quirk',rank:2,lane:'poteri',from:['anomalie-cronologiche']},
 'era-dei-poteri':{period:'Era moderna',label:'Era dei Poteri',rank:3,lane:'poteri',from:['origine-poteri']},
};
const LANES=[['testimonianze','Testimonianze'],['reperti','Reperti e anomalie'],['poteri','Evoluzione dei poteri']];
const LANE_X={testimonianze:22,reperti:408,poteri:793};
const WIDTH=300, STEP=172, TOP=107;
const sanitizeRank=n=>Math.min(100,Math.max(0,Number.isFinite(Number(n))?Math.floor(Number(n)):0));
const cleanLinks=(value,ids,self)=>String(value||'').split(',').map(x=>x.trim()).filter((id,i,a)=>id!==self&&ids.has(id)&&a.indexOf(id)===i).slice(0,12);
const dataOf=page=>({...BASE[page.id],...(page.timeline||{}),rank:sanitizeRank(page.timeline?.rank??BASE[page.id]?.rank??10),lane:LANES.some(([id])=>id===page.timeline?.lane)?page.timeline.lane:(BASE[page.id]?.lane||'testimonianze')});

export default function StoriaTimeline({pages}){
 const {gm,seeded,saveDraft,publish}=useContent();
 const [edit,setEdit]=useState(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const entries=useMemo(()=>pages.filter(p=>p.parentId==='storia-passato'&&p.kind==='page' || p.timeline?.show===true).sort((a,b)=>dataOf(a).rank-dataOf(b).rank||a.title.localeCompare(b.title,'it')),[pages]);
 const nodes=entries.map(p=>({entry:p,meta:dataOf(p),x:LANE_X[dataOf(p).lane],y:TOP+dataOf(p).rank*STEP}));
 const byId=new Map(nodes.map(n=>[n.entry.id,n]));
 const maxRank=Math.max(3,...nodes.map(n=>n.meta.rank));
 const height=TOP+maxRank*STEP+172;
 const canEdit=gm&&seeded;
 function editEvent(page){const meta=dataOf(page);setEdit({id:page.id,title:page.title,period:meta.period||'',label:meta.label||page.title,rank:meta.rank,lane:meta.lane,from:(meta.from||[]).join(', '),show:true});setError('');}
 function addEvent(){setEdit({id:'',title:'',period:'',label:'',rank:maxRank+1,lane:'testimonianze',from:'',show:true});setError('');}
 function cancel(){setEdit(null);setError('');}
 async function save(publishNow=false){
  if(!canEdit||!edit||busy)return;
  const title=edit.title.trim();if(!title){setError('Inserisci il titolo dell’evento.');return;}
  const rank=sanitizeRank(edit.rank);
  const ids=new Set(nodes.map(n=>n.entry.id));
  setBusy(true);setError('');
  try{
   const original=edit.id?pages.find(p=>p.id===edit.id):newEntry('page',title,'storia-passato');
   if(!original)throw Error('Voce storica non trovata.');
   const entry={...original,title,description:original.description||'',parentId:original.parentId||'storia-passato',timeline:{show:true,label:edit.label.trim()||title,period:edit.period.trim()||'Periodo non definito',rank,lane:edit.lane,from:cleanLinks(edit.from,ids,original.id)}};
   if(publishNow)await publish(entry);else await saveDraft(entry);
   setMessage(publishNow?'Evento pubblicato e inserito nell’albero.':'Evento salvato come bozza.');setEdit(null);
  }catch(e){setError(e.message||'Salvataggio non riuscito.');}finally{setBusy(false);}
 }
 return <section className="storia-tree" aria-label="Albero degli eventi storici">
  <div className="storia-tree-heading"><div><span className="eyebrow">ARCHIVIO CRONOLOGICO</span><h2>Trame della storia</h2><p>Esplora i filoni storici e le loro diramazioni. I collegamenti tratteggiati indicano ricostruzioni o ipotesi, non fatti accertati. Le date non disponibili non vengono inventate.</p></div>{canEdit&&<button type="button" className="storia-add" onClick={addEvent}><Plus size={16}/> Nuovo evento</button>}</div>
  {message&&<p className="storia-confirm"><Check size={15}/>{message}</p>}
  <div className="storia-scroll" tabIndex={0} aria-label="Scorri orizzontalmente per vedere le diramazioni">
   <div className="storia-canvas" style={{height}}>
    <div className="storia-lanes">{LANES.map(([id,label])=><span key={id} style={{left:LANE_X[id]}}><GitBranch size={15}/>{label}</span>)}</div>
    <svg className="storia-wires" width="1125" height={height} viewBox={`0 0 1125 ${height}`} aria-hidden="true">
      {nodes.flatMap(node=>(node.meta.from||[]).map(srcId=>{
        const src=byId.get(srcId);if(!src)return null;
        const x1=src.x+WIDTH/2,y1=src.y+118,x2=node.x+WIDTH/2,y2=node.y-6;
        const midY=y1+(y2-y1)/2;
        return <path key={`${srcId}-${node.entry.id}`} d={`M${x1} ${y1} C${x1} ${midY},${x2} ${midY},${x2} ${y2}`} className="storia-wire"/>;
      }))}
      {LANES.map(([id])=><line key={id} className="storia-guide" x1={LANE_X[id]+WIDTH/2} y1="54" x2={LANE_X[id]+WIDTH/2} y2={height-40}/>)}
    </svg>
    {nodes.map((node,i)=><div className="storia-node" key={node.entry.id} style={{left:node.x,top:node.y,width:WIDTH}}>
      <div className="storia-node-index"><span>{String(i+1).padStart(2,'0')}</span><span>{node.meta.period||'Epoca non definita'}</span></div>
      <Link to={`/pagina/${node.entry.id}`} className="storia-node-link"><strong>{node.meta.label||node.entry.title}</strong><small>{node.entry.description||'Apri la scheda dell’evento'}</small><ArrowUpRight size={16}/></Link>
      {canEdit&&<button type="button" className="storia-node-edit" onClick={()=>editEvent(node.entry)} title={`Modifica collocazione di ${node.entry.title}`}><Pencil size={14}/> Modifica ramo</button>}
    </div>)}
   </div>
  </div>
  <p className="storia-help"><History size={14}/> Seleziona un evento per leggerne la scheda. Come GM, puoi aggiungere eventi, assegnare rami e collegare i predecessori indicando i loro ID.</p>
  {edit&&<div className="storia-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)cancel()}}><form className="storia-modal" onSubmit={e=>{e.preventDefault();save(false)}}>
   <div className="storia-modal-top"><div><span className="eyebrow">EDITOR GM · STORIA</span><h2>{edit.id?'Modifica evento':'Nuovo evento storico'}</h2></div><button type="button" onClick={cancel} aria-label="Chiudi"><X size={19}/></button></div>
   <label>Titolo della pagina<input required value={edit.title} onChange={e=>setEdit(v=>({...v,title:e.target.value}))}/></label>
   <label>Etichetta breve sulla mappa<input value={edit.label} onChange={e=>setEdit(v=>({...v,label:e.target.value}))}/></label>
   <label>Periodo (testo libero, anche senza data)<input value={edit.period} onChange={e=>setEdit(v=>({...v,period:e.target.value}))} placeholder="Per es. Antichità, XX secolo, data sconosciuta…"/></label>
   <div className="storia-modal-row"><label>Ramo<select value={edit.lane} onChange={e=>setEdit(v=>({...v,lane:e.target.value}))}>{LANES.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>Posizione nella sequenza<input type="number" min="0" max="100" step="1" value={edit.rank} onChange={e=>setEdit(v=>({...v,rank:e.target.value}))}/></label></div>
   <label>Predecessori / collegamenti (separati da virgole)<input value={edit.from} onChange={e=>setEdit(v=>({...v,from:e.target.value}))} placeholder="ID delle voci, per esempio cimeli-artefatti"/></label>
   <p>Disponibili: {entries.map(p=>p.id).join(' · ')}. Gli archi rappresentano relazioni proposte; descrivi nella pagina quali sono certe e quali ipotetiche.</p>
   {error&&<p className="storia-error" role="alert">{error}</p>}
   <div className="storia-modal-actions"><button type="button" onClick={cancel} disabled={busy}>Annulla</button><button type="submit" disabled={busy}><Save size={15}/> Salva bozza</button><button type="button" className="storia-publish" onClick={()=>save(true)} disabled={busy}><Check size={15}/> Pubblica</button></div>
  </form></div>}
 </section>;
}
