import {collection,doc,getDocsFromServer,query,where,writeBatch,deleteDoc,updateDoc,serverTimestamp,runTransaction} from 'firebase/firestore';
import {discussionIds} from './note-moderation.js';
const rows=snap=>snap.docs.map(d=>({...d.data(),id:d.id}));
const pageRows=(db,entryId)=>getDocsFromServer(query(collection(db,'pageNotes'),where('entryId','==',entryId))).then(rows);
export async function deleteSingleNote(db,note){await deleteDoc(doc(db,'pageNotes',note.id));}
export async function deleteNoteDiscussion(db,note){
 // Root-first, then re-read from server to catch replies added before their parent was deleted.
 let known=[note.id],count=0;
 for(let pass=0;pass<30;pass++){
  const all=await pageRows(db,note.entryId);
  known=discussionIds(all,note.id,known);
  const existing=new Set(all.map(n=>n.id));
  const pending=known.filter(id=>existing.has(id));
  if(!pending.length)return count;
  for(let i=0;i<pending.length;i+=400){const batch=writeBatch(db),part=pending.slice(i,i+400);for(const id of part)batch.delete(doc(db,'pageNotes',id));await batch.commit();count+=part.length;}
 }
 throw Error('Pulizia parziale: sono ancora presenti risposte. Aggiorna l’archivio e riprova.');
}
export async function deleteWithdrawnNotes(db,notes){
 // The confirmed snapshot is the scope. Withdrawn notes cannot be restored by players.
 const ids=[...new Set(notes.filter(n=>n.deleted===true).map(n=>n.id))];
 let count=0;
 for(let i=0;i<ids.length;i+=400){const batch=writeBatch(db),part=ids.slice(i,i+400);for(const id of part)batch.delete(doc(db,'pageNotes',id));await batch.commit();count+=part.length;}
 return count;
}
export async function renameNoteGroup(db,group,title){await updateDoc(doc(db,'noteGroups',group.id),{title,updatedAt:serverTimestamp()});}
export async function removeNoteGroup(db,group){
 // Remove the collection only; notes remain intact. Clear orphan group pointers.
 await deleteDoc(doc(db,'noteGroups',group.id));
 const all=rows(await getDocsFromServer(query(collection(db,'pageNotes'),where('groupId','==',group.id))));
 // Do not overwrite a concurrent move to a different collection.
 for(const note of all){await runTransaction(db,async tx=>{const ref=doc(db,'pageNotes',note.id),snap=await tx.get(ref);if(snap.exists()&&snap.data().groupId===group.id)tx.update(ref,{groupId:'',updatedAt:serverTimestamp()});});}
}

export async function editModeratedNote(db,note,values){
 const ref=doc(db,'pageNotes',note.id);
 await runTransaction(db,async tx=>{
  const snap=await tx.get(ref);
  if(!snap.exists()||snap.data().deleted)throw Error('La nota è stata ritirata o eliminata.');
  const current=snap.data();
  if(values.groupId && values.groupId!==current.groupId){
   const group=await tx.get(doc(db,'noteGroups',values.groupId));
   if(current.parentId||!group.exists()||group.data().authorId!==current.authorId||group.data().entryId!==current.entryId)throw Error('La raccolta non è più disponibile.');
  }
  tx.update(ref,{title:values.title,body:values.body,groupId:current.parentId?'':values.groupId||'',moderatedAt:serverTimestamp(),updatedAt:serverTimestamp()});
 });
}
