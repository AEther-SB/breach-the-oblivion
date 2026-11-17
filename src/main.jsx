import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown,
  ChevronLeft, ChevronRight, Copy, Droplets, Flame, FlaskConical, Layers3, Menu,
  Moon, Orbit, Search, Shield, SlidersHorizontal, Sun, X,
} from 'lucide-react';
import compendium from './data/compendium.json';
import { ContentProvider, useContent, normalize, slug } from './content-store';
import { sanitizeHtml, validatedImageUrl } from './sanitize';
import { EditTrigger, GMControls, GenericBlocks } from './editor';
import { buildRelations, relationsFor, glossaryEntries, linkedHtml, routes } from './relations';
import RelationMap, { HomeConnectionPreview } from './RelationMap';
import Prerequisites from './Prerequisites';
import './styles.css';
import './premium.css';
import './atlas-home.css';
import './refinement.css';
import './motion.css';

const ALCHEMY = '/alchimia';
const MATERIALS = '/alchimia/materiali';
const GENESIS = '/alchimia/processi';
const RELATIONS = '/connessioni';
const abilityLabel = { int: 'Intelligenza', wis: 'Saggezza', cha: 'Carisma', str: 'Forza', dex: 'Destrezza', con: 'Costituzione' };
const groupStyle = { 'Elementi': 'elements', 'Metalli Planetari': 'planetary', 'Metalli Pesanti': 'heavy', 'Materia Vitale': 'vital', 'Compositi': 'composite' };
const groupIcons = { 'Elementi': Droplets, 'Metalli Planetari': Orbit, 'Metalli Pesanti': Shield, 'Materia Vitale': Flame, 'Compositi': FlaskConical };
const clean = (html) => String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const entryUrl = entry => entry.kind === 'material' ? `${MATERIALS}/${entry.materialId}` : entry.kind === 'genesis' ? GENESIS : entry.id === 'alchimia' ? ALCHEMY : `/pagina/${entry.id}`;
function useCatalog() {
  const {materials, processes, pages} = useContent();
  const groups = [...new Set(materials.map(m=>m.group))];
  const byName = [...materials].sort((a,b)=>a.title.localeCompare(b.title,'it'));
  const matSearch = new Map(materials.map(m=>[m.id,normalize([m.title,m.group,m.bonus,m.requirementsText,m.profile?.theme,m.profile?.history,...(m.abilities||[]).map(a=>`${a.name} ${clean(a.html)}`)].join(' '))]));
  const searchItems = [
    ...materials.map(m=>({key:m.id,type:'Materiale',title:m.title,subtitle:m.group,url:entryUrl(m),index:[m.title,m.group,m.bonus,m.requirementsText,m.profile?.theme,m.profile?.history].join(' '),featured:true})),
    ...materials.flatMap(m=>(m.abilities||[]).map(a=>({key:`${m.id}-${a.name}`,type:'Capacità',title:a.name,subtitle:`${m.title} · Grado ${a.level}`,url:`${entryUrl(m)}?abilita=${encodeURIComponent(a.name)}`,index:`${a.name} ${m.title} ${clean(a.html)}`}))),
    ...processes.map((g,i)=>({key:g.id,type:'Processo',title:g.title,subtitle:'Processo alchemico',url:`${GENESIS}?abilita=${i}`,index:`${g.title} ${clean(g.html)}`})),
    ...pages.filter(p=>p.id!=='alchimia').map(p=>({key:p.id,type:p.kind==='chapter'?'Sezione':'Pagina',title:p.title,subtitle:p.description||'Compendio',url:entryUrl(p),index:[p.title,p.description,...(p.blocks||[]).map(b=>`${b.html||''} ${b.text||''}`)].join(' ')}))
  ].map(item=>({...item,search:normalize(item.index),nameIndex:normalize(item.title)}));
  return {materials, processes, pages, groups, byName, matSearch, searchItems};
}

function SiteMark({ size = 38 }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="site-mark">
    <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="1.05" />
    <path d="M24 3 40 24 24 45 8 24 24 3Z" stroke="currentColor" fill="none" strokeWidth="1.05" />
    <circle cx="24" cy="24" r="5" fill="currentColor" />
    <path d="M24 11v8M24 29v8M11 24h8M29 24h8" stroke="currentColor" strokeWidth=".8" />
  </svg>;
}

