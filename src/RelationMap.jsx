import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ChevronRight, Compass, Focus, Minus, Plus, Search, X } from 'lucide-react';
import { buildRelations, relationsFor } from './relations';
import { useContent } from './content-store';
import {connectionDegrees, degreeStyle, DEGREE_LEGEND} from './graph-metrics.js';

const palette = {
  azure:'#89bce9',lilac:'#ac9ee4',steel:'#9eacbf',rose:'#e69ca8',amber:'#dfb977',violet:'#b3a0e6',gold:'#e5c38e',
};
const p = number => Math.max(-999999,Math.min(999999,number));
const norm = value => String(value||'').toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const rng = (i, seed=1) => {const raw=Math.sin((i+1)*69.17+seed*97.41)*15731.77;return raw-Math.floor(raw);};
function initialNodes(graph) {
  // Solo nodi editoriali reali: radici autonome, nessun nodo "Breach the Oblivion".
  const children = new Map(), parents = new Map();
  for (const edge of graph.edges.filter(e=>e.type==='category')) {
    if (!children.has(edge.source)) children.set(edge.source, []);
    children.get(edge.source).push(edge.target);
    if (!parents.has(edge.target)) parents.set(edge.target, edge.source);
  }
  const all = new Map(graph.nodes.map(n=>[n.id,n]));
  const roots = graph.nodes.filter(n=>!parents.has(n.id));
  const rootIndex = new Map(roots.map((n,i)=>[n.id,i]));
  const positions = new Map();
  const locate = (id, chain=new Set()) => {
    if (positions.has(id)) return positions.get(id);
    if (chain.has(id)) return {x:0,y:0,vx:0,vy:0};
    chain.add(id);
    const parent = parents.get(id);
    if (!parent) {
      const i=rootIndex.get(id)||0;
      const dominant=id==='page:alchimia';
      const alternate=i-(roots.some(n=>n.id==='page:alchimia') ? 1 : 0);
      const angle=-Math.PI/2 + alternate*2*Math.PI/Math.max(1,roots.length-1);
      const position=dominant?{x:0,y:0,vx:0,vy:0}:{x:Math.cos(angle)*410,y:Math.sin(angle)*410,vx:0,vy:0};
      positions.set(id,position);
      return position;
    }
    const base=locate(parent,chain);
    const siblings=children.get(parent)||[];
    const index=Math.max(0,siblings.indexOf(id));
    const angle=-Math.PI/2 + index*2*Math.PI/Math.max(1,siblings.length);
    const parentType=all.get(parent)?.type;
    const radius=parent==='page:alchimia'?260:parentType==='group'?125+Math.min(siblings.length,16)*3:parentType==='chapter'?210:110;
    const position={x:base.x+Math.cos(angle)*radius,y:base.y+Math.sin(angle)*radius,vx:0,vy:0};
    positions.set(id,position);
    return position;
  };
  return new Map(graph.nodes.map((node,i)=>{
    const {x,y,vx,vy}=locate(node.id);
    const jitter=node.type==='chapter'?0:5;
    return [node.id,{x:x+(rng(i,7)-.5)*jitter,y:y+(rng(i,2)-.5)*jitter,vx,vy,r:node.type==='chapter'?12:node.type==='group'?10:7}];
  }));
}
// Per la Home mostriamo un estratto leggibile, senza sostituire il grafo completo.
function previewRelations(graph) {
  const anchors=graph.nodes.filter(n=>n.type==='chapter'||n.type==='group');
  const scores=new Map(graph.nodes.map(n=>[n.id,0]));
  for (const edge of graph.edges.filter(e=>e.type==='reference')) {
    scores.set(edge.source,(scores.get(edge.source)||0)+1);
    scores.set(edge.target,(scores.get(edge.target)||0)+1);
  }
  const notable=graph.nodes.filter(n=>n.type==='material'||n.type==='process'||n.type==='page')
    .sort((a,b)=>(scores.get(b.id)||0)-(scores.get(a.id)||0)||a.title.localeCompare(b.title,'it'))
    .slice(0,18);
  const ids=new Set([...anchors,...notable].map(n=>n.id));
  return {...graph,nodes:graph.nodes.filter(n=>ids.has(n.id)),edges:graph.edges.filter(e=>ids.has(e.source)&&ids.has(e.target))};
}
function relatedNodes(graph, id) {
  if (!id) return [];
  const index=new Map(graph.nodes.map(n=>[n.id,n]));
  const seen=new Set();
  return graph.edges.filter(e=>e.source===id||e.target===id).map(e=>{
    const other=index.get(e.source===id?e.target:e.source);
    if(!other||seen.has(other.id))return null;
    seen.add(other.id);
    return {...other,relation:e.type};
  }).filter(Boolean);
}
function ConnectionsCanvas({graph, theme, query, relationsOnly, selected, onHover, onSelect, controller, forceDark=false, ambient=false}) {
  const canvasRef=useRef(null), state=useRef(null), hovered=useRef(null), filter=useRef({query:'',relationsOnly:false,selected:null});
  const choose=useRef(onSelect),hover=useRef(onHover);
  choose.current=onSelect;hover.current=onHover;
  filter.current={query:norm(query),relationsOnly,selected};
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext('2d');if(!ctx)return;
    const positions=initialNodes(graph), nodes=graph.nodes.map(n=>({...n,...positions.get(n.id)}));
    const nodeById=new Map(nodes.map(n=>[n.id,n]));
    const degrees=connectionDegrees(graph),referenceDegrees=connectionDegrees(graph,true);
    const edges=graph.edges.map(e=>({...e,a:nodeById.get(e.source),b:nodeById.get(e.target)})).filter(e=>e.a&&e.b);
    const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const s={nodes,edges,nodeById,scale:.76,panX:0,panY:0,width:100,height:100,dpr:1,drag:null,turn:0,raf:null,dirty:true,lastFrame:0,ambientTime:0};state.current=s;
    const fit=()=>{ const bounds=nodes.reduce((v,n)=>({minX:Math.min(v.minX,n.x),maxX:Math.max(v.maxX,n.x),minY:Math.min(v.minY,n.y),maxY:Math.max(v.maxY,n.y)}),{minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity});
      const w=Math.max(1,bounds.maxX-bounds.minX+120),h=Math.max(1,bounds.maxY-bounds.minY+100);
      s.scale=Math.max(.36,Math.min(1.24,Math.min(s.width/w,s.height/h)));
      s.panX=-(bounds.maxX+bounds.minX)/2*s.scale;s.panY=-(bounds.maxY+bounds.minY)/2*s.scale;
    };
    const resize=()=>{const rect=canvas.getBoundingClientRect();s.width=Math.max(1,rect.width);s.height=Math.max(1,rect.height);s.dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(s.width*s.dpr);canvas.height=Math.round(s.height*s.dpr);ctx.setTransform(s.dpr,0,0,s.dpr,0,0);if(s.turn===0)fit();};
    const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
    const place=(n)=>{
      const drift=ambient&&!reducedMotion?Math.sin(s.ambientTime*.00039+n.x*.018+n.y*.009)*4.8:0;
      const sway=ambient&&!reducedMotion?Math.cos(s.ambientTime*.00033+n.x*.011-n.y*.013)*4.2:0;
      return {x:s.width/2+s.panX+(n.x+drift)*s.scale,y:s.height/2+s.panY+(n.y+sway)*s.scale};
    };
    const find=(x,y)=>{let closest=null, distance=Infinity;for(const n of nodes){const at=place(n);const d=Math.hypot(at.x-x,at.y-y);if(d<distance&&d<Math.max(16,degreeStyle((filter.current.relationsOnly?referenceDegrees:degrees).get(n.id)||0).radius*s.scale+10)){closest=n;distance=d;}}return closest;};
    const toWorld=(x,y)=>({x:(x-s.width/2-s.panX)/s.scale,y:(y-s.height/2-s.panY)/s.scale});
    const eventPoint=e=>{const rect=canvas.getBoundingClientRect();return {x:e.clientX-rect.left,y:e.clientY-rect.top};};
    const pointerDown=e=>{if(e.button!==0&&e.pointerType==='mouse')return;const {x,y}=eventPoint(e);const hit=find(x,y);s.drag={x,y,oldX:x,oldY:y,hit,start:Date.now(),moved:false};if(hit){hit.fixed=true;canvas.style.cursor='grabbing';}else canvas.style.cursor='grabbing';canvas.setPointerCapture(e.pointerId);};
    const pointerMove=e=>{const{x,y}=eventPoint(e);if(s.drag){const d=s.drag;const dx=x-d.oldX,dy=y-d.oldY;d.oldX=x;d.oldY=y;if(Math.hypot(x-d.x,y-d.y)>5)d.moved=true;if(d.hit){const pt=toWorld(x,y);d.hit.x=pt.x;d.hit.y=pt.y;d.hit.vx=0;d.hit.vy=0;}else{s.panX+=dx;s.panY+=dy;}s.dirty=true;return;}const target=find(x,y);if(hovered.current?.id!==target?.id){hovered.current=target;hover.current(target?.id||null);}canvas.style.cursor=target?'pointer':'grab';};
    const pointerUp=e=>{if(!s.drag)return;const d=s.drag;s.drag=null;try{canvas.releasePointerCapture(e.pointerId);}catch{}if(d.hit){d.hit.fixed=false;if(!d.moved)choose.current?.(d.hit.id);}canvas.style.cursor='grab';};
    const wheel=e=>{e.preventDefault();const {x,y}=eventPoint(e);const scale=s.scale;const next=Math.min(2.45,Math.max(.22,scale*(e.deltaY<0?1.12:.89)));s.panX=(s.panX+s.width/2-x)*(next/scale)+(x-s.width/2);s.panY=(s.panY+s.height/2-y)*(next/scale)+(y-s.height/2);s.scale=next;};
    const animate=(time=0)=>{
      // Anteprima decorativa a ~25 FPS; il grafo completo rimane interattivo.
      if(ambient && time-s.lastFrame<40){s.raf=requestAnimationFrame(animate);return;}
      s.lastFrame=time;s.ambientTime=time;
      if(document.hidden){s.raf=requestAnimationFrame(animate);return;}
      s.turn++;
      if(!ambient && (s.turn<360||s.drag?.hit)){
        for(let i=0;i<nodes.length;i++){
          const a=nodes[i];if(a.fixed)continue;
          let fx=-a.x*.0008,fy=-a.y*.0008;
          for(let j=0;j<nodes.length;j++){
            if(i===j)continue;const b=nodes[j],dx=a.x-b.x,dy=a.y-b.y,dist2=Math.max(1700,dx*dx+dy*dy),r= (a.type==='group'||b.type==='group')?3000:1250;
            fx+=dx/dist2*r/Math.sqrt(dist2);fy+=dy/dist2*r/Math.sqrt(dist2);
          }
          for(const e of edges){let b=null;if(e.a===a)b=e.b;else if(e.b===a)b=e.a;else continue;
            const dx=b.x-a.x,dy=b.y-a.y,dist=Math.max(1,Math.hypot(dx,dy)),len=e.type==='category'?105:170,k=e.type==='category'?.00035:.00011;
            fx+=dx*(dist-len)/dist*k;fy+=dy*(dist-len)/dist*k;
          }
          a.vx=(a.vx+fx)*.9;a.vy=(a.vy+fy)*.9;
        }
        for(const n of nodes)if(!n.fixed){n.x=p(n.x+n.vx);n.y=p(n.y+n.vy);}
      }
      const dark=forceDark||document.documentElement.dataset.theme!=='light';
      ctx.clearRect(0,0,s.width,s.height);
      ctx.fillStyle=dark?'#0b101c':'#f2f1f4';ctx.fillRect(0,0,s.width,s.height);
      const step=36*s.scale;
      if(step>10){const shiftX=((s.panX+s.width/2)%step+step)%step,shiftY=((s.panY+s.height/2)%step+step)%step;ctx.fillStyle=dark?'rgba(190,200,228,.085)':'rgba(45,58,80,.09)';for(let x=shiftX;x<s.width;x+=step)for(let y=shiftY;y<s.height;y+=step){ctx.beginPath();ctx.arc(x,y,.65,0,Math.PI*2);ctx.fill();}}
      const {query:q,relationsOnly:rOnly,selected:sel}=filter.current;
      const focus = ambient ? null : nodeById.get(sel)||nodeById.get(hovered.current?.id);
      const neighbors=new Set(focus?[focus.id,...edges.filter(e=>e.a===focus||e.b===focus).map(e=>(e.a===focus?e.b:e.a).id)]:[]);
      for(const e of edges){if(rOnly&&e.type!=='reference')continue;const a=place(e.a),b=place(e.b);const adjacent=focus&&(e.a===focus||e.b===focus),low=focus&&!adjacent;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=adjacent?(dark?'rgba(223,191,136,.8)':'rgba(133,84,25,.65)'):low?(dark?'rgba(128,146,177,.035)':'rgba(54,70,90,.035)'):e.type==='category'?(dark?'rgba(123,140,169,.19)':'rgba(100,106,126,.18)'):(dark?'rgba(211,168,113,.48)':'rgba(172,113,55,.42)');
        ctx.lineWidth=adjacent?1.6:e.type==='reference'?1.15:.75;if(e.type==='reference')ctx.setLineDash([3,4]);else ctx.setLineDash([]);ctx.stroke();
        // Una scintilla percorre lentamente alcune connessioni nella sola anteprima.
        if(ambient&&!reducedMotion&&e.type==='reference') {
          const offset=((time*.00009+(e.a.x+e.b.y)*.0017)%1+1)%1;
          const x=a.x+(b.x-a.x)*offset,y=a.y+(b.y-a.y)*offset;
          ctx.setLineDash([]);ctx.beginPath();ctx.arc(x,y,1.3+Math.sin(time*.0018)**2*.6,0,Math.PI*2);
          ctx.fillStyle='rgba(232,200,151,.65)';ctx.shadowBlur=9;ctx.shadowColor='rgba(232,200,151,.45)';ctx.fill();ctx.shadowBlur=0;
        }
      }
      ctx.setLineDash([]);
      for(const n of nodes){const pt=place(n),qHit=q&&norm(n.title).includes(q),isFocus=focus===n,isNeighbor=neighbors.has(n.id),muted=focus&&!isNeighbor&&!isFocus;const opacity=muted?.18:q&&!qHit?.36:1;
        const connectivity=(filter.current.relationsOnly?referenceDegrees:degrees).get(n.id)||0;const style=degreeStyle(connectivity);const radius=style.radius*Math.min(1.3,Math.sqrt(s.scale));const color=style.color;
        ctx.globalAlpha=opacity;
        if(isFocus||qHit){ctx.beginPath();ctx.arc(pt.x,pt.y,radius+8,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=.9;ctx.stroke();}
        ctx.beginPath();ctx.arc(pt.x,pt.y,radius+4,0,Math.PI*2);ctx.fillStyle=dark?'rgba(10,13,23,.9)':'rgba(248,248,250,.9)';ctx.fill();
        if(ambient&&!reducedMotion){
          const glow=.5+.5*Math.sin(time*.0013+n.x*.045);
          ctx.beginPath();ctx.arc(pt.x,pt.y,radius+3+glow*2,0,Math.PI*2);
          ctx.fillStyle=`rgba(191,174,222,${(.035+glow*.055).toFixed(3)})`;ctx.fill();
        }
        ctx.beginPath();ctx.arc(pt.x,pt.y,radius,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
        if(n.type==='group'||n.type==='chapter'){ctx.beginPath();ctx.arc(pt.x,pt.y,radius+3.5,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=.75;ctx.stroke();}
        const labelVisible=n.type==='chapter'||n.type==='group'||isFocus||isNeighbor||qHit||connectivity>=6||s.scale>.72;
        if(labelVisible){ctx.font=`${n.type==='chapter'?'650 12':n.type==='group'?'600 11':'500 10'}px 'DM Sans',sans-serif`;
          ctx.fillStyle=dark?'#edf0f9':'#272d42';ctx.textAlign='center';ctx.textBaseline='top';
          const txt=n.title.length>24?n.title.slice(0,23)+'…':n.title;
          ctx.fillText(txt,pt.x,pt.y+radius+8);
        }
        ctx.globalAlpha=1;
      }
      s.raf=requestAnimationFrame(animate);
    };
    s.raf=requestAnimationFrame(animate);
    if(!ambient){
      canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerUp);canvas.addEventListener('wheel',wheel,{passive:false});
    }
    controller.current=ambient?null:{fit,zoom:factor=>{s.scale=Math.min(2.45,Math.max(.22,s.scale*factor));},focus:id=>{const n=nodeById.get(id);if(!n)return;s.panX=-n.x*s.scale;s.panY=-n.y*s.scale;}};
    return ()=>{cancelAnimationFrame(s.raf);observer.disconnect();if(!ambient){canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',pointerUp);canvas.removeEventListener('wheel',wheel);}controller.current=null;};
  },[graph,controller,forceDark,ambient]);
  return <canvas ref={canvasRef} className={`relation-canvas${ambient?' relation-canvas-ambient':''}`} role="img" aria-label={ambient?'Anteprima animata e non interattiva delle relazioni tra le voci del compendio':'Mappa interattiva: il clic seleziona un nodo, non apre immediatamente la pagina. Utilizza anche l’elenco dei nodi per la navigazione con la tastiera.'}/>;
}
export function HomeConnectionPreview({theme}) {
  const {materials,processes,pages}=useContent();
  const graph=useMemo(()=>buildRelations(materials,processes,pages),[materials,processes,pages]);
  const excerpt=useMemo(()=>previewRelations(graph),[graph]);
  const controls=useRef(null);
  return <section className="home-atlas home-atlas-ambient" aria-label="Anteprima delle connessioni del compendio">
    <div className="home-atlas-heading"><span className="home-atlas-eyebrow"><span className="home-atlas-indicator"/> ATLANTE DELLE CONNESSIONI</span><Link to="/connessioni" className="home-atlas-expand">Apri la mappa <ArrowUpRight size={16}/></Link></div>
    <div className="home-atlas-stage home-atlas-ambient-stage">
      <ConnectionsCanvas graph={excerpt} theme={theme} query="" selected={null} relationsOnly={false} controller={controls} forceDark ambient/>
      <div className="home-atlas-stage-hint" aria-hidden="true">ANTEPRIMA · VISUALIZZAZIONE</div>
    </div>
    <div className="home-atlas-detail home-atlas-ambient-detail">
      <span className="home-atlas-ambient-stats"><Compass size={17} strokeWidth={1.5}/>{graph.nodes.length} nodi <span aria-hidden="true">·</span> {graph.referenceCount} riferimenti</span>
      <span className="home-atlas-ambient-note">Nodi più grandi e caldi = più collegamenti</span>
    </div>
  </section>;
}
export default function RelationMap({theme}) {
  const {materials,processes,pages}=useContent();
  const graph=useMemo(()=>buildRelations(materials,processes,pages),[materials,processes,pages]);
  const [query,setQuery]=useState(''),[selected,setSelected]=useState(null),[hovered,setHovered]=useState(null),[relationsOnly,setRelationsOnly]=useState(false);
  const controls=useRef(null),navigate=useNavigate();
  // Il conteggio deve precedere tutte le sort che lo utilizzano, anche al primo hover.
  const degrees=useMemo(()=>connectionDegrees(graph,relationsOnly),[graph,relationsOnly]);
  const focused=graph.nodes.find(n=>n.id===(selected||hovered));
  const links=focused?relationsFor(graph,focused.id):null;
  const related=relatedNodes(graph,focused?.id).filter(n=>!relationsOnly||n.relation==='reference').sort((a,b)=>(degrees.get(b.id)||0)-(degrees.get(a.id)||0));
  const found=graph.nodes.filter(n=>norm(n.title).includes(norm(query))).sort((a,b)=>(degrees.get(b.id)||0)-(degrees.get(a.id)||0)||a.title.localeCompare(b.title,'it'));
  return <div className="graph-page page-width">
    <div className="breadcrumb"><Link to="/">HOME</Link><ChevronRight size={14}/>ATLANTE</div>
    <div className="graph-heading"><div><span className="eyebrow">IL COMPENDIO, IN RELAZIONE</span><h1>Atlante delle connessioni</h1><p>Colori e dimensioni indicano quante voci sono collegate. Linee continue: gerarchia; tratteggiate: rimandi espliciti.</p></div><div className="graph-stat">{graph.nodes.length} NODI <span>·</span> {graph.referenceCount} RIFERIMENTI</div></div>
    <div className="graph-layout">
      <section className="graph-stage" aria-label="Grafo delle relazioni">
        <div className="graph-stage-top"><span><span className="graph-live-dot"/> MAPPA INTERATTIVA</span><span>Trascina · Zoom · Clicca per selezionare</span></div>
        <ConnectionsCanvas graph={graph} theme={theme} query={query} selected={selected} relationsOnly={relationsOnly} onHover={setHovered} onSelect={setSelected} controller={controls}/>
        <div className="graph-zoom"><button type="button" aria-label="Ingrandisci" title="Ingrandisci" onClick={()=>controls.current?.zoom(1.3)}><Plus size={17}/></button><button type="button" aria-label="Riduci" title="Riduci" onClick={()=>controls.current?.zoom(.77)}><Minus size={17}/></button><button type="button" aria-label="Inquadra tutto" title="Inquadra tutto" onClick={()=>controls.current?.fit()}><Focus size={17}/></button></div>
        <div className="graph-legend graph-degree-legend"><strong>COLLEGAMENTI · colore e dimensione dei nodi</strong>{DEGREE_LEGEND.map(t=><span key={t.label}><i style={{background:t.color,width:t.radius*1.3,height:t.radius*1.3,borderRadius:'50%'}}/>{t.label}</span>)}</div>
      </section>
      <aside className="graph-panel"><label className="graph-search"><Search size={17}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cerca pagine e materiali…" aria-label="Cerca un nodo"/>{query&&<button aria-label="Pulisci ricerca" onClick={()=>setQuery('')} type="button"><X size={15}/></button>}</label>
        <label className="graph-check"><input type="checkbox" checked={relationsOnly} onChange={e=>setRelationsOnly(e.target.checked)}/> Solo riferimenti testuali</label>
        <div className="graph-panel-content">{focused?<><div className="graph-section-label">NODO SELEZIONATO</div><div className="graph-focus-card"><small>{focused.type==='material'?'MATERIALE':focused.type==='process'?'PROCESSO':focused.type==='group'?'CATEGORIA':focused.type==='chapter'?'SEZIONE':'PAGINA'}</small><strong>{focused.title}</strong><span className="graph-degree-counter">{degrees.get(focused.id)||0} connessioni dirette</span><button type="button" onClick={()=>navigate(focused.url)}>Apri scheda <ArrowUpRight size={15}/></button></div>
          {related.length>0&&<div className="graph-connections"><div className="graph-section-label">CONNESSIONI <span>{related.length}</span></div>{related.slice(0,22).map(n=><button type="button" key={n.id} onClick={()=>{setSelected(n.id);controls.current?.focus(n.id);}}><span className="graph-node-dot" style={{background:degreeStyle(degrees.get(n.id)||0).color}}/>{n.title}<ChevronRight size={13}/></button>)}</div>}</>:<><div className="graph-section-label">ESPLORA</div><p className="graph-aside-description">I nodi sono ordinati per numero di collegamenti. Le linee continue rappresentano appartenenza, quelle tratteggiate collegamenti testuali. Clicca un nodo per selezionarlo.</p></>}
          <div className="graph-section-label">{query?'RISULTATI':'NODI'} <span>{found.length}</span></div><div className="graph-node-results">{found.map(n=><button type="button" key={n.id} className={selected===n.id?'active':''} onClick={()=>{setSelected(n.id);controls.current?.focus(n.id);}}><span className="graph-node-dot" style={{background:degreeStyle(degrees.get(n.id)||0).color}}/><span>{n.title}</span><small>{degrees.get(n.id)||0}</small><ChevronRight size={14}/></button>)}{!found.length&&<span className="graph-empty">Nessun risultato.</span>}</div>
        </div>
      </aside>
    </div>
  </div>;
}
