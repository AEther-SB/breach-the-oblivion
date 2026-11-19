import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown,
  ChevronLeft, ChevronRight, Copy, Droplets, Flame, FlaskConical, Layers3, Menu,
  Moon, Orbit, Search, Shield, SlidersHorizontal, Sun, X, Globe2, Landmark, UsersRound, Dna, Network, History, MapPinned, Fingerprint, Castle, Building2, GraduationCap, ScrollText, Swords, HeartPulse, Microscope, Eye, Brain, Waypoints, Sparkles, Bookmark, ListTree, BookMarked, MapPin, Factory, FlaskRound, CircleDot, GitBranch,
} from 'lucide-react';
import compendium from './data/compendium.json';
import { ContentProvider, useContent, normalize, slug } from './content-store';
import {isCounterbodySubsection} from './counterbody-sections.js';
import { sanitizeHtml, validatedImageUrl } from './sanitize';
import { formatLegacyMarkup } from './legacy-format.js';
import { EditTrigger, GMControls, GenericBlocks } from './editor';
import { buildRelations, relationsFor, glossaryEntries, linkedHtml, routes } from './relations';
import RelationMap, { HomeConnectionPreview } from './RelationMap';
import Prerequisites from './Prerequisites';
import AtlasGeografico from './AtlasGeografico';
import StoriaTimeline from './StoriaTimeline';
import './styles.css';
import './premium.css';
import './atlas-home.css';
import './refinement.css';
import './motion.css';
import './editor-modular.css';
import './home-cards.css';
import './app-overhaul.css';
import './layout-v32.css';
import './layout-v33.css';
import './layout-v34.css';
import './layout-v35.css';
import './layout-v36.css';

const ALCHEMY = '/alchimia';
const MATERIALS = '/alchimia/materiali';
const GENESIS = '/alchimia/processi';
const RELATIONS = '/connessioni';
const abilityLabel = { int: 'Intelligenza', wis: 'Saggezza', cha: 'Carisma', str: 'Forza', dex: 'Destrezza', con: 'Costituzione' };
const groupStyle = { 'Elementi': 'elements', 'Metalli Planetari': 'planetary', 'Metalli Pesanti': 'heavy', 'Materia Vitale': 'vital', 'Compositi': 'composite' };
const groupIcons = { 'Elementi': Droplets, 'Metalli Planetari': Orbit, 'Metalli Pesanti': Shield, 'Materia Vitale': Flame, 'Compositi': FlaskConical };

// Icone e gerarchia editoriale: funzionano anche con le voci già importate su Firestore.
const sectionMeta = {
  alchimia:{icon:FlaskConical,tone:'elements',cta:'Esplora Alchimia'},
  'alchimia-fondamenti':{icon:BookOpen,tone:'elements',cta:'Leggi i fondamenti'},
  'fiamme-essenza':{icon:Flame,tone:'vital',cta:'Esplora le Fiamme'},
  quirk:{icon:Dna,tone:'planetary',cta:'Esplora i Quirk'},
  controcorpi:{icon:Shield,tone:'heavy',cta:'Esplora i Controcorpi'},
  'storia-passato':{icon:History,tone:'composite',cta:'Esplora la storia'},
  organizzazioni:{icon:UsersRound,tone:'planetary',cta:'Esplora le organizzazioni'},
  'atlas-geografico':{icon:Globe2,tone:'elements',cta:'Apri l’Atlante'},
};
const loreIcons = {flame:Flame,dna:Dna,shield:Shield,history:History,globe:Globe2,users:UsersRound,book:BookOpen,landmark:Landmark,network:Network,brain:Brain,scroll:ScrollText,eye:Eye,microscope:Microscope,bookmark:Bookmark,castle:Castle,building:Building2,school:GraduationCap,swords:Swords,heart:HeartPulse,waypoints:Waypoints,map:MapPinned,location:MapPin,factory:Factory,flask:FlaskConical,branch:GitBranch,sparkles:Sparkles};
function entryIcon(entry){
  if(entry?.icon && loreIcons[entry.icon])return loreIcons[entry.icon];
  if(sectionMeta[entry?.id])return sectionMeta[entry.id].icon;
  const id=entry?.id||'';
  if(id.startsWith('fiamma-')||id.startsWith('fiamme-'))return Flame;
  if(id.includes('flogisto')||id.includes('alchimia-'))return FlaskConical;
  if(id.includes('essenza'))return Sparkles;
  if(id.includes('traccia'))return Fingerprint;
  if(id.includes('controcorpo'))return Shield;
  if(id.startsWith('quirk-')||id.startsWith('teoria-'))return Dna;
  if(id.startsWith('storia-')||id.includes('era-')||id.includes('anomalie')||id.includes('origine')||id.includes('antich'))return History;
  if(id.includes('cimeli')||id.includes('artefatti'))return Landmark;
  if(id.includes('farmaceutiche'))return FlaskRound;
  if(id.includes('scuole'))return GraduationCap;
  if(id.includes('industrie'))return Factory;
  if(id.includes('governi'))return Landmark;
  if(id.includes('ricerca')||id.includes('catalyst'))return Microscope;
  if(id.includes('antagonisti')||id.includes('villain')||id.includes('criminali'))return Swords;
  if(id.includes('organizzazioni'))return UsersRound;
  if(id.includes('atlas')||id.includes('paesi')||id.includes('luoghi'))return Globe2;
  return entry?.kind==='page'?Bookmark:BookOpen;
}
function entryTone(entry){return sectionMeta[entry?.id]?.tone||((entry?.id||'').startsWith('fiamma')?'vital':(entry?.id||'').startsWith('controcorpo')?'heavy':(entry?.id||'').startsWith('quirk')?'planetary':(entry?.id||'').startsWith('organizzazioni')?'composite':'elements');}
const coreRootIds=['alchimia','fiamme-essenza','quirk','controcorpi','storia-passato','organizzazioni','atlas-geografico'];
const isOrphanAntagonists=p=>p.parentId==='root'&&normalize(p.title)==='antagonisti';
function editorialRoot(pages){
  const roots=pages.filter(p=>p.parentId==='root'&&(p.kind==='chapter'||p.kind==='collection')&&!isOrphanAntagonists(p));
  return [...coreRootIds.map(id=>roots.find(p=>p.id===id)).filter(Boolean),...roots.filter(p=>!coreRootIds.includes(p.id))];
}
function cardOf(p,i,props={}){return {title:p.title,subtitle:p.description||'',to:entryUrl(p),tone:entryTone(p),number:String(i+1).padStart(2,'0'),icon:entryIcon(p),cta:p.kind==='page'?'Leggi la voce':'Apri la sezione',flameHex:p.flameHex,...props};}