function HeroSeal() {
  return <div className="hero-seal" aria-hidden="true">
    <div className="seal-coordinates seal-coordinates-top">BREACH · THE OBLIVION</div>
    <svg viewBox="0 0 460 460" className="seal-svg">
      <circle cx="230" cy="230" r="208" fill="none" stroke="currentColor" strokeWidth=".8" opacity=".38"/>
      <circle cx="230" cy="230" r="189" fill="none" stroke="currentColor" strokeWidth=".8" opacity=".45" strokeDasharray="3 9"/>
      <circle cx="230" cy="230" r="159" fill="none" stroke="currentColor" strokeWidth=".9" opacity=".65"/>
      <circle cx="230" cy="230" r="132" fill="none" stroke="currentColor" strokeWidth=".7" opacity=".35"/>
      <polygon points="230,69 369,310 91,310" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".76"/>
      <polygon points="230,391 91,150 369,150" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".76"/>
      <circle cx="230" cy="230" r="71" fill="none" stroke="currentColor" strokeWidth=".8"/>
      <path d="M230 151 294 230 230 309 166 230Z" fill="none" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="230" cy="230" r="18" fill="currentColor"/>
      <circle cx="230" cy="230" r="6" fill="var(--seal-core)"/>
      <circle cx="230" cy="22" r="3" fill="currentColor"/>
      <circle cx="230" cy="438" r="3" fill="currentColor"/>
      <circle cx="22" cy="230" r="3" fill="currentColor"/>
      <circle cx="438" cy="230" r="3" fill="currentColor"/>
      <path d="M230 6v26M230 428v26M6 230h26M428 230h26" stroke="currentColor" strokeWidth="1.4"/>
      <text x="230" y="118" textAnchor="middle" fontSize="15" fill="currentColor" fontFamily="serif">A</text>
      <text x="340" y="235" textAnchor="middle" fontSize="15" fill="currentColor" fontFamily="serif">Ω</text>
      <text x="120" y="235" textAnchor="middle" fontSize="15" fill="currentColor" fontFamily="serif">Δ</text>
      <text x="230" y="354" textAnchor="middle" fontSize="13" fill="currentColor" fontFamily="serif">V</text>
    </svg>
    <div className="seal-coordinates seal-coordinates-bottom">BREACH THE OBLIVION</div>
  </div>;
}

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('bto-theme') || 'dark'; }
    catch { return 'dark'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b101b' : '#f5f3f0');
    try { localStorage.setItem('bto-theme', theme); } catch {}
  }, [theme]);
  return [theme, () => setTheme(t => t === 'light' ? 'dark' : 'light')];
}

function ScrollManager() {
  const loc = useLocation();
  useEffect(() => {
    const target = new URLSearchParams(loc.search).get('abilita');
    if (target != null) {
      const id = loc.pathname.startsWith(`${MATERIALS}/`) ? `abilita-${slug(target)}` : `voce-${target}`;
      const raf = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'auto' }));
      return () => cancelAnimationFrame(raf);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
    for (const area of document.querySelectorAll('.detail-main, .detail-sidebar, .catalog-scroll, .reading-body')) area.scrollTop = 0;
  }, [loc.pathname, loc.search]);
  return null;
}

function GlobalSearch({ open, close }) {
  const [term, setTerm] = useState('');
  const {searchItems,materials,processes}=useCatalog();
  const input = useRef(null);
  const navigate = useNavigate();
  useEffect(() => { if (open) { setTerm(''); requestAnimationFrame(() => input.current?.focus()); } }, [open]);
  useEffect(() => { if (!open) return; const key = e => { if (e.key === 'Escape') close(); }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key); }, [open, close]);
  const hits = useMemo(() => {
    const q = normalize(term).trim();
    if (q.length < 2) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    return searchItems.filter(r => tokens.every(t => r.search.includes(t)))
      .sort((a,b) => Number(b.nameIndex.startsWith(q)) - Number(a.nameIndex.startsWith(q)) || Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || a.title.localeCompare(b.title, 'it')).slice(0, 12);
  }, [term, searchItems]);
  if (!open) return null;
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && close()}>
    <section role="dialog" aria-modal="true" aria-label="Ricerca nel compendio" className="search-dialog">
      <div className="search-dialog-head"><Search size={20}/><input ref={input} aria-label="Cerca nel compendio" value={term} onChange={e => setTerm(e.target.value)} placeholder="Materiali, capacità, processi…"/><button type="button" className="icon-button" onClick={close} aria-label="Chiudi ricerca"><X size={20}/></button></div>
      <div className="search-dialog-results">
        {term.trim().length < 2 ? <div className="search-prompt"><span>Ricerca in tutto il compendio</span><p>{materials.length} materiali, {materials.reduce((n,m)=>n+(m.abilities?.length||0),0)} capacità e {processes.length} processi.</p></div> : hits.length ? hits.map(hit => <button className="search-result" type="button" key={hit.key} onClick={() => { close(); navigate(hit.url); }}>
          <span className="search-result-icon"><BookOpen size={17}/></span><span className="search-result-copy"><strong>{hit.title}</strong><small>{hit.subtitle}</small></span><span className="search-result-type">{hit.type}</span><ArrowUpRight size={16}/>
        </button>) : <div className="search-prompt"><span>Nessun risultato</span><p>Prova un'altra parola.</p></div>}
      </div>
      <div className="search-dialog-foot"><span>ESC per chiudere</span><span>⌘ / Ctrl + K per aprire</span></div>
    </section>
  </div>;
}

