import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useNavigate} from 'react-router-dom';
import {ArrowDown, ArrowRight, ArrowUp, BookOpen, ChevronDown, ChevronRight, Folder, FolderPlus, FolderTree, GripVertical, Home, Plus, X} from 'lucide-react';
import {useContent, newEntry} from './content-store';
import {applyTemplate} from './templates';
import {assertTreeMove, editableTreeEntries, getEntryPath, isContainer, LOCKED_TREE_IDS, orderEntries, treeGroups} from './collection-tree';
import {insertionOrder} from './import-utils';

const urlOf = entry => entry.id==='alchimia'?'/alchimia':entry.id==='atlas-geografico'?'/atlante':entry.id==='alchimia-materiali'?'/alchimia/materiali':entry.id==='alchimia-genesi'?'/alchimia/processi':`/pagina/${entry.id}`;
const typeName = entry => entry.kind==='page'?'Pagina':entry.kind==='chapter'?'Sezione':'Raccolta';
const getParentName = (entries,id) => id==='root'?'Compendio · Home':entries.find(e=>e.id===id)?.title||'Raccolta non trovata';

export default function CollectionManager({open,onClose,initialId='organizzazioni'}){
  const {gm,seeded,entries,publishedEntries,moveEntry,publish,setError}=useContent();
  const navigate=useNavigate();
  const items=useMemo(()=>editableTreeEntries(entries),[entries]);
  const groups=useMemo(()=>treeGroups(items),[items]);
  const byId=useMemo(()=>new Map(items.map(e=>[e.id,e])),[items]);
  const [selected,setSelected]=useState(initialId),[expanded,setExpanded]=useState([]),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState(''),[target,setTarget]=useState('root'),[newName,setNewName]=useState(''),[newOpen,setNewOpen]=useState(false);
  const dragging=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const visibleId=byId.has(initialId)?initialId:'root';
    const path=getEntryPath(items,visibleId).map(p=>p.id);
    setExpanded([...new Set([...path,'root'])]);setSelected(visibleId);setFeedback('');setNewOpen(false);
  },[open,initialId]);
  useEffect(()=>{
    if(!open)return;
    const onKey=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);
  },[open,onClose]);
  const current=byId.get(selected);
  const parentChoices=useMemo(()=>[{id:'root',title:'Compendio · Home'},...items.filter(isContainer).map(e=>({id:e.id,title:getEntryPath(items,e.id).map(p=>p.title).join(' / ')}))],[items]);
  const eligibleParents=parentChoices.filter(p=>!current||(()=>{try{assertTreeMove(items,current.id,p.id);return true;}catch{return false;}})());
  const siblings=orderEntries(items.filter(e=>e.parentId===(current?.parentId||'root')));
  const index=siblings.findIndex(e=>e.id===current?.id);
  const branchId=current&&isContainer(current)?current.id:current?.parentId||'root';
  const canMove=current&&!LOCKED_TREE_IDS.has(current.id);
  useEffect(()=>{setTarget(current?.parentId||'root');},[selected,current?.parentId]);
  const toggle=id=>setExpanded(old=>old.includes(id)?old.filter(k=>k!==id):[...old,id]);
  const select=id=>{setSelected(id);setFeedback('');};
  const move=async(id,parentId,beforeId=null)=>{
    try{
      assertTreeMove(items,id,parentId);
      if(id===beforeId)return;
      setBusy(true);setFeedback('');
      await moveEntry(id,parentId,beforeId);
      setSelected(id);setExpanded(old=>[...new Set([...old,parentId])]);
      setFeedback('Posizione aggiornata. La modifica è visibile anche ai lettori se la voce è pubblicata.');
    }catch(e){setFeedback(e.message);setError(e.message);}finally{setBusy(false);}
  };
  const create=async(e)=>{
    e.preventDefault();
    if(!newName.trim())return;
    setBusy(true);setFeedback('');
    try{
      const parent=byId.get(branchId);
      const underOrganizations=parent?.layout==='organizations'||getEntryPath(items,branchId).some(e=>e.id==='organizzazioni');
      const template=underOrganizations?'organization-collection':'collection';
      const entry=applyTemplate(newEntry('collection',newName.trim(),branchId),template);
      entry.order=insertionOrder(entries.filter(e=>e.parentId===branchId),Number.MAX_SAFE_INTEGER);
      if(branchId!=='root'&&!publishedEntries.some(e=>e.id===branchId))throw Error('Pubblica prima la raccolta contenitore.');
      await publish(entry);
      setExpanded(old=>[...new Set([...old,branchId])]);setSelected(entry.id);
      setNewName('');setNewOpen(false);
      setFeedback(`Raccolta «${entry.title}» pubblicata.`);
    }catch(err){setFeedback(err.message);setError(err.message);}finally{setBusy(false);}
  };
  const drop=(event, onto)=>{
    event.preventDefault();
    const id=dragging.current;
    dragging.current=null;
    if(!id||busy||id===onto.id)return;
    if(isContainer(onto))move(id,onto.id);
    else move(id,onto.parentId||'root',onto.id);
  };
  function renderBranch(entry,depth=0,seen=new Set()){
    if(seen.has(entry.id))return null;
    const nested=groups.get(entry.id)||[],hasChildren=nested.length>0;
    const isOpen=expanded.includes(entry.id), active=entry.id===selected;
    const isLocked=LOCKED_TREE_IDS.has(entry.id);
    const Icon=isContainer(entry)?Folder:BookOpen;
    const nextSeen=new Set([...seen,entry.id]);
    return <div key={entry.id} className="gm-tree-branch">
      <div className={`gm-tree-node ${active?'is-active':''} ${isLocked?'is-locked':''}`} style={{'--tree-depth':depth}} onDragOver={e=>{if(dragging.current&&dragging.current!==entry.id)e.preventDefault();}} onDrop={e=>drop(e,entry)}>
        <button type="button" className="gm-tree-expander" disabled={!hasChildren} onClick={()=>toggle(entry.id)} aria-label={`${isOpen?'Chiudi':'Espandi'} ${entry.title}`}>{hasChildren?(isOpen?<ChevronDown size={15}/>:<ChevronRight size={15}/>):null}</button>
        <button type="button" className="gm-tree-select" aria-current={active?'true':undefined} onClick={()=>select(entry.id)}><Icon size={16}/><span>{entry.title}</span><small>{entry.kind==='page'?'PAGINA':''}{entry._draft?' · BOZZA':''}</small></button>
        {!isLocked&&<span className="gm-tree-drag" draggable={!busy} onDragStart={e=>{dragging.current=entry.id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',entry.id);}} onDragEnd={()=>{dragging.current=null;}} aria-label={`Trascina ${entry.title}`} title="Trascina nella raccolta desiderata"><GripVertical size={17}/></span>}
      </div>
      {isOpen&&nested.map(e=>renderBranch(e,depth+1,nextSeen))}
    </div>;
  }
  if(!open||!gm||!seeded)return null;
  // Collezioni e pagine di lore soltanto; i contenuti specializzati dell'Alchimia e gli appunti rimangono separati.
  const roots=groups.get('root')||[];
  const orphaned=groups.get('__orphans__')||[];
  return createPortal(<div className="gm-overlay gm-tree-overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <section className="gm-tree-dialog" role="dialog" aria-modal="true" aria-label="Gestisci le raccolte del Compendio">
      <header className="gm-tree-header"><div><small>GAME MASTER · STRUTTURA DEL COMPENDIO</small><h2>Organizza raccolte e pagine</h2><p>Trascina una pagina in una raccolta, oppure selezionala per scegliere la destinazione. Non modifica note o appunti.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Chiudi"><X size={21}/></button></header>
      <div className="gm-tree-layout"><nav className="gm-tree-browser" aria-label="Albero delle raccolte"><div className="gm-tree-toolbar"><strong><FolderTree size={16}/> RACCOLTE E PAGINE</strong><div><button type="button" onClick={()=>setExpanded(['root',...items.filter(isContainer).map(e=>e.id)])}>Espandi</button><button type="button" onClick={()=>setExpanded(['root'])}>Chiudi</button></div></div>
        <div className="gm-tree-scroll"><div className={`gm-tree-node gm-tree-root ${selected==='root'?'is-active':''}`} onDragOver={e=>{if(dragging.current)e.preventDefault();}} onDrop={e=>{e.preventDefault();const id=dragging.current;dragging.current=null;if(id)move(id,'root');}}><button type="button" className="gm-tree-select" onClick={()=>select('root')}><Home size={16}/><span>Compendio · Home</span></button></div>{roots.map(e=>renderBranch(e,0))}{orphaned.length>0&&<div className="gm-tree-orphans"><small>VOCI CON RACCOLTA MANCANTE</small>{orderEntries(orphaned).map(e=>renderBranch(e,0))}</div>}</div>
      </nav><aside className="gm-tree-detail" aria-label="Gestione voce selezionata"><span className="eyebrow">{current?typeName(current).toUpperCase():'RADICE'}</span><h3>{current?.title||'Compendio · Home'}</h3><p className="gm-tree-path">{current?getEntryPath(items,current.id).map(e=>e.title).join(' / '):'Tutte le sezioni'}</p>
        {current&&<button type="button" className="gm-secondary" onClick={()=>{onClose();navigate(urlOf(current));}}><ArrowRight size={15}/> Apri nel Compendio</button>}
        {current&&<div className="gm-tree-detail-section"><strong>Spostamento</strong>{canMove?<><label className="gm-input"><span>Raccolta di destinazione</span><select value={target} onChange={e=>setTarget(e.target.value)}>{eligibleParents.map(p=><option value={p.id} key={p.id}>{p.title}</option>)}</select></label><button type="button" className="gm-primary" disabled={busy||target===current.parentId} onClick={()=>move(current.id,target)}>Sposta nella raccolta</button><div className="gm-tree-order"><span>Ordine tra le voci di «{getParentName(items,current.parentId)}»</span><div><button type="button" className="gm-secondary" disabled={busy||index<=0} onClick={()=>move(current.id,current.parentId,siblings[index-1]?.id)}><ArrowUp size={15}/> Su</button><button type="button" className="gm-secondary" disabled={busy||index<0||index===siblings.length-1} onClick={()=>move(current.id,current.parentId,siblings[index+2]?.id||null)}><ArrowDown size={15}/> Giù</button></div></div></>:<p className="gm-hint">Sezione strutturale protetta: puoi aggiungere e riordinare le sue voci, ma non spostarla.</p>}</div>}
        <div className="gm-tree-detail-section"><strong>{branchId==='root'?'Nuova raccolta principale':`Nuova sottoraccolta in «${getParentName(items,branchId)}»`}</strong>{!newOpen?<button type="button" className="gm-secondary" onClick={()=>setNewOpen(true)}><FolderPlus size={16}/> Nuova raccolta qui</button>:<form onSubmit={create} className="gm-tree-create"><label className="gm-input"><span>Nome della raccolta</span><input value={newName} onChange={e=>setNewName(e.target.value)} required autoFocus maxLength={160} placeholder="Es. Regno Italiano"/></label><div><button type="button" className="gm-secondary" onClick={()=>{setNewOpen(false);setNewName('');}}>Annulla</button><button type="submit" className="gm-primary" disabled={busy||!newName.trim()}><Plus size={15}/> Crea e pubblica</button></div></form>}</div>
        <p className="gm-tree-tip">Puoi trascinare le voci nell'albero anche tra raccolte differenti. Su smartphone usa il menu di destinazione qui sopra. Per modificare il testo di una pagina, aprila nel Compendio.</p>
        {feedback&&<p role="status" className="gm-tree-feedback">{feedback}</p>}
      </aside></div>
    </section>
  </div>,document.body);
}
