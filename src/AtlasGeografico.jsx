import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {ArrowUpRight, Check, ChevronRight, Crosshair, ExternalLink, Globe2, LocateFixed, MapPin, Minus, Plus, Save, Search, Trash2, X} from 'lucide-react';
import {useContent, newEntry, normalize} from './content-store';
import world from './data/atlas-world.json';
import {EditTrigger, GenericBlocks} from './editor';
import './atlas-geografico.css';

const FULL={x:0,y:0,w:1000,h:476};
const markerTypes=[
 {id:'city',name:'Città',color:'#d6bd87'},
 {id:'poi',name:'Punto di interesse',color:'#a0c9d6'},
 {id:'organization',name:'Sede di organizzazione',color:'#ba9ce4'},
 {id:'school',name:'Scuola',color:'#9ec99d'},
 {id:'historical',name:'Luogo storico o anomalia',color:'#de9a91'},
];
const countryById = new Map(world.countries.map(c=>[c.id,c]));
let itCountry;
try {itCountry=new Intl.DisplayNames(['it'],{type:'region'});}catch{/* Resta il nome della fonte. */}
const countryName=c=>c?.nome||((c?.iso2&&itCountry?.of(c.iso2))||c?.name||'Paese');
const pointXY=(lat,lon)=>({x:(lon+180)*1000/360,y:(85-lat)*1000/360});
const pointLL=(x,y)=>({lon:Math.max(-180,Math.min(180,(x*360/1000)-180)),lat:Math.max(-85,Math.min(85,85-(y*360/1000)))});
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const fixed=(n)=>Number(n).toFixed(4);
const markerName=id=>markerTypes.find(t=>t.id===id)?.name||'Luogo';
const markerColor=id=>markerTypes.find(t=>t.id===id)?.color||'#d6bd87';
function fitView(x,y,scale){const w=FULL.w/scale,h=FULL.h/scale;return {w,h,x:clamp(x-w/2,0,FULL.w-w),y:clamp(y-h/2,0,FULL.h-h)};}
function entryCountry(entry){return countryById.get(entry?.atlas?.countryId);}