function Layout({ theme, toggleTheme }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const {pages,gm,error,seeded} = useContent();
  useEffect(() => setMobileOpen(false), [location.pathname]);
  useEffect(() => {
    const key = e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); } };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);
  useEffect(() => { document.body.classList.toggle('prevent-scroll', mobileOpen || searchOpen); return () => document.body.classList.remove('prevent-scroll'); }, [mobileOpen, searchOpen]);
  const navigation = [ ['/', 'HOME'], [ALCHEMY, 'ALCHIMIA'], ...pages.filter(p=>p.kind==='chapter'&&p.parentId==='root'&&p.id!=='alchimia').map(p=>[entryUrl(p),p.title.toLocaleUpperCase('it')]) ];
  useEffect(() => {
    document.documentElement.dataset.section = location.pathname.startsWith(RELATIONS) ? 'connessioni' : location.pathname.startsWith(MATERIALS) ? 'materiali' : location.pathname.startsWith(GENESIS) ? 'processi' : location.pathname.startsWith(ALCHEMY) ? 'alchimia' : 'home';
  },[location.pathname]);
  const headerNav = (mobile=false) => navigation.map(([href, text]) => <NavLink key={href} onClick={mobile ? () => setMobileOpen(false) : undefined} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} to={href} end={href === '/'}>{text}</NavLink>);
  return <>
    <ScrollManager/>
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="site-brand" aria-label="Compendio, homepage"><SiteMark size={34}/><span className="brand-name">BREACH THE OBLIVION<span className="brand-subtitle">COMPENDIO</span></span></Link>
        <nav aria-label="Navigazione principale" className="desktop-nav">{headerNav()}</nav>
        <div className="header-actions">
          <button className="search-trigger" type="button" onClick={() => setSearchOpen(true)} aria-label="Cerca nel compendio"><Search size={18}/><span>Cerca</span><kbd>⌘ K</kbd></button>
          <GMControls/>
          <button className="icon-button theme-toggle" type="button" aria-label={theme === 'dark' ? 'Attiva modalità giorno' : 'Attiva modalità notte'} title={theme === 'dark' ? 'Modalità giorno' : 'Modalità notte'} onClick={toggleTheme}>{theme === 'dark' ? <Sun size={19}/> : <Moon size={19}/>}</button>
          <button className="icon-button mobile-menu-button" type="button" onClick={() => setMobileOpen(true)} aria-label="Apri menu"><Menu size={22}/></button>
        </div>
      </div>
    </header>
    {mobileOpen && <div className="mobile-nav-overlay" onMouseDown={e => e.currentTarget === e.target && setMobileOpen(false)}><nav className="mobile-nav" aria-label="Navigazione mobile"><div className="mobile-nav-title"><span>Esplora</span><button type="button" className="icon-button" onClick={() => setMobileOpen(false)} aria-label="Chiudi menu"><X/></button></div>{headerNav(true)}<button className="mobile-nav-search" type="button" onClick={() => { setMobileOpen(false); setSearchOpen(true); }}><Search size={18}/> Cerca nel compendio</button></nav></div>}
    <main id="contenuto"><Routes>
      <Route path="/" element={<Home theme={theme}/>}/>
      <Route path={ALCHEMY} element={<AlchemyHome/>}/>
      <Route path={MATERIALS} element={<Materials/>}/>
      <Route path={`${MATERIALS}/:id`} element={<MaterialDetail/>}/>
      <Route path={GENESIS} element={<GenesisPage/>}/>
      <Route path={RELATIONS} element={<RelationMap theme={theme}/>}/>
      <Route path="/alchimia/connessioni" element={<LegacyRedirect path={RELATIONS}/>}/>
      <Route path="/alchimia/processi-di-genesi" element={<LegacyRedirect path={GENESIS}/>}/>
      <Route path="/pagina/:id" element={<GenericPage/>}/>
      <Route path="/materiali" element={<LegacyRedirect path={MATERIALS}/>}/>
      <Route path="/materiali/:id" element={<LegacyMaterialRedirect/>}/>
      <Route path="/genesi" element={<LegacyRedirect path={GENESIS}/>}/>
      <Route path="/processi" element={<LegacyRedirect path={GENESIS}/>}/>
      <Route path="/classe" element={<LegacyRedirect path={ALCHEMY}/>}/>
      <Route path="/classi" element={<LegacyRedirect path={ALCHEMY}/>}/>
      <Route path="/classi/exalt" element={<LegacyRedirect path={ALCHEMY}/>}/>
      <Route path="*" element={<MissingPage/>}/>
    </Routes></main>
    <footer className="site-footer"><div className="footer-inner"><div className="footer-brand"><SiteMark size={25}/><span>BREACH THE OBLIVION</span></div><span>Alchimia · Fonte: Suite BTE v{compendium.version}</span><Link to={ALCHEMY}>Alchimia <ArrowRight size={14}/></Link></div></footer>
    <GlobalSearch open={searchOpen} close={() => setSearchOpen(false)}/>
  </>;
}

