import React,{useEffect,useMemo,useState} from 'react';
import { collection,doc,addDoc,setDoc,updateDoc,onSnapshot,query,where,serverTimestamp } from 'firebase/firestore';
import { BookOpenText, Check, Edit3, FolderPlus, LogIn, MessageCircle, Plus, Reply, Send, ShieldAlert, Trash2, UserRound, X } from 'lucide-react';
import {useContent,notesDatabase} from './content-store.jsx';
import {RichEditor} from './editor.jsx';
import {sanitizeHtml} from './sanitize.js';
import {validDisplayName,validNoteInput,NOTES_MAX_GROUP,newestFirst,threadRoots,repliesTo,dateLabel} from './player-notes-data.js';
import './player-notes.css';
import {deleteSingleNote,deleteNoteDiscussion,editModeratedNote} from './note-moderation-store.js';
import {discussionIds} from './note-moderation.js';
import './note-moderation.css';

const hasWriteRole=(user,gm,contributor)=>Boolean(user&&(gm||contributor));
const empty=()=>({title:'',body:'<p></p>',groupId:''});
function Composer({caption,initial={},groups=[],reply=false,busy=false,onCancel,onSave}){
 const [form,setForm]=useState(()=>({...empty(),...initial}));
 const [error,setError]=useState('');
 async function submit(e){e.preventDefault();setError('');try{const values=validNoteInput(form);await onSave({...values,groupId:reply?'':form.groupId||''});}catch(ex){setError(ex.message);}}
 return <form className="pn-composer" onSubmit={submit}>
  <div className="pn-composer-label"><span>{caption}</span><button type="button" onClick={onCancel} aria-label="Chiudi editor"><X size={16}/></button></div>
  <div className="pn-composer-row"><label><span>Titolo (facoltativo)</span><input maxLength="100" value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value}))} placeholder={reply?'Re: approfondimento':'Per esempio: interpretazioni e indizi'}/></label>
  {!reply&&<label><span>Raccolta personale</span><select value={form.groupId} onChange={e=>setForm(v=>({...v,groupId:e.target.value}))}><option value="">Nessuna raccolta</option>{groups.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select></label>}</div>
  <div className="pn-rich-editor"><RichEditor value={form.body} onChange={body=>setForm(v=>({...v,body}))} label="Contenuto della nota" targets={[]} currentId=""/></div>
  <div className="pn-composer-footer"><span>{initial.hidden?'La nota rimarrà nascosta.':'La nota sarà pubblica.'} La formattazione è visibile durante la scrittura.</span><div><button type="button" onClick={onCancel}>Annulla</button><button className="pn-primary" disabled={busy} type="submit"><Send size={14}/>{busy?'Salvataggio…':'Salva nota'}</button></div></div>
  {error&&<p className="pn-error" role="alert">{error}</p>}
 </form>;
}
function DisplayNameForm({user,current,onSave,busy,onClose}){
 const [value,setValue]=useState(current||user.displayName||'');const [error,setError]=useState('');
 return <form className="pn-profile-editor" onSubmit={async e=>{e.preventDefault();try{setError('');await onSave(validDisplayName(value));onClose();}catch(ex){setError(ex.message);}}}>
  <label><span>La tua firma pubblica</span><input value={value} maxLength="48" onChange={e=>setValue(e.target.value)} placeholder="Nome del personaggio o del giocatore" autoFocus/></label><p>La firma compare accanto alle tue note, anche quelle precedenti. Puoi modificarla quando vuoi; non è necessario usare il tuo nome reale.</p>
  <div className="pn-actions"><button type="button" onClick={onClose}>Annulla</button><button className="pn-primary" type="submit" disabled={busy}><Check size={14}/> Salva firma</button></div>{error&&<p role="alert" className="pn-error">{error}</p>}
 </form>;
}
function NoteCard({note,notes,groups,profileNames,user,gm,contributor,canWrite,openEditor,onEdit,onReply,onDelete,onHide,onUnhide,onPurge,onPurgeThread,busy,depth=0,ancestors=[]}){
 if(ancestors.includes(note.id)||depth>16)return null;
 const owned=Boolean(user&&note.authorId===user.uid),removed=note.deleted===true,hidden=note.hidden===true;
 const children=repliesTo(notes,note.id);
 const group=groups.find(g=>g.id===note.groupId);
 return <article className={`pn-note ${depth?'pn-reply':''} ${removed||hidden?'pn-removed':''}`} style={{'--pn-depth':Math.min(depth,3)}}>
  <div className="pn-note-top"><span className="pn-avatar"><UserRound size={16}/></span><div className="pn-author"><strong>{profileNames[note.authorId]||note.authorName||'Collaboratore'}</strong><time dateTime={note.createdAt?.toDate?.()?.toISOString?.()}>{dateLabel(note)}{note.updatedAt?.seconds&&note.createdAt?.seconds&&note.updatedAt.seconds>note.createdAt.seconds+3?' · modificata':''}{note.moderatedAt?' · modificata dal GM':''}</time></div>{group&&!depth&&<span className="pn-group-badge">{group.title}</span>}{(removed||hidden)&&<span className="pn-removed-label">{hidden?'Moderata':'Ritirata'}</span>}</div>
  {!removed&&(!hidden||gm)&&<><div className="pn-note-text">{note.title&&<h4>{note.title}</h4>}<div className="pn-rich-body" dangerouslySetInnerHTML={{__html:sanitizeHtml(note.body||'')}}/></div>
   <div className="pn-note-actions">{canWrite&&!hidden&&<button type="button" onClick={()=>onReply(note)}><Reply size={14}/> Rispondi</button>}{canWrite&&owned&&!hidden&&<><button type="button" onClick={()=>onEdit(note)}><Edit3 size={14}/> Modifica</button><button type="button" onClick={()=>onDelete(note)}><Trash2 size={14}/> Ritira</button></>}{gm&&(!owned||hidden)&&<button type="button" onClick={()=>onEdit(note)}><Edit3 size={14}/> Modifica come GM</button>}{gm&&!hidden&&<button type="button" onClick={()=>onHide(note)}><ShieldAlert size={14}/> Nascondi</button>}</div></>}
  {hidden&&!removed&&gm&&<div className="pn-note-actions"><button type="button" onClick={()=>onUnhide(note)}><Check size={14}/> Ripristina visibilità</button></div>}
  {gm&&<div className="pn-note-actions"><button type="button" className="gm-note-danger" disabled={busy} onClick={()=>onPurge(note)}><Trash2 size={14}/> Elimina definitivamente</button><button type="button" className="gm-note-danger" disabled={busy} onClick={()=>onPurgeThread(note)}>Elimina discussione</button></div>}
  {canWrite&&openEditor?.id===note.id&&<Composer key={`${openEditor.mode}-${note.id}`} caption={openEditor.mode==='reply'?'Rispondi alla nota':owned?'Modifica la tua nota':'Modifica come GM'} reply={openEditor.mode==='reply'||Boolean(note.parentId)} initial={openEditor.mode==='edit'?note:{title:'',body:'<p></p>'}} groups={openEditor.mode==='edit'?groups.filter(g=>g.authorId===note.authorId):[]} busy={openEditor.busy} onCancel={openEditor.cancel} onSave={openEditor.save}/>}
  {children.length>0&&<div className="pn-children">{children.map(child=><NoteCard key={child.id} note={child} notes={notes} groups={groups} profileNames={profileNames} user={user} gm={gm} contributor={contributor} canWrite={canWrite} openEditor={openEditor} onEdit={onEdit} onReply={onReply} onDelete={onDelete} onHide={onHide} onUnhide={onUnhide} onPurge={onPurge} onPurgeThread={onPurgeThread} busy={busy} depth={depth+1} ancestors={[...ancestors,note.id]}/>)}</div>}
 </article>;
}
export default function PlayerNotes({entryId}){
 const {configured,user,gm,contributor,seeded,login,publishedEntries}=useContent();
 const canWrite=hasWriteRole(user,gm,contributor),published=publishedEntries.some(e=>e.id===entryId);
 const [rawNotes,setNotes]=useState([]),[groups,setGroups]=useState([]),[profileNames,setProfileNames]=useState({});
 const notes=useMemo(()=>gm?rawNotes:rawNotes.filter(n=>n.hidden===false),[rawNotes,gm]);
 const [ownProfile,setOwnProfile]=useState(''),[profileLoaded,setProfileLoaded]=useState(false),[showProfile,setShowProfile]=useState(false);
 const [openEditor,setOpenEditor]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [filter,setFilter]=useState('all'),[groupInput,setGroupInput]=useState(''),[groupPanel,setGroupPanel]=useState(false),[renameGroupId,setRenameGroupId]=useState(''),[renameGroupTitle,setRenameGroupTitle]=useState('');
 useEffect(()=>{setNotes([]);setGroups([]);setOpenEditor(null);setFilter('all');setError('');if(!configured||!entryId)return;
  const db=notesDatabase();
  const noteQuery=query(collection(db,'pageNotes'),where('entryId','==',entryId),...(gm?[]:[where('hidden','==',false)]));
  const unNotes=onSnapshot(noteQuery,snap=>setNotes(snap.docs.map(d=>({...d.data(),id:d.id}))),err=>{setNotes([]);setError('Impossibile leggere gli appunti: '+err.message);});
  const unGroups=onSnapshot(query(collection(db,'noteGroups'),where('entryId','==',entryId)),snap=>setGroups(snap.docs.map(d=>({id:d.id,...d.data()}))),err=>setError('Impossibile leggere le raccolte: '+err.message));
  return()=>{unNotes();unGroups();};
 },[configured,entryId,gm,user?.uid]);
 const authors=useMemo(()=>[...new Set(notes.map(n=>n.authorId).concat(user?.uid||[]))].filter(Boolean).sort().join('|'),[notes,user?.uid]);
 useEffect(()=>{setProfileNames({});if(!configured||!authors)return;const db=notesDatabase();const off=authors.split('|').map(uid=>onSnapshot(doc(db,'noteProfiles',uid),snap=>{setProfileNames(prev=>({...prev,[uid]:snap.exists()?snap.data().displayName:''}));},()=>{}));return()=>off.forEach(fn=>fn());},[configured,authors]);
 useEffect(()=>{setOwnProfile('');setProfileLoaded(false);if(!configured||!user?.uid)return;return onSnapshot(doc(notesDatabase(),'noteProfiles',user.uid),snap=>{setOwnProfile(snap.exists()?snap.data().displayName:'');setProfileLoaded(true);},err=>{setError(err.message);setProfileLoaded(true);});},[configured,user?.uid]);
 const ownGroups=groups.filter(g=>g.authorId===user?.uid).sort((a,b)=>a.title.localeCompare(b.title,'it'));
 const shownRoots=threadRoots(notes).filter(n=>filter==='all'||(filter==='mine'?n.authorId===user?.uid:n.groupId===filter));
 async function perform(action){setBusy(true);setError('');setNotice('');try{await action();}catch(err){setError(err.message||'Operazione non riuscita.');throw err;}finally{setBusy(false);}}
 async function saveName(name){if(!canWrite)throw Error('Il ruolo Collaboratore è necessario.');const ref=doc(notesDatabase(),'noteProfiles',user.uid);await perform(async()=>{if(ownProfile)await updateDoc(ref,{displayName:name,updatedAt:serverTimestamp()});else await setDoc(ref,{displayName:name,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});setOwnProfile(name);setNotice('Firma salvata.');});}
 async function createGroup(e){e.preventDefault();const title=groupInput.trim();if(!title||title.length>NOTES_MAX_GROUP){setError(`Il nome della raccolta deve avere da 1 a ${NOTES_MAX_GROUP} caratteri.`);return;}try{await perform(async()=>{await addDoc(collection(notesDatabase(),'noteGroups'),{entryId,authorId:user.uid,title,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});setGroupInput('');setGroupPanel(false);setNotice('Raccolta creata.');});}catch{}}
 async function updateGroup(group){const title=renameGroupTitle.trim();if(!title||title.length>NOTES_MAX_GROUP){setError('Nome della raccolta non valido.');return;}await perform(async()=>{await updateDoc(doc(notesDatabase(),'noteGroups',group.id),{title,updatedAt:serverTimestamp()});setRenameGroupId('');setRenameGroupTitle('');});}
 function compose(mode,note=null){if(!ownProfile&&!(gm&&mode==='edit')){setShowProfile(true);return;}setOpenEditor({mode,id:note?.id||'new',note});}
 async function saveNote(values){try{await perform(async()=>{
   const current=openEditor;
   if(!ownProfile&&!(gm&&current.mode==='edit'))throw Error('Scegli prima la firma pubblica.');
   if(current.mode==='edit'){
    if(gm)await editModeratedNote(notesDatabase(),current.note,{...values,groupId:current.note.parentId?'':values.groupId});
    else {if(current.note.authorId!==user.uid)throw Error('Puoi modificare soltanto le tue note.');
    await updateDoc(doc(notesDatabase(),'pageNotes',current.note.id),{...values,groupId:current.note.parentId?'':values.groupId,updatedAt:serverTimestamp()});}
   }else{
    await addDoc(collection(notesDatabase(),'pageNotes'),{entryId,authorId:user.uid,authorName:ownProfile,title:values.title,body:values.body,parentId:current.mode==='reply'?current.note.id:'',groupId:current.mode==='reply'?'':values.groupId,deleted:false,hidden:false,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
   }
   setOpenEditor(null);setNotice(current.mode==='reply'?'Risposta pubblicata.':'Nota salvata.');
  });}catch(err){throw err;}}
 async function deleteOwn(note){if(!window.confirm('Ritirare questa nota? Le risposte rimarranno visibili.'))return;try{await perform(async()=>{await updateDoc(doc(notesDatabase(),'pageNotes',note.id),{title:'',body:'',deleted:true,updatedAt:serverTimestamp()});setNotice('Nota ritirata.');});}catch{}}
 async function hideNote(note){if(!gm||!window.confirm('Nascondere questa nota dalla vista pubblica? Le risposte resteranno visibili.'))return;try{await perform(async()=>{await updateDoc(doc(notesDatabase(),'pageNotes',note.id),{hidden:true,updatedAt:serverTimestamp()});setNotice('Nota nascosta.');});}catch{}}
 async function unhideNote(note){if(!gm)return;try{await perform(async()=>{await updateDoc(doc(notesDatabase(),'pageNotes',note.id),{hidden:false,updatedAt:serverTimestamp()});setNotice('Nota nuovamente visibile.');});}catch{}}
 async function purgeNote(note){if(!gm||busy||!window.confirm('Eliminare definitivamente questa nota? Le risposte verranno mantenute.'))return;try{await perform(async()=>{await deleteSingleNote(notesDatabase(),note);setNotice('Nota eliminata definitivamente.');});}catch{}}
 async function purgeThread(note){if(!gm||busy)return;const count=discussionIds(notes,note.id).length;if(!window.confirm(`Eliminare definitivamente questa nota e tutte le risposte (${count} elementi attualmente noti)?`))return;try{await perform(async()=>{const count=await deleteNoteDiscussion(notesDatabase(),note);setNotice(`${count} note e risposte eliminate.`);});}catch{}}
 if(!configured)return null;
 let previousDate='';
 return <section className="pn-section" aria-label="Appunti dei giocatori" id="appunti-giocatori">
  <header className="pn-head"><div><span className="pn-kicker"><BookOpenText size={16}/> ARCHIVIO DEL TAVOLO</span><h2>Appunti dei giocatori</h2><p>Annotazioni, interpretazioni e discussioni dei partecipanti. Questi contenuti non sono parte della lore ufficiale.</p></div><span className="pn-counter">{threadRoots(notes).filter(n=>!n.deleted&&!n.hidden).length} note</span></header>
  <div className="pn-toolbar"><label className="pn-filter"><span>Mostra</span><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tutte · per data</option>{canWrite&&<option value="mine">Solo le mie</option>}{groups.map(g=><option key={g.id} value={g.id}>Raccolta: {g.title}</option>)}</select></label>
   {canWrite&&<div className="pn-toolbar-actions"><button type="button" onClick={()=>setShowProfile(true)}><UserRound size={15}/>{ownProfile||'Imposta firma'}</button><button type="button" onClick={()=>setGroupPanel(v=>!v)}><FolderPlus size={15}/> Raccolte</button><button type="button" className="pn-primary" disabled={!published||!seeded} onClick={()=>compose('new')}><Plus size={15}/> Nuova nota</button></div>}
  </div>
  {canWrite&&showProfile&&<DisplayNameForm key={ownProfile+'-'+user.uid} user={user} current={ownProfile} onSave={saveName} busy={busy} onClose={()=>setShowProfile(false)}/>}
  {canWrite&&groupPanel&&<div className="pn-group-manager"><h3>Le mie raccolte</h3><p>Servono a riunire più note della stessa pagina; possono essere rinominate in seguito.</p><form onSubmit={createGroup}><input maxLength="80" value={groupInput} onChange={e=>setGroupInput(e.target.value)} placeholder="Nome della nuova raccolta"/><button type="submit" disabled={busy}><FolderPlus size={14}/> Crea raccolta</button></form>{ownGroups.map(g=><div key={g.id} className="pn-group-item"><strong>{g.title}</strong><button type="button" onClick={()=>{setRenameGroupId(renameGroupId===g.id?'':g.id);setRenameGroupTitle(g.title);}}>Rinomina</button>{renameGroupId===g.id&&<form onSubmit={e=>{e.preventDefault();updateGroup(g).catch(()=>{});}}><input autoFocus maxLength="80" value={renameGroupTitle} onChange={e=>setRenameGroupTitle(e.target.value)}/><button type="submit" disabled={busy}>Conferma</button></form>}</div>)}</div>}
  {!user&&<p className="pn-gate"><LogIn size={17}/> Per aggiungere appunti, <button type="button" onClick={()=>login().catch(e=>setError(e.message))}>accedi con Google</button> e richiedi al GM il ruolo Collaboratore. Le note non nascoste sono pubbliche.</p>}
  {user&&!canWrite&&<p className="pn-gate">Puoi leggere gli appunti, ma per scriverne devi essere abilitato dal GM come Collaboratore.</p>}
  {canWrite&&!published&&<p className="pn-gate">Le note saranno disponibili quando questa pagina verrà pubblicata nel compendio.</p>}
  {canWrite&&published&&!ownProfile&&profileLoaded&&!showProfile&&<p className="pn-gate">Prima di pubblicare una nota, scegli la tua firma con il pulsante «Imposta firma».</p>}
  {canWrite&&openEditor?.mode==='new'&&<Composer key="new" caption="Nuova nota" groups={ownGroups} busy={busy} onCancel={()=>setOpenEditor(null)} onSave={saveNote}/>}
  <div className="pn-feed">{shownRoots.length===0?<div className="pn-empty"><MessageCircle size={24}/><strong>Ancora nessuna nota</strong><p>Gli appunti e le risposte compariranno qui in ordine di data.</p></div>:shownRoots.map(note=>{const label=dateLabel(note),showDate=label!==previousDate;previousDate=label;return <React.Fragment key={note.id}>{showDate&&<div className="pn-date-divider">{label}</div>}<NoteCard note={note} notes={notes} groups={groups} profileNames={profileNames} user={user} gm={gm} contributor={contributor} canWrite={canWrite} openEditor={openEditor?{...openEditor,busy,cancel:()=>setOpenEditor(null),save:saveNote}:null} onEdit={n=>compose('edit',n)} onReply={n=>compose('reply',n)} onDelete={deleteOwn} onHide={hideNote} onUnhide={unhideNote} onPurge={purgeNote} onPurgeThread={purgeThread} busy={busy}/></React.Fragment>;})}</div>
  {notice&&<p className="pn-notice" role="status">{notice}</p>}{error&&<p className="pn-error" role="alert">{error}</p>}
 </section>;
}
