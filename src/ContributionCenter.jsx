import React, {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useNavigate} from 'react-router-dom';
import {BookOpen,Check,ClipboardList,Eye,FilePlus2,LogIn,Plus,ShieldCheck,UserRound, X} from 'lucide-react';
import {useContent,newEntry} from './content-store.jsx';
import {BlocksComposer,GenericBlocks,useTargets} from './editor.jsx';
import {applyTemplate,templatesForKind} from './templates.js';
import {validatedImageUrl} from './sanitize.js';
import './contributions.css';

const CATEGORIES=['Antichità','Origini dei poteri','Era dei Poteri','Altri approfondimenti'];
const empty=()=>({type:'rich',id:`testo-${Math.random().toString(36).slice(2)}`,html:'<p></p>'});
const duplicate=v=>JSON.parse(JSON.stringify(v));
export const openContribution=(args={})=>window.dispatchEvent(new CustomEvent('bto:contribution',{detail:args}));
export function ProposalAction({entry,children}){
 const {gm,contributor,seeded}=useContent();
 if(!seeded||!contributor||gm||entry?.kind!=='page')return null;
 return <button type="button" className="gm-edit-trigger" onClick={()=>openContribution({entry})}><FilePlus2 size={14}/>{children||'Proponi una modifica'}</button>;
}
function ProposalComposer({initial,save,onClose,busy,error,gm,editingProposal=false}){
 const {pages}=useContent();const targets=useTargets();
 const [template,setTemplate]=useState('blank');
 const [form,setForm]=useState(()=>initial?.entry?duplicate(initial.entry):initial?.target?duplicate(initial.target):applyTemplate(newEntry('page','','storia-passato'),'blank'));
 const [preview,setPreview]=useState(true);
 const patch=(key,value)=>setForm(old=>({...old,[key]:value}));
 const existing=Boolean(initial?.target||(initial?.entry&&initial?.targetId));
 useEffect(()=>{if(initial?.historical && !existing){setForm(v=>({...v,parentId:'storia-passato',loreCategory:'Altri approfondimenti'}));}},[]);
 const isHistory=form.parentId==='storia-passato';
 const [isEvent,setIsEvent]=useState(Boolean(form.timeline?.show&&form.timeline?.type==='event')||Boolean(initial?.event));
 const [year,setYear]=useState(form.timeline?.year==null?'':String(form.timeline.year));
 const [period,setPeriod]=useState(form.timeline?.periodId||'');
 const [order,setOrder]=useState(String(form.timeline?.sequence||0));
 const availablePeriods=[{id:'era-dei-poteri',title:'Era dei Poteri'},{id:'periodo-antichita',title:'Antichità'},...pages.filter(p=>p.timeline?.show&&p.timeline?.type==='period'&&!['era-dei-poteri','periodo-antichita'].includes(p.id))];
 function submit(e, publishNow=false){
  e.preventDefault();
  if(!form.title.trim())return;
  if(isEvent&&year!==''&&(!Number.isInteger(Number(year))||Math.abs(Number(year))>999999))return;
  const result={...form,title:form.title.trim(),description:String(form.description||''),kind:'page',blocks:form.blocks||[]};
  if(isEvent){result.parentId='storia-passato';result.timeline={show:true,type:'event',label:result.title,year:year===''?null:Number(year),periodId:period,sequence:Number(order)||0};}
  else if(!existing)delete result.timeline;
  save(result,publishNow);
 }
 return <div className="contrib-workspace"><form className="contrib-form" onSubmit={submit}>
  <p className="contrib-hint">{editingProposal?'Il GM può correggere la proposta prima di approvarla.':gm?'Puoi salvare una bozza o pubblicare direttamente.':'La pagina non sarà visibile finché il GM non l’avrà approvata.'}</p>
  <label className="gm-input"><span>Titolo</span><input required maxLength="160" value={form.title||''} onChange={e=>patch('title',e.target.value)}/></label>
  <label className="gm-input"><span>Descrizione breve</span><textarea rows="2" maxLength="700" value={form.description||''} onChange={e=>patch('description',e.target.value)}/></label>
  {!existing&&<><label className="gm-input"><span>Tipo di scheda</span><select value={template} onChange={e=>{const t=e.target.value;setTemplate(t);setForm(v=>({...applyTemplate(newEntry('page',v.title,v.parentId),'blank'),...applyTemplate(newEntry('page',v.title,v.parentId),t),title:v.title,description:v.description,parentId:v.parentId,loreCategory:v.loreCategory}));}}>{templatesForKind('page').map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></label>
  <label className="gm-input"><span>Raccolta di destinazione</span><select value={form.parentId||'storia-passato'} onChange={e=>patch('parentId',e.target.value)}>{pages.filter(p=>['chapter','collection'].includes(p.kind)&&p.id!=='atlas-geografico').map(p=><option value={p.id} key={p.id}>{p.title}</option>)}</select></label></>}
  <div className="contrib-two"><label className="gm-input"><span>Ritratto o immagine · URL HTTPS (facoltativo)</span><input value={form.imageUrl||''} onChange={e=>patch('imageUrl',e.target.value)} placeholder="https://…"/></label><label className="gm-input"><span>Posizione immagine</span><select value={form.imagePlacement||'body'} onChange={e=>patch('imagePlacement',e.target.value)}><option value="body">Nel testo</option><option value="sidebar">Intestazione sinistra · ritratto</option></select></label></div>
  {isHistory&&<><label className="gm-input"><span>Tipologia storica</span><select value={isEvent?'event':'lore'} onChange={e=>setIsEvent(e.target.value==='event')}><option value="lore">Approfondimento · Archivio a destra</option><option value="event">Evento · Cronologia a sinistra</option></select></label>
  {!isEvent?<><label className="gm-input"><span>Ambito della lore</span><select value={CATEGORIES.includes(form.loreCategory)?form.loreCategory:'custom'} onChange={e=>patch('loreCategory',e.target.value==='custom'?'':e.target.value)}>{CATEGORIES.map(v=><option value={v} key={v}>{v}</option>)}<option value="custom">Nuovo ambito…</option></select></label>{!CATEGORIES.includes(form.loreCategory)&&<label className="gm-input"><span>Nome del nuovo ambito</span><input value={form.loreCategory||''} maxLength={60} onChange={e=>patch('loreCategory',e.target.value)} placeholder="Per esempio: Guerre e conflitti"/></label>}</>:<div className="contrib-two"><label className="gm-input"><span>Anno (facoltativo, negativo per a.C.)</span><input type="number" value={year} onChange={e=>setYear(e.target.value)}/></label><label className="gm-input"><span>Periodo</span><select value={period} onChange={e=>setPeriod(e.target.value)}><option value="">Cronologia generale</option>{availablePeriods.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><label className="gm-input"><span>Ordine nell’anno</span><input min="0" type="number" value={order} onChange={e=>setOrder(e.target.value)}/></label></div>}</>}
  <div className="contrib-note"><strong>Testo visivo</strong> · Seleziona il testo e usa la barra per grassetto, corsivo, link, immagini ed elenchi. La formattazione appare direttamente mentre scrivi.</div>
  <BlocksComposer blocks={form.blocks||[]} onChange={blocks=>patch('blocks',blocks)} targets={targets} currentId={form.id}/>
  <div className="contrib-actions"><button type="button" className="gm-secondary" onClick={()=>setPreview(!preview)}><Eye size={15}/>{preview?'Nascondi':'Mostra'} anteprima</button><button type="button" className="gm-secondary" onClick={onClose}>Annulla</button><button type="submit" disabled={busy}>{editingProposal?'Aggiorna revisione':gm?'Salva bozza':'Invia al GM'}</button>{gm&&!editingProposal&&<button type="button" className="gm-primary" disabled={busy} onClick={e=>submit(e,true)}>Pubblica</button>}</div>
  {error&&<p role="alert" className="contrib-error">{error}</p>}
 </form>{preview&&<aside className="contrib-preview"><span className="eyebrow">ANTEPRIMA · NON PUBBLICATA</span><h2>{form.title||'Titolo della pagina'}</h2><p>{form.description}</p>{form.imagePlacement==='sidebar'&&validatedImageUrl(form.imageUrl)&&<figure className="contrib-portrait"><img src={validatedImageUrl(form.imageUrl)} alt={form.imageAlt||form.title} loading="lazy"/></figure>}<GenericBlocks entry={{...form,imageUrl:form.imagePlacement==='sidebar'?'':form.imageUrl}}/></aside>}</div>;
}
export default function ContributionCenter(){
 const {configured,user,gm,contributor,seeded,login,submissions,pages,publishedEntries,saveDraft,publish,submitProposal,decideProposal,setContributorEnabled}=useContent();
 const [panel,setPanel]=useState(''),[initial,setInitial]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[uid,setUid]=useState(''),[selected,setSelected]=useState(null);
 const navigate=useNavigate();
 const pending=submissions.filter(s=>s.status==='pending');
 const byDate=useMemo(()=>[...submissions].sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)),[submissions]);
 function openComposer(args={}){setInitial({target:args.entry||null,entry:args.proposal?.entry||null,targetId:args.proposal?.targetId||'',historical:args.historical||args.parentId==='storia-passato',event:args.event||false});setError('');setPanel(args.proposal?'review-edit':'compose');if(args.parentId&&!args.entry&&!args.proposal){setInitial(v=>({...v,entry:{...applyTemplate(newEntry('page','',args.parentId),'blank'),loreCategory:args.loreCategory||'Altri approfondimenti'}}));}}
 useEffect(()=>{const handler=e=>{if((gm||contributor)&&seeded)openComposer(e.detail||{});else if(!user){setError('Accedi con Google per richiedere l’autorizzazione a contribuire.');setPanel('status');}else{setError('Chiedi al GM di abilitare il tuo UID come Collaboratore.');setPanel('status');}};window.addEventListener('bto:contribution',handler);return()=>window.removeEventListener('bto:contribution',handler);},[gm,contributor,seeded,user?.uid]);
 async function run(action){setBusy(true);setError('');try{await action();}catch(e){setError(e.message||'Operazione non riuscita.');}finally{setBusy(false);}}
 async function submit(entry,publishNow){await run(async()=>{if(panel==='review-edit'&&selected){await decideProposal(selected,'approved',entry);setMessage('Proposta corretta e approvata.');setSelected(null);setPanel('list');return;}if(gm){if(publishNow)await publish(entry);else await saveDraft(entry);setPanel('');if(publishNow)navigate(`/pagina/${entry.id}`);setMessage(publishNow?'Pagina pubblicata.':'Bozza GM salvata.');}else{await submitProposal(entry,initial?.target?.id||initial?.targetId||'');setPanel('list');setMessage('Proposta inviata al GM per la revisione.');}});}
 async function review(proposal,decision){if(decision==='approved'&&!window.confirm(`Approvare e PUBBLICARE «${proposal.entry?.title}»? ${proposal.targetId?'La pagina esistente sarà sostituita dalla proposta.':''}`))return;await run(async()=>{await decideProposal(proposal,decision);setSelected(null);setMessage(decision==='approved'?'Proposta pubblicata.':'Proposta respinta.');});}
 if(!configured)return null;
 return <><button type="button" className="contrib-header-trigger" onClick={()=>{setPanel('list');setError('');}} title="Collaborazioni e proposte"><ClipboardList size={16}/><span className="contrib-header-label">{gm?'Revisioni':contributor?'Contributi':'Collaborazioni'}</span>{gm&&pending.length>0&&<b>{pending.length}</b>}</button>
 {panel&&createPortal(<div className="contrib-overlay" onMouseDown={e=>e.target===e.currentTarget&&setPanel('')}><section className="contrib-dialog" role="dialog" aria-modal="true" aria-label="Contributi al compendio"><header className="contrib-dialog-head"><div><span className="eyebrow">COMPENDIO · CONTRIBUTI</span><h2>{panel==='compose'?'Nuova proposta':panel==='review-edit'?'Correggi e approva':gm?'Revisione GM':'Le mie proposte'}</h2></div><button type="button" className="icon-button" onClick={()=>{setPanel('');setSelected(null);}} aria-label="Chiudi"><X size={20}/></button></header>
 {panel==='compose'||panel==='review-edit'?<ProposalComposer key={initial?.target?.id||initial?.entry?.id||'new'} initial={initial} save={submit} onClose={()=>setPanel('list')} busy={busy} error={error} gm={gm} editingProposal={panel==='review-edit'}/>:panel==='review-view'?null:<div className="contrib-list">
 {user?<><p className="contrib-hint">{gm?'Solo il GM può pubblicare o respingere. Le proposte dei player non sono mai visibili nella wiki pubblica.':contributor?'Puoi inviare pagine, eventi, personaggi e modifiche; il GM decide cosa pubblicare.':'Il tuo account non è ancora abilitato come Collaboratore.'}</p><p className="contrib-user">{user.email} · UID: <button type="button" onClick={()=>navigator.clipboard?.writeText(user.uid)}>Copia {user.uid}</button></p></>:<><p className="contrib-hint">Accedi con Google. Il GM abiliterà il tuo UID come Collaboratore.</p><button type="button" className="gm-primary" onClick={()=>run(login)}><LogIn size={15}/> Accedi</button></>}
 {(gm||contributor)&&seeded&&<button type="button" className="gm-primary" onClick={()=>openComposer()}><Plus size={15}/> Nuova voce / evento</button>}
 {gm&&<div className="contrib-access"><strong><ShieldCheck size={15}/> Abilita o revoca un Collaboratore</strong><p>Fatti inviare l’UID Firebase dall’utente, poi abilitalo qui. Non conferisce privilegi GM.</p><input aria-label="UID del player" placeholder="UID Firebase del player" value={uid} onChange={e=>setUid(e.target.value.trim())}/><div><button disabled={busy} type="button" onClick={()=>run(async()=>{await setContributorEnabled(uid,true);setMessage('Player abilitato.');})}>Abilita</button><button disabled={busy} type="button" onClick={()=>run(async()=>{await setContributorEnabled(uid,false);setMessage('Accesso revocato.');})}>Revoca</button></div></div>}
 {(gm||contributor)&&<><h3>{gm?'Proposte da revisionare':'Proposte inviate'}</h3>{byDate.length===0?<p className="contrib-hint">Nessuna proposta presente.</p>:byDate.map(proposal=><article key={proposal.id} className="contrib-item"><div><small>{proposal.status==='pending'?'IN ATTESA':proposal.status==='approved'?'APPROVATA':'RESPINTA'} · {proposal.authorName}</small><strong>{proposal.entry?.title||'Senza titolo'}</strong><p>{proposal.entry?.description||'Nessuna descrizione'}</p>{proposal.targetId&&<small>Modifica proposta a una pagina esistente</small>}</div>{gm&&proposal.status==='pending'&&<div className="contrib-item-actions"><button type="button" onClick={()=>{setSelected(proposal);setPanel('review-view');}}>Esamina</button><button type="button" disabled={busy} onClick={()=>review(proposal,'rejected')}>Respingi</button></div>}</article>)}</>}
 </div>}
 {panel==='review-view'&&selected&&<div className="contrib-review"><p>Proposta di {selected.authorName}. La pubblicazione di modifiche a una voce esistente sostituisce il suo contenuto: verifica prima il confronto.</p>{selected.targetId&&<p>Destinazione: {publishedEntries.find(p=>p.id===selected.targetId)?.title||selected.targetId}</p>}<div className="contrib-compare">
 {selected.targetId&&publishedEntries.some(p=>p.id===selected.targetId)&&<section><span className="eyebrow">VERSIONE ATTUALMENTE PUBBLICATA</span><h3>{publishedEntries.find(p=>p.id===selected.targetId)?.title}</h3><p>{publishedEntries.find(p=>p.id===selected.targetId)?.description}</p><GenericBlocks entry={publishedEntries.find(p=>p.id===selected.targetId)}/></section>}
 <section><span className="eyebrow">VERSIONE PROPOSTA</span><h3>{selected.entry.title}</h3><p>{selected.entry.description}</p><GenericBlocks entry={selected.entry}/></section></div><div className="contrib-actions"><button type="button" onClick={()=>setPanel('list')}>Indietro</button><button type="button" onClick={()=>openComposer({proposal:selected})}>Correggi prima di approvare</button><button type="button" disabled={busy} onClick={()=>review(selected,'rejected')}>Respingi</button><button type="button" className="gm-primary" disabled={busy} onClick={()=>review(selected,'approved')}>Approva e pubblica</button></div></div>}
 {message&&<p role="status" className="contrib-status">{message}</p>}{error&&<p role="alert" className="contrib-error">{error}</p>}
 </section></div>,document.body)}
 </>;
}