const alchemyCards = [
  { title:'Materiali alchemici', subtitle:'Materiali e capacità', to:MATERIALS, tone:'elements', number:'01', icon:FlaskConical, featured:true, cta:'Consulta i materiali' },
  { title:'Processi alchemici', subtitle:'Le operazioni della trasformazione', to:GENESIS, tone:'composite', number:'02', icon:Layers3, cta:'Esplora i processi' },
];
function SectionCards({cards}) {
  return <div className="home-grid">{cards.map(card => {const Icon=card.icon;return <Link className={`home-card ${card.featured ? 'home-card-featured' : ''} tone-${card.tone}`} to={card.to} key={card.to}><div className="home-card-top"><span>{card.number} / SEZIONE</span><Icon size={25} strokeWidth={1.5}/></div><div><h3>{card.title}</h3><p>{card.subtitle}</p></div><span className="home-card-bottom">{card.cta}<ArrowUpRight size={19}/></span></Link>})}</div>;
}
function Home({theme}) {
  const {materials,processes,pages}=useCatalog();
  const homeCards=[{title:'Alchimia',subtitle:'Materiali e processi alchemici',to:ALCHEMY,tone:'composite',number:'01',icon:FlaskConical,featured:true,cta:'Apri Alchimia'}, ...pages.filter(p=>p.parentId==='root'&&p.id!=='alchimia').map((p,i)=>({title:p.title,subtitle:p.description||'Compendio',to:entryUrl(p),tone:'heavy',number:String(i+2).padStart(2,'0'),icon:BookOpen,cta:'Apri pagina'}))];
  const abilities=materials.reduce((n,m)=>n+(m.abilities||[]).length,0);
  return <div className="home-page">
    <section className="home-hero">
      <div className="hero-inner page-width">
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line"/> COMPENDIO</div><h1>Breach<br/><em>the Oblivion.</em></h1><p>Il compendio di Breach the Oblivion, a partire dall’alchimia.</p><div className="hero-cta"><Link className="primary-button" to={ALCHEMY}>Esplora Alchimia <ArrowUpRight size={19}/></Link></div><div className="hero-stats"><div><strong>{materials.length}</strong><span>Materiali</span></div><div><strong>{abilities}</strong><span>Capacità</span></div><div><strong>{processes.length}</strong><span>Processi</span></div></div></div>
        <HomeConnectionPreview theme={theme}/>
      </div>
      <div className="hero-bottom-line page-width"><span>BREACH THE OBLIVION · COMPENDIO</span><span>VERSIONE ALCHIMIA {compendium.version}</span></div>
    </section>
    <section className="home-explore page-width"><SectionCards cards={homeCards}/></section>
  </div>;
}
function AlchemyHome() {
  const {pages,materials,processes}=useCatalog();
  const current=pages.find(p=>p.id==='alchimia');
  const extra=pages.filter(p=>p.parentId==='alchimia'&&p.id!=='alchimia').map((p,i)=>({title:p.title,subtitle:p.description||'Pagina del compendio',to:entryUrl(p),tone:'planetary',number:String(i+4).padStart(2,'0'),icon:BookOpen,cta:'Apri'}));
  const cards=[{...alchemyCards[0],subtitle:`${materials.length} materiali · ${materials.reduce((n,m)=>n+(m.abilities||[]).length,0)} capacità`},{...alchemyCards[1],subtitle:`${processes.length} processi`},...extra];
  return <div className="section-landing page-width"><div className="breadcrumb"><Link to="/">Home</Link><ChevronRight size={15}/>Alchimia</div><PageHeading eyebrow="BREACH THE OBLIVION" title={current?.title||"Alchimia"} text={current?.description?.replaceAll('Processi di Genesi','processi alchemici')||"Materiali e processi alchemici."} trailing={<EditTrigger entry={current}/>}/><div className="section-landing-cards"><SectionCards cards={cards}/></div></div>;
}
function LegacyRedirect({ path }) { const loc = useLocation(); return <Navigate to={`${path}${loc.search}`} replace/>; }
function LegacyMaterialRedirect() { const {id} = useParams(); const loc=useLocation(); return <Navigate to={`${MATERIALS}/${id}${loc.search}`} replace/>; }

