import React, {useState} from 'react';
import {createPortal} from 'react-dom';
import {FileUp,FolderOpen,CheckCircle2,AlertTriangle,X,UploadCloud} from 'lucide-react';
import {useContent} from './content-store';
import {readImportFiles} from './import-utils';

export default function ImportDialog({onClose}) {
  const {gm,seeded,entries,pages,importEntries}=useContent();
  const [parentId,setParentId]=useState('alchimia');
  const [parsed,setParsed]=useState({records:[],errors:[]});
  const [files,setFiles]=useState([]);
  const [replace,setReplace]=useState(false);
  const [publishNow,setPublishNow]=useState(false);
  const [working,setWorking]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  if(!gm||!seeded)return null;
  const process=async(selected)=>{
    setWorking(true);setMessage('');setError('');
    try {const list=[...selected];setFiles(list);setParsed(await readImportFiles(list,parentId,entries));}
    catch(e){setParsed({records:[],errors:[]});setError(e.message);}
    finally{setWorking(false);}
  };
  const submit=async()=>{
    if(!parsed.records.length)return;
    const conflicts=parsed.records.filter(e=>e.existing).length;
    if(replace&&conflicts&&!window.confirm(`Sovrascrivere ${conflicts} voci già esistenti? Le versioni pubblicate saranno modificate soltanto se scegli anche “Pubblica subito”.`))return;
    if(publishNow&&!window.confirm(`Pubblicare immediatamente ${parsed.records.length} voci? Saranno visibili ai lettori.`))return;
    setWorking(true);setError('');
    try {
      const result=await importEntries(parsed.records,{publishNow,replaceExisting:replace});
      setMessage(`${result.imported} ${result.mode}; ${result.skipped} duplicate saltate. Puoi chiudere questa finestra.`);
      setFiles([]);setParsed({records:[],errors:[]});
    }catch(e){setError(`Importazione interrotta: ${e.message}. Controlla i contenuti già salvati prima di riprovare.`);}
    finally{setWorking(false);}
  };
  const duplicates=parsed.records.filter(e=>e.existing).length;
  return createPortal(<div className="gm-overlay" onMouseDown={e=>e.target===e.currentTarget&&!working&&onClose()}>
    <section className="gm-import-dialog" role="dialog" aria-modal="true" aria-label="Importazione massiva di contenuti">
      <header className="gm-drawer-header"><div><small>STRUMENTI GM · FIRESTORE</small><h2>Importa contenuti</h2><p>Carica più pagine insieme senza aggiornare il codice del sito.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Chiudi"><X/></button></header>
      <div className="gm-import-body">
        <label className="gm-input"><span>Raccolta di destinazione</span><select value={parentId} disabled={working} onChange={e=>{setParentId(e.target.value);setParsed({records:[],errors:[]});setFiles([]);}}><option value="root">Home · Compendio</option>{pages.filter(p=>['chapter','collection'].includes(p.kind)).map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        <div className="gm-import-drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();process(e.dataTransfer.files);}}>
          <UploadCloud size={32} strokeWidth={1.4}/><strong>Trascina file qui</strong><p>Markdown (.md), HTML (.html) o JSON (.json). Le cartelle diventano raccolte.</p>
          <div className="gm-import-pickers"><label className="gm-secondary"><FileUp size={16}/> Scegli file<input type="file" accept=".md,.markdown,.html,.htm,.json" multiple hidden onChange={e=>process(e.target.files)}/></label><label className="gm-secondary"><FolderOpen size={16}/> Scegli cartella<input type="file" webkitdirectory="" multiple hidden onChange={e=>process(e.target.files)}/></label></div>
        </div>
        {files.length>0&&<section className="gm-import-preview"><div className="gm-import-stats"><strong>{files.length} file</strong><span>{parsed.records.length} voci</span><span>{duplicates} già presenti</span></div>
          <div className="gm-import-entry-list">{parsed.records.slice(0,40).map((item,i)=><div key={`${item.id}-${i}`}><span>{item.kind==='collection'?'RACCOLTA':item.kind==='page'?'PAGINA':item.kind.toUpperCase()}</span><strong>{item.title}</strong>{item.existing&&<small>Esistente</small>}</div>)}{parsed.records.length>40&&<p>…e altre {parsed.records.length-40} voci.</p>}</div>
          {parsed.errors.length>0&&<div className="gm-import-errors"><AlertTriangle size={16}/><div><strong>{parsed.errors.length} avvisi</strong>{parsed.errors.slice(0,15).map((msg,i)=><p key={i}>{msg}</p>)}</div></div>}
        </section>}
        {parsed.records.length>0&&<div className="gm-import-options"><label><input type="checkbox" checked={replace} onChange={e=>setReplace(e.target.checked)}/> Sovrascrivi gli ID già presenti (altrimenti salta i duplicati)</label><label><input type="checkbox" checked={publishNow} onChange={e=>setPublishNow(e.target.checked)}/> Pubblica subito invece di salvare come bozze</label><p>Per sicurezza vengono create <strong>bozze</strong> per impostazione predefinita. Nessuna immagine viene caricata: restano soltanto i suoi URL.</p></div>}
        {error&&<p role="alert" className="gm-import-alert">{error}</p>}{message&&<p role="status" className="gm-import-success"><CheckCircle2 size={16}/>{message}</p>}
      </div>
      <footer className="gm-drawer-footer"><span className="gm-hint">Solo gli account GM possono scrivere su Firestore.</span><div className="gm-footer-actions"><button type="button" className="gm-secondary" disabled={working} onClick={onClose}>Chiudi</button><button type="button" className="gm-primary" disabled={working||!parsed.records.length} onClick={submit}><FileUp size={16}/>{working?'Importazione…':`Importa ${parsed.records.length} voci`}</button></div></footer>
    </section>
  </div>,document.body);
}
