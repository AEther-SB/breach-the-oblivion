import React, {useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {AlertTriangle,Check,Download,ShieldAlert,Trash2,X} from 'lucide-react';
import {useContent} from './content-store';
import legacyLore from './data/legacy-lore-v30.json';
import {parseJsonImport} from './import-utils';

const baseline=new Map(parseJsonImport(JSON.stringify({entries:legacyLore}),'BTO-Lore-v3.0.json','root').map(e=>[e.id,e]));
// Le intestazioni della v3.1 hanno ancore HTML; nella v3.0 non le avevano.
// Ignorale nel confronto, così l’aggiornamento del parser non viene scambiato
// per una modifica del GM.
const withoutGeneratedAnchors=html=>String(html||'').replace(/(<h[234]) id="[a-z0-9-]+"/gi,'$1');
const comparable=b=>JSON.stringify((b||[]).map(({id,...rest})=>({...rest,html:withoutGeneratedAnchors(rest.html)})));
const fields=['title','description','parentId','kind','order','imageUrl','imageAlt','icon','layout','atlas','timeline','flameHex','flameColor','flames','topics','relatedUrls'];
const equal=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);
const unedited=(entry,original)=>entry&&original&&fields.every(f=>equal(entry[f],original[f]))&&comparable(entry.blocks)===comparable(original.blocks);

export default function LegacyImportReset({onClose}){
 const {gm,seeded,publishedEntries,draftEntries,resetLegacyLore}=useContent();
 const [backedUp,setBackedUp]=useState(false),[includeEdited,setIncludeEdited]=useState(false),[confirmText,setConfirmText]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const records=useMemo(()=>{
  const pub=new Map(publishedEntries.map(e=>[e.id,e]));
  const drafts=new Map(draftEntries.map(e=>[e.id,e]));
  return legacyLore.filter(item=>(pub.has(item.id)||drafts.has(item.id))&&!([pub.get(item.id),drafts.get(item.id)].filter(Boolean).some(e=>e.packageId==='bto-lore-v3.1'))).map(item=>({
   id:item.id,title:item.title,published:pub.get(item.id)||null,draft:drafts.get(item.id)||null,
   modified:![pub.get(item.id),drafts.get(item.id)].filter(Boolean).every(e=>unedited(e,baseline.get(item.id)))
  }));
 },[publishedEntries,draftEntries]);
 const modified=records.filter(r=>r.modified),safe=records.filter(r=>!r.modified);
 const selected=records.filter(r=>includeEdited||!r.modified);
 if(!gm||!seeded)return null;
 function exportBackup(){
  const data={backup:'BTO-lore-v3.0',createdAt:new Date().toISOString(),message:'Copia locale delle voci pubblicate e delle bozze prima della ripulitura. Non contiene le revisioni storiche.',entries:records.map(r=>({id:r.id,published:r.published,draft:r.draft,modified:r.modified}))};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='BTO-backup-importazione-lore-v3.0.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);setBackedUp(true);
 }
 async function clear(){
  if(!backedUp||confirmText!=='ELIMINA'||!selected.length||busy)return;
  if(!window.confirm(`Ripulire ${selected.length} voci dell’importazione lore v3.0 da voci pubblicate e bozze? L’Alchimia originale e gli altri contenuti non saranno eliminati.`))return;
  setBusy(true);setError('');setMessage('');
  try{const result=await resetLegacyLore(selected.map(r=>r.id));setMessage(`${result.deleted} voci ripulite. Ora importa BTO-Lore-v3.1-Riorganizzato.json dal menu GM, con destinazione Home · Compendio.`);setBackedUp(false);setConfirmText('');}
  catch(e){setError(e.message||'Ripulitura non riuscita.');}
  finally{setBusy(false)}
 }
 return createPortal(<div className="gm-overlay" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}><section className="gm-import-dialog gm-reset-dialog" role="dialog" aria-modal="true" aria-label="Ripulisci importazione lore v3.0">
  <header className="gm-drawer-header"><div><small>STRUMENTI GM · MANUTENZIONE</small><h2>Ripulisci importazione lore</h2><p>Elimina esclusivamente le voci riconosciute del pacchetto v3.0, prima di importare la versione riorganizzata.</p></div><button type="button" className="icon-button" onClick={onClose} disabled={busy} aria-label="Chiudi"><X/></button></header>
  <div className="gm-import-body gm-reset-content">
   <div className="gm-reset-stats"><div><strong>{records.length}</strong><span>Voci v3.0 rilevate</span></div><div><strong>{safe.length}</strong><span>Non modificate</span></div><div><strong>{modified.length}</strong><span>Modificate dal GM</span></div></div>
   <p className="gm-reset-warning"><ShieldAlert size={18}/> La funzione non azzera Firestore, non tocca materiali o processi alchemici, non elimina marker o altre pagine non appartenenti alla precedente importazione. Le revisioni storiche non vengono cancellate.</p>
   {modified.length>0&&<label className="gm-reset-checkbox"><input type="checkbox" checked={includeEdited} onChange={e=>{setIncludeEdited(e.target.checked);setBackedUp(false);setConfirmText('')}}/> Includi anche le {modified.length} voci modificate. Rimuove anche le modifiche GM: esegui il backup prima.</label>}
   <div className="gm-reset-list"><strong>Voci selezionate ({selected.length})</strong>{selected.map(r=><div key={r.id}><span>{r.title}</span><small>{r.modified?'Modificata':'Originale'}</small></div>)}</div>
   <button type="button" className="gm-secondary gm-reset-backup" onClick={exportBackup} disabled={busy||!records.length}><Download size={17}/> {backedUp?'Scarica di nuovo il backup':'1. Scarica il backup JSON'}</button>
   <label className="gm-input"><span>2. Digita ELIMINA per confermare</span><input value={confirmText} onChange={e=>setConfirmText(e.target.value)} placeholder="ELIMINA" disabled={busy||!backedUp}/></label>
   {message&&<p role="status" className="gm-import-success"><Check size={16}/>{message}</p>}
   {error&&<p role="alert" className="gm-import-alert"><AlertTriangle size={16}/>{error}</p>}
  </div>
  <footer className="gm-drawer-footer"><span className="gm-hint">Non viene eseguita alcuna eliminazione senza conferma esplicita.</span><div className="gm-footer-actions"><button className="gm-secondary" type="button" onClick={onClose} disabled={busy}>Chiudi</button><button className="gm-danger" type="button" onClick={clear} disabled={busy||!backedUp||confirmText!=='ELIMINA'||!selected.length}><Trash2 size={16}/>{busy?'Ripulitura…':`Ripulisci ${selected.length} voci`}</button></div></footer>
 </section></div>,document.body);
}