export default function AtlasGeografico(){
 const navigate=useNavigate();
 const {pages,gm,seeded,saveDraft,publish,remove,isDraft}=useContent();
 const countryEntries=useMemo(()=>pages.filter(e=>e.atlas?.kind==='country'),[pages]);
 const markerEntries=useMemo(()=>pages.filter(e=>e.atlas?.kind==='marker'),[pages]);
 const countryMap=useMemo(()=>new Map(countryEntries.map(e=>[e.atlas.countryId,e])),[countryEntries]);
 const markerMap=useMemo(()=>new Map(markerEntries.map(e=>[e.id,e])),[markerEntries]);
 const [activeCountry,setActiveCountry]=useState(null);
 const [activeMarker,setActiveMarker]=useState(null);
 const [hover,setHover]=useState('');
 const [search,setSearch]=useState('');
 const [filter,setFilter]=useState('all');
 const [view,setView]=useState(FULL);
 const [placement,setPlacement]=useState(null);
 const [edit,setEdit]=useState(null);
 const [pendingPositions,setPendingPositions]=useState({});
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const svgRef=useRef(null),dragRef=useRef(null),panRef=useRef(null),suppressClick=useRef(false);
 const info=pages.find(e=>e.id==='atlas-geografico');
 const canEdit=gm&&seeded&&pages.some(e=>e.id==='atlas-luoghi')&&pages.some(e=>e.id==='atlas-paesi');
 const selectedCountry=countryById.get(activeCountry);
 const selectedCountryEntry=countryMap.get(activeCountry);
 const selectedMarker=markerMap.get(activeMarker);
 const countryList=useMemo(()=>[...world.countries].sort((a,b)=>countryName(a).localeCompare(countryName(b),'it')),[world.countries]);
 const filteredCountries=countryList.filter(c=>normalize(countryName(c)).includes(normalize(search))||normalize(c.name).includes(normalize(search)));
 const visibleMarkers=markerEntries.filter(m=>filter==='all'||m.atlas.category===filter);
 const countryMarkers=markerEntries.filter(m=>m.atlas.countryId===activeCountry);
 const hasChanges=Object.keys(pendingPositions).length>0;

 function localPoint(e){
  const svg=svgRef.current;if(!svg)return null;
  const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;
  const matrix=svg.getScreenCTM()?.inverse();if(!matrix)return null;
  const p=pt.matrixTransform(matrix);
  return {x:p.x,y:p.y,...pointLL(p.x,p.y)};
 }
 function focusCountry(country){
  if(!country)return;
  setActiveCountry(country.id);setActiveMarker(null);
  if(country.center){const center=pointXY(country.center[0],country.center[1]);setView(fitView(center.x,center.y,2.0));}
 }
 function focusMarker(marker){
  setActiveMarker(marker.id);setActiveCountry(marker.atlas.countryId||null);
  const p=pendingPositions[marker.id]||marker.atlas;
  const center=pointXY(Number(p.lat),Number(p.lon));setView(fitView(center.x,center.y,3.25));
 }
 function zoom(factor){setView(v=>{const z=clamp(FULL.w/(v.w*factor),1,8);return fitView(v.x+v.w/2,v.y+v.h/2,z);});}
 function editMarker(marker,override=null){
  setPlacement(null);setEdit({id:marker.id,title:marker.title,description:marker.description||'',category:marker.atlas.category,lat:override?.lat??marker.atlas.lat,lon:override?.lon??marker.atlas.lon,countryId:marker.atlas.countryId||''});
  setError('');setMessage('');
 }
 function createMarker(ll,category,countryId=activeCountry||''){
  if(!canEdit)return;
  setEdit({id:null,title:'',description:'',category,lat:ll.lat,lon:ll.lon,countryId});
  setPlacement(null);setError('');setMessage('');
 }
 function cancelEdit(){if(edit?.id){setPendingPositions(old=>{const next={...old};delete next[edit.id];return next;});}setEdit(null);}
 async function saveMarker(publishNow=false){
  if(!canEdit||!edit||busy)return;
  const title=edit.title.trim();const lat=Number(edit.lat),lon=Number(edit.lon);
  if(!title||title.length>120){setError('Inserisci un nome di massimo 120 caratteri.');return;}
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -85||lat>85||lon < -180||lon>180){setError('Coordinate non valide: latitudine tra −85 e 85 e longitudine tra −180 e 180.');return;}
  if(!markerTypes.some(t=>t.id===edit.category)){setError('Categoria non valida.');return;}
  setBusy(true);setError('');
  try{
   const original=edit.id?markerMap.get(edit.id):newEntry('page',title,'atlas-luoghi');
   if(!original)throw Error('Il marker non esiste più.');
   const entry={...original,title,description:edit.description.trim(),parentId:'atlas-luoghi',atlas:{kind:'marker',category:edit.category,lat,lon,countryId:edit.countryId||''}};
   if(publishNow)await publish(entry);else await saveDraft(entry);
   setActiveMarker(entry.id);setActiveCountry(edit.countryId||null);setEdit(null);
   setPendingPositions(old=>{const next={...old};delete next[entry.id];return next;});
   setMessage(publishNow?'Marker e pagina collegata pubblicati.':'Marker e pagina collegata salvati come bozza.');
  }catch(e){setError(e.message||'Salvataggio non riuscito.');}
  finally{setBusy(false);}
 }
 async function createCountryPage(){
  if(!canEdit||!selectedCountry||countryMap.has(selectedCountry.id)||busy)return;
  setBusy(true);setError('');
  try{
   const entry={id:'page-atlas-paese-'+selectedCountry.id.toLowerCase().replace(/[^a-z0-9-]/g,'-'),kind:'page',parentId:'atlas-paesi',order:0,title:countryName(selectedCountry),description:'',imageUrl:'',imageAlt:'',blocks:[],atlas:{kind:'country',countryId:selectedCountry.id}};
   await saveDraft(entry);setMessage('Scheda del Paese creata come bozza.');navigate('/pagina/'+entry.id);
  }catch(e){setError(e.message||'Creazione della scheda non riuscita.');}
  finally{setBusy(false);}
 }
 async function deleteMarker(){
  if(!edit?.id||busy||!window.confirm('Eliminare il marker e la pagina collegata? Questa operazione elimina anche i contenuti della pagina.'))return;
  setBusy(true);setError('');
  try{await remove(edit.id);setEdit(null);setActiveMarker(null);setMessage('Marker e pagina eliminati.');}
  catch(e){setError(e.message||'Eliminazione non riuscita.');}
  finally{setBusy(false);}
 }
 function onPointerMove(e){
  if(dragRef.current?.pointerId===e.pointerId){
   const pos=localPoint(e);if(!pos)return;
   const drag=dragRef.current;
   if(Math.abs(e.clientX-drag.startX)>3||Math.abs(e.clientY-drag.startY)>3)drag.moved=true;
   if(!drag.moved)return;
   if(!drag.captured){try{svgRef.current?.setPointerCapture(e.pointerId);drag.captured=true;}catch{}}
   setPendingPositions(prev=>({...prev,[drag.id]:{lat:clamp(pos.lat,-85,85),lon:pos.lon}}));
   return;
  }
  if(panRef.current?.pointerId===e.pointerId){
   const pan=panRef.current;
   const dx=(e.clientX-pan.lastX)*view.w/(svgRef.current?.getBoundingClientRect().width||1);
   const dy=(e.clientY-pan.lastY)*view.h/(svgRef.current?.getBoundingClientRect().height||1);
   pan.lastX=e.clientX;pan.lastY=e.clientY;
   if(Math.abs(e.clientX-pan.startX)>3||Math.abs(e.clientY-pan.startY)>3)pan.moved=true;
   if(pan.moved){
    if(!pan.captured){try{svgRef.current?.setPointerCapture(e.pointerId);pan.captured=true;}catch{}}
    setView(v=>({...v,x:clamp(v.x-dx,0,FULL.w-v.w),y:clamp(v.y-dy,0,FULL.h-v.h)}));
   }
  }
 }
 function onPointerUp(e){
  if(dragRef.current?.pointerId===e.pointerId){
   const drag=dragRef.current;dragRef.current=null;
   try{svgRef.current?.releasePointerCapture(e.pointerId);}catch{}
   if(drag.moved){
    suppressClick.current=true;requestAnimationFrame(()=>{suppressClick.current=false;});
    const original=markerMap.get(drag.id),pos=localPoint(e);
    if(original&&pos)editMarker(original,{lat:clamp(pos.lat,-85,85),lon:pos.lon});
   }
  }
  if(panRef.current?.pointerId===e.pointerId){
   if(panRef.current.moved){suppressClick.current=true;requestAnimationFrame(()=>{suppressClick.current=false;});}
   panRef.current=null;try{svgRef.current?.releasePointerCapture(e.pointerId);}catch{}
  }
 }
 function mapClick(e, countryId=null){
  if(suppressClick.current)return;
  if(placement){const point=localPoint(e);if(point)createMarker(point,placement,countryId||activeCountry||'');return;}
  if(countryId){setActiveCountry(countryId);setActiveMarker(null);}
  else{setActiveCountry(null);setActiveMarker(null);}
 }
 function countryClick(e,c){e.stopPropagation();mapClick(e,c.id);}
 function startMarkerDrag(e,m){if(!canEdit||e.button!==0||placement)return;
  e.stopPropagation();dragRef.current={id:m.id,pointerId:e.pointerId,moved:false,startX:e.clientX,startY:e.clientY};
  }
 function onMapPointerDown(e){if(e.button!==0||dragRef.current||placement)return;panRef.current={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};}
 function onMapDrop(e){e.preventDefault();if(!canEdit)return;const type=e.dataTransfer.getData('application/x-bto-marker');if(!markerTypes.some(t=>t.id===type))return;const point=localPoint(e);if(point)createMarker(point,type,activeCountry||'');}
 function onWheel(e){if(!e.ctrlKey&&!e.shiftKey)return; e.preventDefault();zoom(e.deltaY<0?1.18:(1/1.18));}
 const markerHover=markerMap.get(hover);
 return <div className="atlas-geografico page-width">
  <div className="breadcrumb"><Link to="/">Home</Link><ChevronRight size={15}/>Atlante</div>
  <div className="page-heading atlas-heading"><div><span className="eyebrow">BREACH THE OBLIVION · GEOGRAFIA</span><h1>Atlante</h1><p>Confini geografici, città, sedi e luoghi dell’ambientazione.</p></div><div className="atlas-heading-actions">{info&&<EditTrigger entry={info}/>}<span className="atlas-total">{markerEntries.length} luoghi</span></div></div>
  {info?.blocks?.length>0&&<div className="atlas-intro"><GenericBlocks entry={info}/></div>}
  {!pages.some(e=>e.id==='atlas-geografico')&&<p className="atlas-notice">La mappa è consultabile; per creare i contenuti collegati importa il pacchetto di lore dal menu GM, scegliendo «Home · Compendio».</p>}
  {message&&<div className="atlas-alert good" role="status"><Check size={16}/>{message}<button type="button" onClick={()=>setMessage('')} aria-label="Nascondi"><X size={15}/></button></div>}
  {error&&!edit&&<div className="atlas-alert bad" role="alert">{error}<button type="button" onClick={()=>setError('')} aria-label="Chiudi"><X size={15}/></button></div>}
  <div className="atlas-layout">
   <section className="atlas-map-column" aria-label="Mappa geografica">
    <div className="atlas-toolbar"><div className="atlas-toolbar-label"><Globe2 size={18}/><span>MONDO · ATLANTE GEOGRAFICO</span></div><div className="atlas-toolbar-actions"><button type="button" onClick={()=>zoom(1/1.65)} title="Riduci zoom" aria-label="Riduci zoom"><Minus size={17}/></button><button type="button" onClick={()=>setView(FULL)} title="Reimposta mappa" aria-label="Reimposta mappa"><Crosshair size={16}/></button><button type="button" onClick={()=>zoom(1.65)} title="Aumenta zoom" aria-label="Aumenta zoom"><Plus size={17}/></button></div></div>
    <div className="atlas-stage">
     <svg ref={svgRef} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} className={`atlas-map ${placement?'atlas-placing':''}`} xmlns="http://www.w3.org/2000/svg" aria-label="Mappa interattiva dei Paesi" onPointerDown={onMapPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onClick={e=>mapClick(e)} onDragOver={e=>e.preventDefault()} onDrop={onMapDrop} onWheel={onWheel}>
      <rect x="0" y="0" width="1000" height="476" fill="var(--atlas-sea)"/>
      {Array.from({length:11},(_,i)=>i+1).map(i=><line key={'vx'+i} x1={i*1000/12} y1="0" x2={i*1000/12} y2="476" className="atlas-grid-line"/>)}
      {Array.from({length:7},(_,i)=>i+1).map(i=><line key={'hy'+i} x1="0" y1={i*476/8} x2="1000" y2={i*476/8} className="atlas-grid-line"/>)}
      {world.countries.map(c=><path key={c.id} d={c.path} fillRule="evenodd" className={`atlas-country ${activeCountry===c.id?'is-active':''}`} onMouseEnter={()=>setHover(c.id)} onMouseLeave={()=>setHover('')} onClick={e=>countryClick(e,c)}><title>{countryName(c)}</title></path>)}
      {visibleMarkers.map(m=>{const loc=pendingPositions[m.id]||m.atlas;const xy=pointXY(Number(loc.lat),Number(loc.lon));const radius=5.6*view.w/1000;return <g key={m.id} className={`atlas-marker ${activeMarker===m.id?'is-active':''}`} data-marker="true" transform={`translate(${xy.x} ${xy.y})`} onPointerDown={e=>startMarkerDrag(e,m)} onClick={e=>{e.stopPropagation();if(suppressClick.current)return;if(placement)return;focusMarker(m);}} onMouseEnter={()=>setHover(m.id)} onMouseLeave={()=>setHover('')}>
       <circle r={radius*2.5} fill="transparent"/><circle className="atlas-marker-halo" r={radius*1.48} stroke={markerColor(m.atlas.category)} strokeWidth={1.3*view.w/1000}/><circle r={radius} fill={markerColor(m.atlas.category)} stroke="var(--atlas-pin-stroke)" strokeWidth={1.8*view.w/1000}/><title>{m.title} · {markerName(m.atlas.category)}{isDraft(m.id)?' (bozza)':''}</title>
      </g>;})}
     </svg>
     {(countryById.get(hover)||markerHover)&&<div className="atlas-hover" role="status">{markerHover?<><MapPin size={13}/>{markerHover.title} · {markerName(markerHover.atlas.category)}</>:<><Globe2 size={13}/>{countryName(countryById.get(hover))}</>}</div>}
     {placement&&<div className="atlas-placement-hint">Fai clic sulla mappa per posizionare: <strong>{markerName(placement)}</strong> <button type="button" onClick={()=>setPlacement(null)}>Annulla</button></div>}
     <div className="atlas-map-hint">Trascina per spostarti · +/− per zoom · CTRL + rotellina</div>
    </div>
    <div className="atlas-legend">{markerTypes.map(t=><span key={t.id}><i style={{background:t.color}}/>{t.name}</span>)}</div>
    <p className="atlas-credit">Base cartografica semplificata: Natural Earth (dominio pubblico). Elenco integrato con i codici ISO 3166-1; alcuni territori non hanno un contorno in questa scala. I confini non sono rappresentazioni ufficiali o necessariamente aggiornate.</p>
   </section>
   <aside className="atlas-sidebar">
    <div className="atlas-sidebar-section"><h2>Esplora i Paesi</h2><label className="atlas-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca un Paese…" aria-label="Cerca un Paese"/></label>
     <div className="atlas-country-list">{filteredCountries.map(c=><button key={c.id} type="button" className={activeCountry===c.id?'is-active':''} onClick={()=>focusCountry(c)}>{countryName(c)}<span>{countryMap.has(c.id)?'Scheda':'›'}</span></button>)}</div>
    </div>
    {selectedCountry&&<div className="atlas-sidebar-section atlas-selected"><small>PAESE SELEZIONATO</small><h2>{countryName(selectedCountry)}</h2>
     <p>{selectedCountryEntry?.description||'Non sono ancora disponibili informazioni specifiche per questo Paese.'}</p>{!selectedCountry.path&&<p className="atlas-microstate-note">Questo Paese o territorio non ha un contorno nella mappa semplificata. Puoi comunque creare la scheda e collocare marker.</p>}
     {selectedCountryEntry?<Link className="atlas-link" to={`/pagina/${selectedCountryEntry.id}`}>Apri scheda {isDraft(selectedCountryEntry.id)?'(bozza)':''}<ArrowUpRight size={15}/></Link>:canEdit?<button className="atlas-primary" type="button" onClick={createCountryPage} disabled={busy}><Plus size={15}/>Crea scheda del Paese</button>:<small>La scheda enciclopedica non è ancora stata creata.</small>}
     {countryMarkers.length>0&&<div className="atlas-placed-list"><strong>Luoghi associati</strong>{countryMarkers.map(m=><button type="button" key={m.id} onClick={()=>focusMarker(m)}><MapPin size={13}/>{m.title}</button>)}</div>}
    </div>}
    {selectedMarker&&<div className="atlas-sidebar-section atlas-selected"><small>LUOGO SELEZIONATO {isDraft(selectedMarker.id)?'· BOZZA':''}</small><h2>{selectedMarker.title}</h2><p>{selectedMarker.description||markerName(selectedMarker.atlas.category)}</p><div className="atlas-actions"><Link className="atlas-link" to={`/pagina/${selectedMarker.id}`}>Apri pagina <ExternalLink size={14}/></Link>{canEdit&&<button type="button" className="atlas-small" onClick={()=>editMarker(selectedMarker,pendingPositions[selectedMarker.id])}>Modifica marker</button>}</div></div>}
    <div className="atlas-sidebar-section"><h2>Luoghi registrati</h2><select aria-label="Filtra per tipo di marker" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tutte le categorie</option>{markerTypes.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
     <div className="atlas-placed-list">{visibleMarkers.length?visibleMarkers.map(m=><button type="button" key={m.id} onClick={()=>focusMarker(m)}><span className="atlas-key" style={{background:markerColor(m.atlas.category)}}/>{m.title}{isDraft(m.id)?<small>bozza</small>:null}</button>):<p>Nessun luogo registrato.</p>}</div>
    </div>
    {gm&&<div className="atlas-sidebar-section atlas-gm"><small>EDITOR GM</small><h2>Inserisci un marker</h2><p>Trascina una categoria sulla mappa oppure selezionala e scegli il punto.</p>
     {canEdit?<div className="atlas-marker-palette">{markerTypes.map(t=><button key={t.id} type="button" draggable onDragStart={e=>{e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('application/x-bto-marker',t.id);}} onClick={()=>setPlacement(t.id)} className={placement===t.id?'is-active':''}><span style={{background:t.color}}/>{t.name}<Plus size={15}/></button>)}</div>:<p className="atlas-warning">Importa prima le raccolte Atlante, Paesi e Luoghi dal pacchetto JSON. Le modifiche richiedono l’account GM.</p>}
    </div>}
   </aside>
  </div>
  {edit&&<div className="atlas-modal-backdrop" onMouseDown={e=>e.currentTarget===e.target&&!busy&&cancelEdit()}><form className="atlas-modal" onSubmit={e=>{e.preventDefault();saveMarker(false);}} aria-label="Editor marker">
   <div className="atlas-modal-head"><div><small>EDITOR GM · ATLANTE</small><h2>{edit.id?'Modifica marker':'Nuovo marker e pagina'}</h2></div><button type="button" onClick={cancelEdit} disabled={busy} aria-label="Chiudi"><X size={18}/></button></div>
   <label>Nome del luogo<input autoFocus value={edit.title} maxLength={120} onChange={e=>setEdit(o=>({...o,title:e.target.value}))} required placeholder="Es. Roma, sede principale…"/></label>
   <label>Categoria<select value={edit.category} onChange={e=>setEdit(o=>({...o,category:e.target.value}))}>{markerTypes.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
   <label>Paese associato<select value={edit.countryId} onChange={e=>setEdit(o=>({...o,countryId:e.target.value}))}><option value="">Nessun Paese specificato</option>{countryList.map(c=><option key={c.id} value={c.id}>{countryName(c)}</option>)}</select></label>
   <label>Descrizione breve<textarea rows={3} value={edit.description} onChange={e=>setEdit(o=>({...o,description:e.target.value}))} placeholder="Facoltativa. La pagina può essere approfondita nell’editor del compendio."/></label>
   <div className="atlas-coordinates"><label>Latitudine<input type="number" min="-85" max="85" step="any" value={edit.lat} onChange={e=>setEdit(o=>({...o,lat:e.target.value}))}/></label><label>Longitudine<input type="number" min="-180" max="180" step="any" value={edit.lon} onChange={e=>setEdit(o=>({...o,lon:e.target.value}))}/></label></div>
   <p className="atlas-modal-note">Il marker è anche una pagina del compendio, collegata alla raccolta «Luoghi e marker». Potrai aggiungere testo, immagini e altri collegamenti dall’editor della pagina.</p>
   {error&&<p className="atlas-form-error" role="alert">{error}</p>}
   <div className="atlas-modal-actions"><button type="button" onClick={cancelEdit} disabled={busy}>Annulla</button>{edit.id&&<button type="button" className="atlas-delete" disabled={busy} onClick={deleteMarker}><Trash2 size={15}/> Elimina</button>}<button type="submit" disabled={busy}><Save size={15}/> Salva bozza</button><button type="button" disabled={busy} className="atlas-primary" onClick={()=>saveMarker(true)}><Check size={15}/> Pubblica</button></div>
  </form></div>}
 </div>;
}
