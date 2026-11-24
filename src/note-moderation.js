// Pure helpers: never follow relationships across pages or mutate the source.
export function discussionIds(notes, rootId, previousIds = []) {
 const ids=new Set([rootId,...previousIds]);
 const byParent=new Map();
 for(const note of notes){if(!byParent.has(note.parentId))byParent.set(note.parentId,[]);byParent.get(note.parentId).push(note.id);}
 const queue=[...ids];
 for(let i=0;i<queue.length;i++)for(const child of byParent.get(queue[i])||[]){if(!ids.has(child)){ids.add(child);queue.push(child);}}
 return [...ids];
}
export function noteState(note){return note.deleted?'withdrawn':note.hidden?'hidden':'visible';}
export function filterNotes(notes,{entryId='',authorId='',state='all',from='',to='',text='',groupId=''}={},pages={},names={}){
 const q=text.trim().toLocaleLowerCase('it');
 const start=from?new Date(`${from}T00:00:00`).getTime():-Infinity;
 const end=to?new Date(`${to}T00:00:00`):null;
 if(end)end.setDate(end.getDate()+1);
 return notes.filter(n=>{
  const ms=n.createdAt?.toMillis?.()??(Number(n.createdAt?.seconds||0)*1000);
  if(entryId&&n.entryId!==entryId||authorId&&n.authorId!==authorId||groupId&&n.groupId!==groupId)return false;
  if(state!=='all'&&noteState(n)!==state)return false;
  if(ms<start||(end&&ms>=end.getTime()))return false;
  return !q||[n.title,String(n.body||'').replace(/<[^>]*>/g,' '),n.authorName,names[n.authorId],pages[n.entryId],n.entryId].join(' ').toLocaleLowerCase('it').includes(q);
 });
}
