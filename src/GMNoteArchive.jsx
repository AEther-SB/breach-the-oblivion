import React,{useEffect,useMemo,useState} from 'react';
import {collection,doc,onSnapshot,updateDoc,serverTimestamp} from 'firebase/firestore';
import {useContent,notesDatabase} from './content-store.jsx';
import {RichEditor} from './editor.jsx';
import {sanitizeHtml} from './sanitize.js';
import {dateLabel,newestFirst,validNoteInput,NOTES_MAX_GROUP} from './player-notes-data.js';
import {discussionIds,filterNotes,noteState} from './note-moderation.js';
import {deleteSingleNote,deleteNoteDiscussion,deleteWithdrawnNotes,renameNoteGroup,removeNoteGroup,editModeratedNote} from './note-moderation-store.js';
import './note-moderation.css';
const STATES={visible:'Visibile',hidden:'Nascosta',withdrawn:'Ritirata'};
const FILTERS={entryId:'',authorId:'',state:'all',from:'',to:'',text:'',groupId:''};
const PAGE_SIZE=30;
function EditNote({note,groups,busy,onSave,onCancel}){
 const [form,setForm]=useState(()=>({title:note.title||'',body:note.body||'',groupId:groups.some(g=>g.id===note.groupId)?note.groupId:''}));
 const [error,setError]=useState('');
 return <form className="pn-composer gm-note-editor" onSubmit={async e=>{e.preventDefault();try{setError('');await onSave({...validNoteInput(form),groupId:note.parentId?'':form.groupId});}catch(e){setError(e.message);}}}>
  <label>Titolo<input maxLength={100} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></label>
  {!note.parentId&&<label>Raccolta dell’autore<select value={form.groupId} onChange={e=>setForm(f=>({...f,groupId:e.target.value}))}><option value="">Nessuna</option>{groups.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select></label>}
  <RichEditor label="Contenuto" value={form.body} onChange={body=>setForm(f=>({...f,body}))} targets={[]} currentId=""/>
  <small>La firma originale rimane invariata. La nota sarà contrassegnata come modificata dal GM.</small>
  {error&&<p role="alert" className="pn-error">{error}</p>}<div className="gm-note-actions"><button type="button" onClick={onCancel} disabled={busy}>Annulla</button><button className="gm-primary" type="submit" disabled={busy}>Salva modifica</button></div>
 </form>;
}
export default function GMNoteArchive(){
 const {gm,configured,publishedEntries,registeredUsers}=useContent();
 const [notes,setNotes]=useState([]),[groups,setGroups]=useState([]),[names,setNames]=useState({});
 const [ready,setReady]=useState(false),[groupsReady,setGroupsReady]=useState(false),[readError,setReadError]=useState('');
 const [filters,setFilters]=useState(FILTERS),[limit,setLimit]=useState(PAGE_SIZE),[tab,setTab]=useState('notes');
 const [edit,setEdit]=useState(''),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState(''),[error,setError]=useState('');
 useEffect(()=>{setReady(false);setGroupsReady(false);setNotes([]);setGroups([]);setReadError('');if(!gm||!configured)return;
  const db=notesDatabase(),onError=e=>{setReadError(e.message);setReady(false);};
  const offNotes=onSnapshot(collection(db,'pageNotes'),{includeMetadataChanges:true},s=>{setNotes(s.docs.map(d=>({...d.data(),id:d.id})));setReady(!s.metadata.fromCache);},onError);
  const offGroups=onSnapshot(collection(db,'noteGroups'),{includeMetadataChanges:true},s=>{setGroups(s.docs.map(d=>({...d.data(),id:d.id})));setGroupsReady(!s.metadata.fromCache);},onError);
  return()=>{offNotes();offGroups();};
 },[gm,configured]);
 const authorKey=useMemo(()=>[...new Set([...notes,...groups].map(n=>n.authorId).filter(Boolean))].sort().join('|'),[notes,groups]);
 useEffect(()=>{setNames({});if(!gm||!configured||!authorKey)return;const off=authorKey.split('|').map(uid=>onSnapshot(doc(notesDatabase(),'noteProfiles',uid),s=>setNames(n=>({...n,[uid]:s.exists()?s.data().displayName:''})),()=>{}));return()=>off.forEach(f=>f());},[gm,configured,authorKey]);
 const pageNames=useMemo(()=>Object.fromEntries(publishedEntries.map(e=>[e.id,e.title])),[publishedEntries]);
 const pageLabel=id=>pageNames[id]||`${id} (pagina non pubblicata)`;
 const authorLabel=id=>names[id]||notes.find(n=>n.authorId===id)?.authorName||registeredUsers?.find(u=>u.id===id)?.displayName||id;
 const authorIds=authorKey?authorKey.split('|').sort((a,b)=>authorLabel(a).localeCompare(authorLabel(b),'it')):[];
 const pageIds=[...new Set([...notes,...groups].map(n=>n.entryId))].sort((a,b)=>pageLabel(a).localeCompare(pageLabel(b),'it'));
 const filtered=useMemo(()=>newestFirst(filterNotes(notes,filters,pageNames,names)),[notes,filters,pageNames,names]);
 const retired=filtered.filter(n=>n.deleted===true);
 const visibleGroups=groups.filter(g=>(!filters.entryId||g.entryId===filters.entryId)&&(!filters.authorId||g.authorId===filters.authorId)).sort((a,b)=>a.title.localeCompare(b.title,'it'));
 function patch(k,v){setFilters(f=>({...f,[k]:v,...(k==='entryId'||k==='authorId'?{groupId:''}:{})}));setLimit(PAGE_SIZE);}
 async function run(fn){if(!gm||busy||!ready||!groupsReady||readError)throw Error('Archivio non disponibile: attendi la sincronizzazione.');setBusy(true);setError('');setFeedback('');try{const result=await fn();setFeedback(result||'Operazione completata.');}catch(e){setError(`${e.message||'Operazione non riuscita.'} Verifica l’archivio: una cancellazione multipla potrebbe essere riuscita solo in parte.`);throw e;}finally{setBusy(false);}}
 const act=fn=>run(fn).catch(()=>{});
 function deleteOne(note){if(!window.confirm('Eliminare definitivamente questa nota? Le risposte verranno mantenute come discussioni autonome.'))return;act(async()=>{await deleteSingleNote(notesDatabase(),note);return 'Nota eliminata definitivamente.';});}
 function deleteThread(note){const count=discussionIds(notes.filter(n=>n.entryId===note.entryId),note.id).length;if(!window.confirm(`Eliminare definitivamente questa nota e tutte le sue risposte (${count} elementi attualmente noti)? L’operazione è irreversibile.`))return;act(async()=>`${await deleteNoteDiscussion(notesDatabase(),note)} note e risposte eliminate.`);}
 function purge(){if(!retired.length||!window.confirm(`Eliminare definitivamente ${retired.length} note ritirate corrispondenti ai filtri attuali? Le risposte attive saranno conservate.`))return;act(async()=>`${await deleteWithdrawnNotes(notesDatabase(),retired)} note ritirate eliminate.`);}
 function toggleHidden(note){if(!note.hidden&&!window.confirm('Nascondere la nota ai lettori? Le sue risposte visibili rimarranno consultabili.'))return;act(async()=>{await updateDoc(doc(notesDatabase(),'pageNotes',note.id),{hidden:!note.hidden,updatedAt:serverTimestamp()});return note.hidden?'Nota ripristinata.':'Nota nascosta.';});}
 function rename(group){const title=window.prompt('Nuovo nome della raccolta',group.title)?.trim();if(title==null||!title||title===group.title)return;if(title.length>NOTES_MAX_GROUP){setError('Il nome può avere al massimo 80 caratteri.');return;}act(async()=>{await renameNoteGroup(notesDatabase(),group,title);return 'Raccolta rinominata.';});}
 function remove(group){if(!window.confirm(`Eliminare la raccolta «${group.title}» senza cancellare le note che contiene?`))return;act(async()=>{await removeNoteGroup(notesDatabase(),group);if(filters.groupId===group.id)patch('groupId','');return 'Raccolta eliminata; note conservate.';});}
 if(!gm)return null;
 const disabled=busy||!ready||!groupsReady||Boolean(readError);
 return <section className="gm-note-archive">
  <p className="contrib-hint">Archivio riservato al GM. Le note nascoste non sono accessibili ai lettori. Le eliminazioni definitive non possono essere annullate.</p>
  <div className="contrib-tabs" role="tablist" aria-label="Archivio appunti"><button type="button" role="tab" aria-selected={tab==='notes'} onClick={()=>setTab('notes')}>Note e discussioni ({notes.length})</button><button type="button" role="tab" aria-selected={tab==='groups'} onClick={()=>setTab('groups')}>Raccolte ({groups.length})</button></div>
  <div className="gm-note-filters">
   <label>Pagina<select value={filters.entryId} onChange={e=>patch('entryId',e.target.value)}><option value="">Tutte le pagine</option>{pageIds.map(id=><option key={id} value={id}>{pageLabel(id)}</option>)}</select></label>
   <label>Autore<select value={filters.authorId} onChange={e=>patch('authorId',e.target.value)}><option value="">Tutti gli autori</option>{authorIds.map(id=><option key={id} value={id}>{authorLabel(id)} ({id.slice(0,6)})</option>)}</select></label>
   {tab==='notes'&&<><label>Stato<select value={filters.state} onChange={e=>patch('state',e.target.value)}><option value="all">Tutti</option>{Object.entries(STATES).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>Raccolta<select value={filters.groupId} onChange={e=>patch('groupId',e.target.value)}><option value="">Tutte</option>{visibleGroups.map(g=><option key={g.id} value={g.id}>{g.title} · {authorLabel(g.authorId)}</option>)}</select></label>
   <label>Dal<input type="date" value={filters.from} onChange={e=>patch('from',e.target.value)}/></label><label>Al<input type="date" value={filters.to} onChange={e=>patch('to',e.target.value)}/></label><label className="gm-note-search">Cerca<input type="search" placeholder="Titolo, testo, firma o pagina" value={filters.text} onChange={e=>patch('text',e.target.value)}/></label></>}
   <button type="button" onClick={()=>{setFilters(FILTERS);setLimit(PAGE_SIZE);}}>Azzera filtri</button>
  </div>
  {readError&&<p role="alert" className="contrib-error">Errore di lettura: {readError}. Controlla le regole Firestore e riapri l’archivio.</p>}
  {!readError&&(!ready||!groupsReady)&&<p role="status">Sincronizzazione con Firestore…</p>}
  {tab==='notes'?<><div className="gm-note-summary"><span>{filtered.length} risultati · {retired.length} ritirate</span><button type="button" className="gm-note-danger" disabled={disabled||!retired.length} onClick={purge}>Elimina le ritirate filtrate ({retired.length})</button></div>
   {filtered.length===0&&ready&&<p className="contrib-hint">Nessuna nota corrispondente.</p>}
   {filtered.slice(0,limit).map(note=><article key={note.id} className="gm-note-record">
    <div className="gm-note-record-head"><div><small>{pageLabel(note.entryId)} · {dateLabel(note)}{note.parentId?' · Risposta':''}</small><strong>{note.title||(note.deleted?'Nota ritirata':'Nota senza titolo')}</strong><small>{authorLabel(note.authorId)} · {note.authorId.slice(0,8)}{note.moderatedAt?' · Modificata dal GM':''}</small></div><span className="contrib-role">{STATES[noteState(note)]}</span></div>
    {!note.deleted&&<div className="pn-rich-body gm-note-preview" dangerouslySetInnerHTML={{__html:sanitizeHtml(note.body||'')}}/>}
    {edit===note.id&&!note.deleted&&<EditNote key={note.id} note={note} groups={groups.filter(g=>g.authorId===note.authorId&&g.entryId===note.entryId)} busy={disabled} onCancel={()=>setEdit('')} onSave={values=>run(async()=>{await editModeratedNote(notesDatabase(),note,values);setEdit('');return 'Nota aggiornata dal GM.';})}/>}
    <div className="gm-note-actions">{!note.deleted&&<><button type="button" disabled={disabled} onClick={()=>setEdit(edit===note.id?'':note.id)}>Modifica</button><button type="button" disabled={disabled} onClick={()=>toggleHidden(note)}>{note.hidden?'Ripristina':'Nascondi'}</button></>}<button type="button" className="gm-note-danger" disabled={disabled} onClick={()=>deleteOne(note)}>Elimina nota</button><button type="button" className="gm-note-danger" disabled={disabled} onClick={()=>deleteThread(note)}>Elimina discussione</button></div>
   </article>)}{filtered.length>limit&&<button type="button" onClick={()=>setLimit(l=>l+PAGE_SIZE)}>Mostra altre note ({filtered.length-limit})</button>}
  </>:<>{!visibleGroups.length&&groupsReady&&<p className="contrib-hint">Nessuna raccolta corrispondente.</p>}{visibleGroups.map(g=><article key={g.id} className="gm-note-record"><div className="gm-note-record-head"><div><strong>{g.title}</strong><small>{authorLabel(g.authorId)} · {pageLabel(g.entryId)} · {notes.filter(n=>n.groupId===g.id).length} note</small></div></div><div className="gm-note-actions"><button type="button" disabled={disabled} onClick={()=>rename(g)}>Rinomina</button><button type="button" disabled={disabled} onClick={()=>{setFilters({...FILTERS,entryId:g.entryId,authorId:g.authorId,groupId:g.id});setTab('notes');setLimit(PAGE_SIZE);}}>Mostra note</button><button type="button" disabled={disabled} className="gm-note-danger" onClick={()=>remove(g)}>Elimina raccolta</button></div></article>)}</>}
  {busy&&<p role="status">Operazione in corso…</p>}{feedback&&<p role="status" className="contrib-status">{feedback}</p>}{error&&<p role="alert" className="contrib-error">{error}</p>}
 </section>;
}