const clean = (html) => String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const entryUrl = entry => entry.kind === 'material' ? `${MATERIALS}/${entry.materialId}` : entry.kind === 'genesis' ? GENESIS : entry.id === 'alchimia' ? ALCHEMY : entry.id === 'atlas-geografico' ? '/atlante' : entry.id === 'alchimia-materiali' ? MATERIALS : entry.id === 'alchimia-genesi' ? GENESIS : `/pagina/${entry.id}`;
function useCatalog() {
  const {materials, processes, pages} = useContent();
  const groups = [...new Set(materials.map(m=>m.group))];
  const byName = [...materials].sort((a,b)=>a.title.localeCompare(b.title,'it'));
  const matSearch = new Map(materials.map(m=>[m.id,normalize([m.title,m.group,m.bonus,m.requirementsText,m.profile?.theme,m.profile?.history,...(m.abilities||[]).map(a=>`${a.name} ${clean(a.html)}`)].join(' '))]));
  const searchItems = [
    ...materials.map(m=>({key:m.id,type:'Materiale',title:m.title,subtitle:m.group,url:entryUrl(m),tone:groupStyle[m.group],index:[m.title,m.group,m.bonus,m.requirementsText,m.profile?.theme,m.profile?.history].join(' '),featured:true})),
    ...materials.flatMap(m=>(m.abilities||[]).map(a=>({key:`${m.id}-${a.name}`,type:'Capacità',title:a.name,subtitle:`${m.title} · Grado ${a.level}`,tone:groupStyle[m.group],url:`${entryUrl(m)}?abilita=${encodeURIComponent(a.name)}`,index:`${a.name} ${m.title} ${clean(a.html)}`}))),
    ...processes.map((g,i)=>({key:g.id,type:'Processo',title:g.title,subtitle:'Processo alchemico',url:`${GENESIS}?abilita=${i}`,index:`${g.title} ${clean(g.html)}`})),
    ...pages.filter(p=>!['alchimia','alchimia-materiali','alchimia-genesi'].includes(p.id)).map(p=>({key:p.id,type:p.kind==='chapter'?'Sezione':p.kind==='collection'?'Raccolta':'Pagina',title:p.title,subtitle:p.description||'Compendio',url:entryUrl(p),index:[p.title,p.description,...(p.blocks||[]).map(b=>`${b.html||''} ${b.text||''}`)].join(' ')}))
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
    const targetSection = new URLSearchParams(loc.search).get('sezione');
    if (targetSection && /^[a-z0-9-]{1,90}$/i.test(targetSection)) {
      const raf=requestAnimationFrame(()=>document.getElementById(targetSection)?.scrollIntoView({block:'start',behavior:'smooth'}));
      return ()=>cancelAnimationFrame(raf);
    }
    const target = new URLSearchParams(loc.search).get('abilita');
    if (target != null) {
      const id = loc.pathname.startsWith(`${MATERIALS}/`) ? `abilita-${slug(target)}` : `voce-${target}`;
      const raf = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'auto' }));
      return () => cancelAnimationFrame(raf);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
    for (const area of document.querySelectorAll('.detail-main, .detail-sidebar, .catalog-scroll, .reading-body, .lore-scroll, .lore-content-scroll, .section-landing, .lore-article-scroll, .lore-editorial-scroll, .atlas-sidebar')) area.scrollTop = 0;
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
        {term.trim().length < 2 ? <div className="search-prompt"><span>Ricerca in tutto il compendio</span><p>{materials.length} materiali, {materials.reduce((n,m)=>n+(m.abilities?.length||0),0)} capacità e {processes.length} processi.</p></div> : hits.length ? hits.map(hit => <button className={`search-result ${hit.tone?`tone-${hit.tone}`:''}`} type="button" key={hit.key} onClick={() => { close(); navigate(hit.url); }}>
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
  const compendiumMenuRef = useRef(null);
  const location = useLocation();
  const {pages,gm,error,seeded} = useContent();
  useEffect(() => {setMobileOpen(false);compendiumMenuRef.current?.removeAttribute('open');}, [location.pathname]);
  useEffect(() => {
    const dismiss = event => {if(compendiumMenuRef.current && !compendiumMenuRef.current.contains(event.target))compendiumMenuRef.current.removeAttribute('open');};
    const onKey = event => {if(event.key==='Escape')compendiumMenuRef.current?.removeAttribute('open');};
    document.addEventListener('pointerdown',dismiss);
    document.addEventListener('keydown',onKey);
    return () => {document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',onKey);};
  },[]);
  useEffect(() => {
    const key = e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); } };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);
  useEffect(() => { document.body.classList.toggle('prevent-scroll', mobileOpen || searchOpen); return () => document.body.classList.remove('prevent-scroll'); }, [mobileOpen, searchOpen]);
  const rootSections=editorialRoot(pages);
  const navigation = [['/', 'HOME'],['/pagina/storia-passato','STORIA'],['/atlante','ATLANTE']];
  const compendiumNavigation=rootSections.filter(p=>!['atlas-geografico','storia-passato'].includes(p.id));
  useEffect(() => {
    document.documentElement.dataset.section = location.pathname.startsWith(RELATIONS) ? 'connessioni' : location.pathname.startsWith(MATERIALS) ? 'materiali' : location.pathname.startsWith(GENESIS) ? 'processi' : location.pathname.startsWith(ALCHEMY) ? 'alchimia' : 'home';
  },[location.pathname]);
  const headerNav = (mobile=false) => <>
    {navigation.slice(0,1).map(([href,text])=><NavLink key={href} onClick={mobile?()=>setMobileOpen(false):undefined} className={({isActive})=>`nav-link ${isActive?'nav-link-active':''}`} to={href} end={href==='/' }>{text}</NavLink>)}
    {mobile?<><span className="mobile-nav-group-title">COMPENDIO</span>{compendiumNavigation.map(p=><NavLink key={p.id} to={entryUrl(p)} onClick={()=>setMobileOpen(false)} className="nav-link">{p.title}</NavLink>)}</>:
      <details ref={compendiumMenuRef} className="nav-dropdown"><summary className="nav-link">COMPENDIO <ChevronDown size={12}/></summary><div className="nav-dropdown-panel">{compendiumNavigation.map(p=>{const Icon=entryIcon(p);return <Link key={p.id} to={entryUrl(p)} onClick={e=>e.currentTarget.closest('details')?.removeAttribute('open')}><Icon size={17}/>{p.title}</Link>})}</div></details>}
    {navigation.slice(1).map(([href,text])=><NavLink key={href} onClick={mobile?()=>setMobileOpen(false):undefined} className={({isActive})=>`nav-link ${isActive?'nav-link-active':''}`} to={href}>{text}</NavLink>)}
  </>;
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
      <Route path="/atlante" element={<AtlasGeografico/>}/>
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
    <GlobalSearch open={searchOpen} close={() => setSearchOpen(false)}/>
  </>;
}

