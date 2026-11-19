// Funzioni pure condivise dal pannello Note e dai controlli automatici.
export const NOTES_MAX_TITLE=100;
export const NOTES_MAX_BODY=12000;
export const NOTES_MAX_GROUP=80;
export const NOTES_MAX_NAME=48;

export function validDisplayName(value) {
  const name=String(value||'').trim().replace(/\s+/g,' ');
  if(name.length<2||name.length>NOTES_MAX_NAME)throw Error(`La firma deve contenere da 2 a ${NOTES_MAX_NAME} caratteri.`);
  if(/[<>\u0000-\u001f]/.test(name))throw Error('La firma contiene caratteri non ammessi.');
  return name;
}
export function validNoteInput({title='',body=''}){
  const cleanTitle=String(title||'').trim();
  const html=String(body||'').trim();
  if(cleanTitle.length>NOTES_MAX_TITLE)throw Error('Il titolo della nota è troppo lungo.');
  const readable=html.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').trim();
  if(!readable&&!/<img\b/i.test(html))throw Error('Scrivi il contenuto della nota.');
  if(html.length>NOTES_MAX_BODY)throw Error('La nota supera il limite di 12.000 caratteri.');
  return {title:cleanTitle,body:html};
}
export const secondsOf = note => note?.createdAt?.seconds ?? note?.createdAt?.toMillis?.()/1000 ?? 0;
export function newestFirst(items){return [...items].sort((a,b)=>secondsOf(b)-secondsOf(a)||String(b.id).localeCompare(String(a.id)));}
export function threadRoots(notes){const ids=new Set(notes.map(n=>n.id));return newestFirst(notes.filter(n=>!n.parentId||!ids.has(n.parentId)));}
export function repliesTo(notes,id){return [...notes.filter(n=>n.parentId===id)].sort((a,b)=>secondsOf(a)-secondsOf(b)||String(a.id).localeCompare(String(b.id)));}
export function dateLabel(note){const date=note?.createdAt?.toDate?.();return date?new Intl.DateTimeFormat('it-IT',{dateStyle:'long'}).format(date):'Data in aggiornamento';}