function PageHeading({ eyebrow, title, text, trailing }) { return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{text&&<p>{text}</p>}</div>{trailing}</div>; }
function GroupIcon({group,size=18}) { const Icon = groupIcons[group] || FlaskConical; return <Icon size={size} strokeWidth={1.6}/>; }
function MaterialCard({material}) {
  return <Link to={`${MATERIALS}/${material.materialId}`} className={`material-card tone-${groupStyle[material.group]}`}>
    <div className="material-card-top"><span className="material-card-group"><GroupIcon group={material.group} size={15}/>{material.group}</span><ArrowUpRight size={18}/></div>
    <div className="material-card-title"><span className="material-card-symbol">{material.symbol || '◇'}</span><h3>{material.title}</h3></div>
    <p className="material-card-bonus">{material.bonus}</p>
    <div className="material-card-bottom"><span>{material.abilities.length} {material.abilities.length === 1 ? 'capacità' : 'capacità'}</span><span className="material-levels">{material.abilities.map(a=><span key={a.level}>{a.level}</span>)}</span></div>
  </Link>;
}
function Materials() {
  const {materials,groups,matSearch}=useCatalog();
  const location = useLocation();
  const startingCategory = new URLSearchParams(location.search).get('categoria');
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState(startingCategory && groups.includes(startingCategory) ? startingCategory : 'Tutti');
  useEffect(()=>{setCategory(startingCategory && groups.includes(startingCategory) ? startingCategory : 'Tutti');},[startingCategory,groups.join('|')]);
  const [order,setOrder]=useState('group');
  const filtered=useMemo(()=>{
    const tokens=normalize(query).trim().split(/\s+/).filter(Boolean);
    const arr=materials.filter(m=>(category==='Tutti'||m.group===category)&&tokens.every(t=>matSearch.get(m.id).includes(t)));
    return order==='alpha'? [...arr].sort((a,b)=>a.title.localeCompare(b.title,'it')) : arr;
  },[query,category,order,materials,matSearch]);
  return <div className="catalog-page page-width"><div className="breadcrumb"><Link to="/">Home</Link><ChevronRight size={15}/><Link to={ALCHEMY}>Alchimia</Link><ChevronRight size={15}/>Materiali</div><PageHeading eyebrow="L’ARTE ALCHEMICA" title="Materiali alchemici" text={`${groups.length} categorie. ${materials.length} materiali. Capacità per grado.`} trailing={<div className="page-heading-count"><strong>{materials.length}</strong><span>MATERIALI</span></div>}/>
    <div className="catalog-toolbar"><div className="catalog-search"><Search size={18}/><input aria-label="Cerca nei materiali e nelle capacità" type="search" placeholder="Cerca materiale o capacità..." value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')} aria-label="Cancella ricerca" type="button"><X size={17}/></button>}</div><label className="catalog-order"><SlidersHorizontal size={17}/><select value={order} onChange={e=>setOrder(e.target.value)} aria-label="Ordina materiali"><option value="group">Per categoria</option><option value="alpha">A–Z</option></select></label></div>
    <div className="category-tabs" aria-label="Filtra per categoria">{['Tutti',...groups].map(g=><button type="button" key={g} className={category===g?'category-tab active':'category-tab'} onClick={()=>setCategory(g)} aria-pressed={category===g}>{g}<span>{g==='Tutti'?materials.length:materials.filter(m=>m.group===g).length}</span></button>)}</div>
    <div className="catalog-scroll" tabIndex={0} aria-label="Elenco materiali"><div className="catalog-result-line"><span>{filtered.length} {filtered.length===1?'materiale':'materiali'}{query?' trovati':''}</span>{(query||category!=='Tutti')&&<button type="button" onClick={()=>{setQuery('');setCategory('Tutti');}}>Azzera filtri</button>}</div>
    {filtered.length? <div className="materials-grid">{filtered.map(m=><MaterialCard key={m.id} material={m}/>)}</div> : <div className="empty-results"><FlaskConical size={34}/><h2>Nessun materiale trovato</h2><p>Prova con un altro termine o cambia categoria.</p><button type="button" className="secondary-button" onClick={()=>{setQuery('');setCategory('Tutti');}}>Mostra tutti</button></div>}</div>
  </div>;
}
function Rule({ html, currentId }) {
  const {materials,processes} = useContent();
  const glossary = useMemo(()=>glossaryEntries(materials,processes,currentId),[materials,processes,currentId]);
  const result = useMemo(()=>linkedHtml(sanitizeHtml(html),glossary),[html,glossary]);
  return <div className="rules" dangerouslySetInnerHTML={{__html:result}}/>;
}
function LinkedText({text,currentId, className}) {
  const {materials,processes}=useContent();
  const glossary=useMemo(()=>glossaryEntries(materials,processes,currentId),[materials,processes,currentId]);
  const result=useMemo(()=>linkedHtml(sanitizeHtml(`<span>${String(text||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>`),glossary),[text,glossary]);
  return <p className={className} dangerouslySetInnerHTML={{__html:result}}/>;
}
function AbilityList({ features, kind='material', currentId=null, scrollPrefix='abilita', expandAllLabel='Espandi tutte', collapseAllLabel='Comprimi tutte' }) {
  const [expanded,setExpanded] = useState(() => kind === 'material' || kind === 'process' ? new Set() : new Set(features.map((f,i)=>`${i}`)));
  const loc=useLocation();
  useEffect(()=>setExpanded(kind === 'material' || kind === 'process' ? new Set() : new Set(features.map((f,i)=>`${i}`))),[features,kind]);
  useEffect(()=>{
    const target=new URLSearchParams(loc.search).get('abilita');
    if(target==null)return;
    const i=features.findIndex((f,j)=>kind==='material'?f.name===target:`${j}`===target);
    if(i>=0) setExpanded(prev=>new Set([...prev,`${i}`]));
  },[loc.search,features,kind]);
  const allExpanded=features.length===expanded.size;
  return <><div className="abilities-bar"><h2>{kind==='material'?'Capacità del materiale':kind==='process'?'Processi alchemici':'Privilegi e capacità'}<span>{features.length}</span></h2><button type="button" className="expand-button" onClick={()=>setExpanded(allExpanded?new Set():new Set(features.map((f,i)=>`${i}`)))}>{allExpanded?collapseAllLabel:expandAllLabel}<ChevronDown size={16} className={allExpanded?'rotate-icon':''}/></button></div><div className="ability-list">{features.map((feat,i)=>{ const key=`${i}`; const open=expanded.has(key); const id=kind==='material'?`${scrollPrefix}-${slug(feat.name)}`:`voce-${i}`;
      return <section key={`${feat.name}-${i}`} className={`ability-entry ${open?'open':''}`} id={id}>
        <button className="ability-head" type="button" aria-expanded={open} aria-controls={`body-${id}`} onClick={()=>setExpanded(prev=>{const next=new Set(prev);next.has(key)?next.delete(key):next.add(key);return next;})}>
          <span className="ability-level">{kind==='material'?`GRADO ${feat.level}`:kind==='process'?`PROCESSO ${String(i+1).padStart(2,'0')}`:feat.level?`LIVELLO ${feat.level}`:String(i+1).padStart(2,'0')}</span><span className="ability-title">{feat.name}</span><ChevronDown size={20} className="ability-chevron"/>
        </button>
        {open&&<div id={`body-${id}`} className="ability-body"><Rule html={feat.html} currentId={currentId}/>{kind!=='material'&&feat.kind==='genesis'&&<div className="gm-inline-action"><EditTrigger entry={feat}/></div>}</div>}
      </section>;
    })}</div></>;
}
function MaterialDetail(){
  const {materials,byName,groups,processes,pages}=useCatalog();
  const graph=useMemo(()=>buildRelations(materials,processes,pages),[materials,processes,pages]);
  const {id}=useParams();const mat=materials.find(m=>m.materialId===id);const loc=useLocation();const navigate=useNavigate();const [copied,setCopied]=useState(false);
  useEffect(()=>{setCopied(false);},[id]);
  if(!mat) return <MissingPage/>;
  const ix=byName.findIndex(m=>m.materialId===id);
  const previous=byName[(ix-1+byName.length)%byName.length];const next=byName[(ix+1)%byName.length];
  const share=async()=>{const url=location.href;try{await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),1800);}catch{window.prompt('Copia il collegamento:',url);}};
  const currentSelected=new URLSearchParams(loc.search).get('abilita');
  const related=relationsFor(graph,`material:${mat.materialId}`);
  const suggestions=[...related.outgoing,...related.incoming.filter(n=>!related.outgoing.some(x=>x.id===n.id))];
  return <div className="detail-page page-width">
    <div className="breadcrumb"><Link to={ALCHEMY}>Alchimia</Link><ChevronRight size={15}/><Link to={MATERIALS}>Materiali</Link><ChevronRight size={15}/><Link to={`${MATERIALS}?categoria=${encodeURIComponent(mat.group)}`}>{mat.group}</Link><ChevronRight size={15}/><span>{mat.title}</span></div>
    <div className="detail-layout"><aside className="detail-sidebar"><div className="sidebar-head">INDICE DEI MATERIALI</div><div className="sidebar-groups">{groups.map(g=><div key={g}><div className="sidebar-group-label">{g}</div>{byName.filter(m=>m.group===g).map(m=><Link key={m.id} className={`sidebar-item ${m.materialId===id?'selected':''}`} to={`${MATERIALS}/${m.materialId}`}><span>{m.symbol || '◇'}</span>{m.title}</Link>)}</div>)}</div></aside>
      <article className="detail-main" tabIndex={0} aria-label={`Scheda di ${mat.title}`}><div className="material-overview"><div className={`detail-hero tone-${groupStyle[mat.group]}`}><div className="detail-hero-top"><span><GroupIcon group={mat.group}/>{mat.group}</span><div className="detail-actions"><EditTrigger entry={mat}/><button type="button" className="share-button" onClick={share}>{copied?<Check size={17}/>:<Copy size={17}/>}<span>{copied?'Copiato':'Copia link'}</span></button></div></div><div className="detail-hero-title"><div><span className="detail-kicker">MATERIALE ALCHEMICO</span><h1>{mat.title}</h1></div><div className="detail-symbol" aria-hidden="true">{mat.symbol || '◇'}</div></div><p className="detail-hero-bottom">{mat.abilities.length} capacità <span>·</span> Gradi {mat.abilities.map(a=>a.level).join(', ')}</p></div>
        {validatedImageUrl(mat.imageUrl)&&<div className="material-image"><img src={validatedImageUrl(mat.imageUrl)} alt={mat.imageAlt||mat.title} loading="lazy" referrerPolicy="no-referrer"/></div>}
        <div className="material-portrait">
          <LinkedText text={mat.profile?.theme} currentId={`material:${mat.materialId}`} className="material-portrait-theme"/>
          <LinkedText text={mat.profile?.history} currentId={`material:${mat.materialId}`} className="material-portrait-history"/>
          {mat.profile?.historicalUrl?.startsWith('https://') && <a className="material-reference" href={mat.profile.historicalUrl} target="_blank" rel="noopener noreferrer">Riferimento storico <ArrowUpRight size={14}/></a>}
        </div>
        <div className="material-facts"><div><span>BONUS DI PUREZZA</span><strong>{mat.bonus}</strong></div><div><span>CARATTERISTICA</span><strong>{abilityLabel[mat.ability] || '—'}</strong></div></div>
        <Prerequisites material={mat}/>
        </div>
        <div className="dc-note"><FlaskConical size={19}/><div><span>CD DEI TIRI SALVEZZA</span><p><strong>6 + Competenza + Purezza effettiva di {mat.title} + modificatore di Intelligenza</strong></p><small>Salvo modificatori specifici delle capacità.</small></div></div>
        <div className="abilities-toc"><span>VAI ALLA CAPACITÀ</span><div>{mat.abilities.map(a=><button key={a.name} type="button" onClick={()=>navigate(`${MATERIALS}/${id}?abilita=${encodeURIComponent(a.name)}`)} className={currentSelected===a.name?'toc-current':''}><b>{a.level}</b>{a.name}</button>)}</div></div>
        <AbilityList key={id} features={mat.abilities} currentId={`material:${mat.materialId}`}/>
        <div className="material-relations"><div className="material-relations-head"><div><span className="eyebrow">RIFERIMENTI NEL COMPENDIO</span><h2>Connessioni</h2></div><Link to={RELATIONS}>Apri la mappa <ArrowUpRight size={16}/></Link></div>{suggestions.length ? <div className="material-relation-links">{suggestions.slice(0,10).map(node=><Link key={node.id} to={node.url} className={`relation-chip relation-${node.tone}`}>{node.title}<ArrowUpRight size={14}/></Link>)}</div> : <p className="material-relation-empty">Esplora i materiali della stessa categoria attraverso la mappa.</p>}</div>
        <div className="detail-pagination"><Link to={`${MATERIALS}/${previous.materialId}`}><ChevronLeft size={18}/><span><small>PRECEDENTE</small><strong>{previous.title}</strong></span></Link><Link to={`${MATERIALS}/${next.materialId}`}><span><small>SUCCESSIVO</small><strong>{next.title}</strong></span><ChevronRight size={18}/></Link></div>
      </article>
    </div>
  </div>;
}
function GenesisPage(){const {processes}=useCatalog();const featureList=useMemo(()=>processes.map(p=>({...p,name:p.title})),[processes]);return <div className="reading-page page-width"><div className="breadcrumb"><Link to="/">Home</Link><ChevronRight size={15}/><Link to={ALCHEMY}>Alchimia</Link><ChevronRight size={15}/> Processi</div><PageHeading eyebrow="ALCHIMIA" title="Processi alchemici" text={`${processes.length} processi.`} trailing={<Link className="material-reference" to={RELATIONS}>Mappa generale <ArrowUpRight size={16}/></Link>}/><div className="reading-layout"><div className="reading-side"><span className="reading-side-label">PROCESSI</span><Layers3 size={55} strokeWidth={1}/><span>{processes.length} processi</span></div><div className="reading-body"><AbilityList kind="process" features={featureList}/></div></div></div>}
function GenericPage(){
  const {id}=useParams();
  const {pages}=useCatalog();
  const entry=pages.find(p=>p.id===id);
  if(!entry)return <MissingPage/>;
  const children=pages.filter(p=>p.parentId===entry.id&&p.id!==entry.id);
  const parent=pages.find(p=>p.id===entry.parentId);
  return <div className="reading-page page-width"><div className="breadcrumb"><Link to="/">Home</Link><ChevronRight size={15}/>{parent&&<><Link to={entryUrl(parent)}>{parent.title}</Link><ChevronRight size={15}/></>}{entry.title}</div>
    <PageHeading eyebrow={entry.kind==='chapter'?'SEZIONE':'COMPENDIO'} title={entry.title} text={entry.description} trailing={<EditTrigger entry={entry}/>}/>
    <div className="reading-layout generic-reading"><aside className="reading-side"><BookOpen size={52} strokeWidth={1}/><span>{entry.kind==='chapter'?'SEZIONE':'PAGINA'}</span></aside><article className="reading-body" tabIndex={0}><GenericBlocks entry={entry}/>{children.length>0&&<div className="generic-children"><h2>Contenuti</h2><SectionCards cards={children.map((p,i)=>({title:p.title,subtitle:p.description||'Compendio',to:entryUrl(p),tone:'elements',number:String(i+1).padStart(2,'0'),icon:BookOpen,cta:'Apri'}))}/></div>}</article></div>
  </div>;
}
function MissingPage(){return <div className="missing-page page-width"><span className="eyebrow">PAGINA NON TROVATA</span><h1>Questa pagina non esiste.</h1><Link className="primary-button" to="/">Torna all’inizio <ArrowRight size={18}/></Link></div>}
function App(){const [theme,toggleTheme]=useTheme();return <ContentProvider><HashRouter><Layout theme={theme} toggleTheme={toggleTheme}/></HashRouter></ContentProvider>}

createRoot(document.getElementById('root')).render(<App/>);