const alchemyCards = [
  { title:'Materiali alchemici', subtitle:'Materiali e capacità', to:MATERIALS, tone:'elements', number:'01', icon:FlaskConical, featured:true, cta:'Consulta i materiali' },
  { title:'Processi alchemici', subtitle:'Le operazioni della trasformazione', to:GENESIS, tone:'composite', number:'02', icon:Layers3, cta:'Esplora i processi' },
];
function SectionCards({cards,className=""}) {
  return <div className={`home-grid ${className}`}>{cards.map(card => {const Icon=card.icon||BookOpen;return <Link className={`home-card ${card.featured ? 'home-card-featured' : ''} tone-${card.tone}`} to={card.to} key={card.to}><div className="home-card-top"><span>{card.number} / SEZIONE</span></div><div className="home-card-icon" aria-hidden="true">{card.flameHex?<span className="lore-swatch" style={{backgroundColor:card.flameHex}}/>:<Icon size={28} strokeWidth={1.4}/>}</div><div className="home-card-content"><h3>{card.title}</h3><p>{card.subtitle}</p></div><span className="home-card-bottom">{card.cta}<ArrowUpRight size={19}/></span></Link>})}</div>;
}
function Home({theme}) {
  const {materials,processes,pages}=useCatalog();
  const {ready}=useContent();
  const roots=editorialRoot(pages);
  // I sette riquadri sono presenti fin dal primo render. Non si passa più
  // da una sola voce locale a sette voci Firestore durante il refresh.
  const initialSections=coreRootIds.map((id,i)=>({id,kind:'chapter',parentId:'root',title:({alchimia:'Alchimia','fiamme-essenza':'Fiamme ed Essenza',quirk:'Quirk',controcorpi:'Controcorpi','storia-passato':'Storia e Passato',organizzazioni:'Organizzazioni','atlas-geografico':'Atlante'})[id],description:'',order:i}));
  const shownRoots=ready?roots:initialSections;
  const homeCards=shownRoots.map((p,i)=>cardOf(p,i,{featured:false,cta:sectionMeta[p.id]?.cta||'Esplora la sezione'}));
  if(ready&&!homeCards.some(c=>c.to===ALCHEMY))homeCards.unshift({title:'Alchimia',subtitle:'Materiali e processi alchemici',to:ALCHEMY,tone:'elements',number:'01',icon:FlaskConical,featured:false,cta:'Apri Alchimia'});
  
  return <div className="home-page">
    <section className="home-hero"><div className="hero-inner page-width">
      <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line"/> ARCHIVIO DELL’AMBIENTAZIONE</div><h1>Breach<br/><em>the Oblivion.</em></h1><p>Fiamme ed Essenza, Quirk, Controcorpi, storia, organizzazioni e alchimia: un unico compendio dell’ambientazione.</p>
        <div className="hero-cta"><Link className="primary-button" to="/pagina/fiamme-essenza">Esplora il compendio <ArrowUpRight size={19}/></Link><Link className="home-secondary-cta" to="/atlante">Atlante <Globe2 size={17}/></Link></div>
        <div className="hero-stats"><div><strong>{ready?(roots.length||1):'–'}</strong><span>Sezioni</span></div><div><strong>{ready?materials.length:'–'}</strong><span>Materiali</span></div><div><strong>{ready?pages.filter(p=>p.kind==='page').length:'–'}</strong><span>Voci di lore</span></div></div></div>
      {ready?<HomeConnectionPreview theme={theme}/>:<div className="home-atlas home-atlas-loading" aria-label="Caricamento dell’atlante delle connessioni" aria-busy="true"><div className="home-atlas-heading">ATLANTE DELLE CONNESSIONI</div><div className="home-atlas-stage"/><div className="home-atlas-detail">Caricamento dell’archivio…</div></div>}
    </div><div className="hero-bottom-line page-width"><span>BREACH THE OBLIVION · COMPENDIO</span><span>STORIA · POTERI · ALCHEMIA</span></div></section>
    <section className={`home-explore page-width ${!ready?'home-initializing':''}`} aria-label="Sezioni del compendio" aria-busy={!ready}><SectionCards cards={homeCards} className={homeCards.length%3===1?"home-grid-centre-last":""}/></section>
  </div>;
}
function AlchemyHome() {
  const {pages,materials,processes}=useCatalog();
  const current=pages.find(p=>p.id==='alchimia');
  const extra=pages.filter(p=>p.parentId==='alchimia'&&!['alchimia','alchimia-materiali','alchimia-genesi'].includes(p.id)).map((p,i)=>({title:p.title,subtitle:p.description||'Pagina del compendio',to:entryUrl(p),tone:'planetary',number:String(i+3).padStart(2,'0'),icon:entryIcon(p),cta:'Apri'}));
  const foundation=extra.find(card=>card.to==='/pagina/alchimia-fondamenti');
  const cards=[...(foundation?[foundation]:[]),{...alchemyCards[0],featured:false,subtitle:`${materials.length} materiali · ${materials.reduce((n,m)=>n+(m.abilities||[]).length,0)} capacità`},{...alchemyCards[1],subtitle:`${processes.length} processi`},...extra.filter(card=>card!==foundation)].map((card,i)=>({...card,number:String(i+1).padStart(2,'0')}));
  return <div className="section-landing page-width"><div className="breadcrumb"><Link to="/">Home</Link><ChevronRight size={15}/>Alchimia</div><PageHeading eyebrow="BREACH THE OBLIVION" title={current?.title||"Alchimia"} text={current?.description?.replaceAll('Processi di Genesi','processi alchemici')||"Materiali e processi alchemici."} trailing={<EditTrigger entry={current}/>}/><div className="section-landing-cards"><SectionCards cards={cards}/></div>{current?.blocks?.length>0&&<div className="gm-collection-body"><GenericBlocks entry={current}/></div>}</div>;
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
  const {materials,groups,matSearch,pages}=useCatalog();
  const location = useLocation();
  const startingCategory = new URLSearchParams(location.search).get('categoria');
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState(startingCategory && groups.includes(startingCategory) ? startingCategory : 'Tutti');
  useEffect(()=>{setCategory(startingCategory && groups.includes(startingCategory) ? startingCategory : 'Tutti');},[startingCategory,groups.join('|')]);
  const [order,setOrder]=useState('group');
  const nested=pages.filter(p=>p.parentId==='alchimia-materiali'&&p.id!=='alchimia-materiali');
  const filtered=useMemo(()=>{
    const tokens=normalize(query).trim().split(/\s+/).filter(Boolean);
    const arr=materials.filter(m=>(category==='Tutti'||m.group===category)&&tokens.every(t=>matSearch.get(m.id).includes(t)));
    return order==='alpha'? [...arr].sort((a,b)=>a.title.localeCompare(b.title,'it')) : arr;
  },[query,category,order,materials,matSearch]);
  return <div className="catalog-page page-width"><div className="breadcrumb"><Link to="/">Home</Link><ChevronRight size={15}/><Link to={ALCHEMY}>Alchimia</Link><ChevronRight size={15}/>Materiali</div><PageHeading eyebrow="L’ARTE ALCHEMICA" title="Materiali alchemici" text={`${groups.length} categorie. ${materials.length} materiali. Capacità per grado.`} trailing={<div className="page-heading-count"><strong>{materials.length}</strong><span>MATERIALI</span><EditTrigger entry={pages.find(p=>p.id==='alchimia-materiali')}/></div>}/>
    <div className="catalog-toolbar"><div className="catalog-search"><Search size={18}/><input aria-label="Cerca nei materiali e nelle capacità" type="search" placeholder="Cerca materiale o capacità..." value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')} aria-label="Cancella ricerca" type="button"><X size={17}/></button>}</div><label className="catalog-order"><SlidersHorizontal size={17}/><select value={order} onChange={e=>setOrder(e.target.value)} aria-label="Ordina materiali"><option value="group">Per categoria</option><option value="alpha">A–Z</option></select></label></div>
    <div className="category-tabs" aria-label="Filtra per categoria">{['Tutti',...groups].map(g=><button type="button" key={g} className={category===g?'category-tab active':'category-tab'} onClick={()=>setCategory(g)} aria-pressed={category===g}>{g}<span>{g==='Tutti'?materials.length:materials.filter(m=>m.group===g).length}</span></button>)}</div>
    <div className="catalog-scroll" tabIndex={0} aria-label="Elenco materiali"><div className="catalog-result-line"><span>{filtered.length} {filtered.length===1?'materiale':'materiali'}{query?' trovati':''}</span>{(query||category!=='Tutti')&&<button type="button" onClick={()=>{setQuery('');setCategory('Tutti');}}>Azzera filtri</button>}</div>
    {filtered.length? <div className="materials-grid">{filtered.map(m=><MaterialCard key={m.id} material={m}/>)}</div> : <div className="empty-results"><FlaskConical size={34}/><h2>Nessun materiale trovato</h2><p>Prova con un altro termine o cambia categoria.</p><button type="button" className="secondary-button" onClick={()=>{setQuery('');setCategory('Tutti');}}>Mostra tutti</button></div>}{pages.find(p=>p.id==='alchimia-materiali')?.blocks?.length>0&&<div className="gm-collection-extra"><GenericBlocks entry={pages.find(p=>p.id==='alchimia-materiali')}/></div>}{nested.length>0&&<div className="generic-children"><h2>Altri contenuti</h2><SectionCards cards={nested.map((p,i)=>({title:p.title,subtitle:p.description||'Contenuto',to:entryUrl(p),tone:'heavy',number:String(i+1).padStart(2,'0'),icon:BookOpen,cta:'Apri'}))}/></div>}</div>
  </div>;
}
function Rule({ html, currentId }) {
  const {materials,processes} = useContent();
  const glossary = useMemo(()=>glossaryEntries(materials,processes,currentId),[materials,processes,currentId]);
  const result = useMemo(()=>linkedHtml(sanitizeHtml(formatLegacyMarkup(html)),glossary),[html,glossary]);
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
  return <div className={`detail-page page-width tone-${groupStyle[mat.group]||'elements'}`}>
    <div className="breadcrumb"><Link to={ALCHEMY}>Alchimia</Link><ChevronRight size={15}/><Link to={MATERIALS}>Materiali</Link><ChevronRight size={15}/><Link to={`${MATERIALS}?categoria=${encodeURIComponent(mat.group)}`}>{mat.group}</Link><ChevronRight size={15}/><span>{mat.title}</span></div>
    <div className="detail-layout"><aside className="detail-sidebar"><div className="sidebar-head">INDICE DEI MATERIALI</div><div className="sidebar-groups">{groups.map(g=><div key={g}><div className="sidebar-group-label">{g}</div>{byName.filter(m=>m.group===g).map(m=><Link key={m.id} className={`sidebar-item ${m.materialId===id?'selected':''}`} to={`${MATERIALS}/${m.materialId}`}><span>{m.symbol || '◇'}</span>{m.title}</Link>)}</div>)}</div></aside>
      <article className="detail-main" tabIndex={0} aria-label={`Scheda di ${mat.title}`}><div className="material-overview"><div className={`detail-hero tone-${groupStyle[mat.group]}`}><div className="detail-hero-top"><span><GroupIcon group={mat.group}/>{mat.group}</span><div className="detail-actions"><EditTrigger entry={mat}/><button type="button" className="share-button" onClick={share}>{copied?<Check size={17}/>:<Copy size={17}/>}<span>{copied?'Copiato':'Copia link'}</span></button></div></div><div className="detail-hero-title"><div><span className="detail-kicker">MATERIALE ALCHEMICO</span><h1>{mat.title}</h1></div><div className="detail-symbol" aria-hidden="true">{mat.symbol || '◇'}</div></div><p className="detail-hero-bottom">{mat.abilities.length} capacità <span>·</span> Gradi {mat.abilities.map(a=>a.level).join(', ')}</p></div>
        {validatedImageUrl(mat.imageUrl)&&<div className="material-image"><img src={validatedImageUrl(mat.imageUrl)} alt={mat.imageAlt||mat.title} loading="lazy" referrerPolicy="no-referrer"/></div>}
        <div className="material-portrait">
          <LinkedText text={mat.profile?.theme} currentId={`material:${mat.materialId}`} className="material-portrait-theme"/>
          <p className="material-portrait-history">{mat.profile?.history}</p>
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
function GenesisPage(){const {processes,pages}=useCatalog();const nested=pages.filter(p=>p.parentId==='alchimia-genesi'&&p.id!=='alchimia-genesi');const featureList=useMemo(()=>processes.map(p=>({...p,name:p.title})),[processes]);return <div className="reading-page page-width"><div className="breadcrumb"><Link to="/">Home</Link><ChevronRight size={15}/><Link to={ALCHEMY}>Alchimia</Link><ChevronRight size={15}/> Processi</div><PageHeading eyebrow="ALCHIMIA" title="Processi alchemici" text={`${processes.length} processi.`} trailing={<div className="gm-section-title-actions"><Link className="material-reference" to={RELATIONS}>Mappa generale <ArrowUpRight size={16}/></Link><EditTrigger entry={pages.find(p=>p.id==='alchimia-genesi')}/></div>}/><div className="reading-layout"><div className="reading-side"><span className="reading-side-label">PROCESSI</span><Layers3 size={55} strokeWidth={1}/><span>{processes.length} processi</span></div><div className="reading-body"><AbilityList kind="process" features={featureList}/>{pages.find(p=>p.id==='alchimia-genesi')?.blocks?.length>0&&<GenericBlocks entry={pages.find(p=>p.id==='alchimia-genesi')}/>} {nested.length>0&&<div className="generic-children"><h2>Altri contenuti</h2><SectionCards cards={nested.map((p,i)=>({title:p.title,subtitle:p.description||'Contenuto',to:entryUrl(p),tone:'heavy',number:String(i+1).padStart(2,'0'),icon:BookOpen,cta:'Apri'}))}/></div>}</div></div></div>}
function LoreBreadcrumb({entry,pages}){
  const ancestors=[];const seen=new Set([entry.id]);let node=pages.find(p=>p.id===entry.parentId);
  while(node&&!seen.has(node.id)&&ancestors.length<7){ancestors.unshift(node);seen.add(node.id);node=pages.find(p=>p.id===node.parentId);}
  return <div className="breadcrumb"><Link to="/">Home</Link><ChevronRight size={15}/>{ancestors.map(p=><React.Fragment key={p.id}><Link to={entryUrl(p)}>{p.title}</Link><ChevronRight size={15}/></React.Fragment>)}<span>{entry.title}</span></div>;
}
function LoreIndex({entries,heading='Approfondimenti'}){
  if(!entries.length)return null;
  return <section className="lore-index"><div className="lore-index-heading"><span className="eyebrow">CONSULTA LE VOCI</span><h2>{heading}</h2></div><div className="lore-index-grid">{entries.map(p=>{const Icon=entryIcon(p);return <Link to={entryUrl(p)} key={p.id} className="lore-index-link"><span className="lore-index-icon">{p.flameHex?<span className="lore-swatch" style={{backgroundColor:p.flameHex}}/>:<Icon size={20} strokeWidth={1.5}/>}</span><span><strong>{p.title}</strong><small>{p.description}</small></span><ArrowUpRight size={16}/></Link>})}</div></section>;
}
function FlameCatalog({flames=[]}){
 if(!flames.length)return null;
 return <div className="flame-catalog" aria-label="Catalogo cromatico delle Fiamme">{flames.map((flame,i)=><a key={flame.anchor} className="flame-tile" href={`#/pagina/fiamme-categorie?sezione=${flame.anchor}`} style={{'--flame-color':flame.hex}}><span className="flame-orb"><Flame size={26} strokeWidth={1.25}/></span><span className="flame-tile-copy"><small>{String(i+1).padStart(2,'0')} · FIAMMA</small><strong>{flame.name}</strong><span>{flame.color}</span></span><ArrowUpRight size={16}/></a>)}</div>;
}
function CategoryExplorer({topics=[],entry}){
 if(!topics.length)return null;
 const Icon=entry.layout==='counterbodies'?Shield:Dna;
 return <div className="lore-topic-explorer" aria-label={`Categorie di ${entry.title}`}>{topics.map((topic,index)=><a key={topic.anchor||index} href={`#/pagina/${entry.id}?sezione=${topic.anchor||slug(topic.name)}`} className="lore-topic-tile"><span className="lore-topic-num">{String(index+1).padStart(2,'0')}</span><span className="lore-topic-icon"><Icon size={20} strokeWidth={1.5}/></span><strong>{topic.name}</strong><span className="lore-topic-summary">{topic.summary||'Da approfondire'}</span><ArrowUpRight size={15}/></a>)}</div>;
}
function LoreTOC({entry}){
 const headings=(entry.blocks||[]).flatMap(b=>b.type==='heading'&&b.text?[{id:slug(b.text),label:b.text}]:b.type==='rich'?[...String(b.html||'').matchAll(/<h[234]\s+[^>]*id="([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/h[234]>/gi)].map(m=>({id:m[1],label:m[2].replace(/<[^>]*>/g,'')})):[]);
 const visible=entry.layout==='counterbodies'?headings.filter(h=>!isCounterbodySubsection(h.label)):headings;
 if(!visible.length)return null;
 return <nav className="lore-toc" aria-label="Indice della voce"><strong>IN QUESTA PAGINA</strong>{visible.map(h=><a key={h.id} href={`#/pagina/${entry.id}?sezione=${h.id}`}>{h.label}</a>)}</nav>;
}
function LoreRelatedRail({entry,children=[],siblings=[]}){
  const topics=[]; // Le categorie dei Controcorpi sono vere sottosezioni figlie, non link ad ancore.
  const entries=children.length?children:siblings;
  const isNested=children.length>0||topics.length>0;
  if(!entries.length&&!topics.length)return <aside className="lore-editorial-related lore-editorial-related-empty" aria-label="Navigazione della raccolta"><span className="eyebrow">NAVIGAZIONE</span><Link to={entry.parentId&&entry.parentId!=='root'?`/pagina/${entry.parentId}`:'/'}><ArrowLeft size={15}/> Torna alla raccolta</Link></aside>;
  return <aside className="lore-editorial-related" aria-label={isNested?'Sottosezioni':'Altre voci della raccolta'}>
    {topics.length>0&&<><span className="eyebrow">SOTTOSEZIONI · CATEGORIE</span><div className="lore-editorial-related-list lore-related-topics">{topics.map((topic,i)=><a className="lore-editorial-related-link" href={`#/pagina/${entry.id}?sezione=${topic.anchor||slug(topic.name)}`} key={topic.anchor||topic.name}><span className="lore-related-symbol"><Shield size={17} strokeWidth={1.5}/></span><span className="lore-related-text"><small>{String(i+1).padStart(2,'0')} · CATEGORIA</small><strong>{topic.name}</strong></span><ArrowUpRight size={14}/></a>)}</div></>}
    {entries.length>0&&<><span className="eyebrow">{children.length?'SOTTOSEZIONI':'NELLA RACCOLTA'}</span>
    <div className="lore-editorial-related-list">{entries.map((p,i)=>{const Icon=entryIcon(p);return <Link className="lore-editorial-related-link" to={entryUrl(p)} key={p.id}>
      <span className="lore-related-symbol"><Icon size={18} strokeWidth={1.5}/></span>
      <span className="lore-related-text"><small>{String(i+1).padStart(2,'0')} · {p.kind==='page'?'VOCE':'SEZIONE'}</small><strong>{p.title}</strong>{p.description&&<span>{p.description}</span>}</span>
      <ArrowUpRight size={14}/>
    </Link>})}</div></>}
  </aside>;
}
function LoreEditorialSidebar({entry,pages}){
  const parent=pages.find(p=>p.id===entry.parentId);
  return <aside className="lore-editorial-sidebar" aria-label={`Introduzione e indice di ${entry.title}`}>
    <div className="lore-editorial-sidebar-inner"><LoreBreadcrumb entry={entry} pages={pages}/>
      <span className="eyebrow">{entry.kind==='page'?'VOCE ENCICLOPEDICA':'SEZIONE DEL COMPENDIO'}</span>
      <h1 className={entry.title.length>12?'lore-long-title':''}>{entry.title}</h1>
      {entry.description&&<p className="lore-editorial-lead">{entry.description}</p>}
      {entry.imagePlacement==='sidebar'&&validatedImageUrl(entry.imageUrl)&&<figure className="lore-sidebar-portrait"><img src={validatedImageUrl(entry.imageUrl)} alt={entry.imageAlt||`Ritratto di ${entry.title}`} loading="lazy" referrerPolicy="no-referrer"/></figure>}
      <div className="lore-editorial-actions">{entry.flameHex&&/^#[a-f0-9]{6}$/i.test(entry.flameHex)&&<span className="bto-flame-label"><i style={{backgroundColor:entry.flameHex}}/>{entry.flameColor}</span>}<EditTrigger entry={entry}/></div>
      <LoreTOC entry={entry}/>
      {parent&&<Link className="lore-editorial-parent" to={entryUrl(parent)}><ArrowLeft size={14}/>{parent.title}</Link>}
    </div>
  </aside>;
}
// Le importazioni pregresse contengono spesso tutti i capitoli in un solo blocco HTML.
// Li separiamo visivamente senza modificare documenti Firestore o collegamenti GM.
function loreChapters(entry){
 const result=[{title:'Introduzione',id:'introduzione',intro:true,blocks:[]}];
 let active=result[0];let index=0;
 const chapter=(title,id)=>{active={title,id:id||slug(title),intro:false,blocks:[]};result.push(active);};
 for(const block of (entry.blocks||[])){
  if(block.type==='heading'&&block.level!==3){chapter(block.text||'Capitolo',slug(block.text));continue;}
  if(block.type!=='rich'){active.blocks.push(block);continue;}
  const html=String(block.html||'');
  // Il convertitore Markdown storico trasforma i titoli «##» in <h3>,
  // mentre l'editor WYSIWYG usa <h2>. Entrambi vanno trattati come capitoli.
  const tag=/<h2\b/i.test(html)?'h2':'h3';
  const re=new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`,'gi');
  let cursor=0,match,part=0;
  while((match=re.exec(html))){
   const before=html.slice(cursor,match.index);
   if(before.trim())active.blocks.push({...block,id:`${block.id||'rich'}-part-${index++}`,html:before});
   const title=match[2].replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim()||'Capitolo';
   const id=match[1].match(/\bid=["']([^"']+)["']/i)?.[1]||slug(title);
   chapter(title,id);cursor=re.lastIndex;part++;
  }
  const after=html.slice(cursor);
  if(after.trim())active.blocks.push({...block,id:`${block.id||'rich'}-part-${index++}`,html:after});
 }
 return result;
}
function LoreChapter({entry,chapter,index}){
 const isIntro=chapter.intro;
 return <section className={`lore-chapter ${isIntro?'lore-chapter-intro':''}`} id={chapter.id}>
  {!isIntro&&<div className="lore-chapter-header"><span className="lore-chapter-index">CAPITOLO {String(index).padStart(2,'0')}</span><h2>{chapter.title}</h2></div>}
  <div className="lore-chapter-body"><GenericBlocks entry={{...entry,blocks:chapter.blocks,imageUrl:isIntro&&entry.imagePlacement!=='sidebar'?entry.imageUrl:''}}/></div>
 </section>;
}
function GenericPage(){
  const {id}=useParams();
  const {pages}=useCatalog();
  const entry=pages.find(p=>p.id===id);
  if(!entry)return <MissingPage/>;
  if(entry.id==='atlas-geografico')return <Navigate to="/atlante" replace/>;
  if(entry.id==='storia-passato')return <StoriaTimeline pages={pages} entry={entry} editControl={<EditTrigger entry={entry}/>}/>;
  const children=pages.filter(p=>p.parentId===entry.id&&p.id!==entry.id);
  if(entry.id==='organizzazioni'&&!children.some(p=>p.id==='organizzazioni-antagonisti'))children.push(...pages.filter(isOrphanAntagonists));
  children.sort((a,b)=>a.order-b.order||a.title.localeCompare(b.title,'it'));
  const siblings=pages.filter(p=>p.parentId===entry.parentId&&p.id!==entry.id&&!isOrphanAntagonists(p)).sort((a,b)=>a.order-b.order||a.title.localeCompare(b.title,'it'));
  const Icon=entryIcon(entry);
  const chapters=loreChapters(entry).filter(chapter=>entry.layout!=='counterbodies'||!isCounterbodySubsection(chapter.title));
  return <div className={`lore-editorial-page lore-section-${entry.id} lore-section-${entry.parentId} lore-layout-${entry.layout||'lore'}`}>
    <div className="lore-editorial-shell">
      <LoreEditorialSidebar entry={entry} pages={pages}/>
      <div className="lore-editorial-content" tabIndex={0} aria-label={`Contenuto di ${entry.title}`}>
        <div className="lore-editorial-article-head"><span className="lore-editorial-emblem">{entry.flameHex?<span className="lore-swatch" style={{backgroundColor:entry.flameHex}}/>:<Icon size={21} strokeWidth={1.4}/>}</span><span>{entry.flames?.length?'CATALOGO CROMATICO':entry.kind==='page'?'INTRODUZIONE':'INTRODUZIONE'}</span></div>
        <div className="lore-editorial-scroll" tabIndex={0} aria-label={`Lettura di ${entry.title}`}>
          {entry.flames?.length>0&&<FlameCatalog flames={entry.flames}/>}
          {entry.topics?.length>0&&entry.layout!=='counterbodies'&&<CategoryExplorer entry={entry} topics={entry.topics}/>}
          <article className="lore-editorial-body">
            {chapters.map((chapter,i)=>(chapter.blocks.length>0||(chapter.intro&&entry.imageUrl&&entry.imagePlacement!=='sidebar'))?<LoreChapter key={chapter.id+'-'+i} entry={entry} chapter={chapter} index={i}/>:null)}
            {!entry.blocks?.length&&!entry.topics?.length&&!entry.flames?.length&&<p className="lore-empty-copy">Questa sezione non ha ancora un testo introduttivo. Consulta le sottosezioni a destra.</p>}
          </article>
        </div>
      </div>
      <LoreRelatedRail entry={entry} children={children} siblings={siblings}/>
    </div>
  </div>;
}
function MissingPage(){return <div className="missing-page page-width"><span className="eyebrow">PAGINA NON TROVATA</span><h1>Questa pagina non esiste.</h1><Link className="primary-button" to="/">Torna all’inizio <ArrowRight size={18}/></Link></div>}
function App(){const [theme,toggleTheme]=useTheme();return <ContentProvider><HashRouter><Layout theme={theme} toggleTheme={toggleTheme}/></HashRouter></ContentProvider>}

createRoot(document.getElementById('root')).render(<App/>);
