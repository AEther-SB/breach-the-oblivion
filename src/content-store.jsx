import legacyLore from './data/legacy-lore-v30.json';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocs, onSnapshot, query, where, setDoc, deleteDoc, deleteField, serverTimestamp, writeBatch, runTransaction } from 'firebase/firestore';
import source from './data/compendium.json';
import previousSource from './data/editorial-baseline-v242.json';
import previousV25 from './data/editorial-baseline-v250-history.json';
import previousProcessesV27 from './data/editorial-baseline-v270-processes.json';
import previousAbilitiesV271 from './data/editorial-baseline-v271-abilities.json';
import previousAbilitiesV280 from './data/editorial-baseline-v280-abilities.json';
import {ensureImportEntry} from './import-utils.js';
import {expandCounterbodyPages} from './counterbody-sections.js';

export const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’‘]/g, "'");
export const slug = (value) => normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
export const safeUrl = (value, internal = false) => {
  const text = String(value || '').trim();
  if (internal && text.startsWith('#/')) return text;
  try { const parsed = new URL(text); return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? text : ''; } catch { return ''; }
};
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};
export const configured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
let auth = null;
let db = null;
if (configured) {
  const app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
}
// Stessa istanza Firebase usata dai contributi GM; gli appunti restano separati.
export function notesDatabase(){return db;}

function fallbackEntries() {
  const mat = source.materials.map((m, index) => ({
    ...m, kind: 'material', id: `material-${m.id}`, materialId: m.id,
    title: m.name, order: index, parentId: 'alchimia-materiali',
    profile: { ...m.profile }, imageUrl: '', imageAlt: '',
    abilities: m.abilities.map((a, i) => ({...a, id:`abilita-${i}`})),
  }));
  const gen = source.genesisProcesses.map((p, index) => ({
    ...p, kind: 'genesis', id: `genesis-${slug(p.name)}`, title: p.name,
    parentId: 'alchimia-genesi', order: index,
  }));
  const base = { id: 'alchimia', kind: 'chapter', title: 'Alchimia', description: 'Materiali e processi alchemici.', parentId: 'root', order: 0, blocks: [], imageUrl: '' };
  const collections = [
    {id:'alchimia-fondamenti',kind:'collection',title:'Fondamenti alchemici',description:'Principi, termini e conoscenze fondamentali dell’Alchimia.',parentId:'alchimia',order:0,layout:'alchemy',icon:'flask',blocks:[]},
    {id:'alchimia-materiali',kind:'collection',title:'Materiali alchemici',description:'Catalogo dei materiali e delle capacità.',parentId:'alchimia',order:1,blocks:[]},
    {id:'alchimia-genesi',kind:'collection',title:'Processi alchemici',description:'I processi dell’Opera.',parentId:'alchimia',order:2,blocks:[]},
  ];
  return [base, ...collections, ...mat, ...gen];
}
const fallback = fallbackEntries();
const context = createContext(null);
const pure = (obj) => JSON.parse(JSON.stringify(obj, (_key, value) => value === undefined ? null : value));
const omitServer = (entry) => {
  const { updatedAt, createdAt, updatedBy, ...content } = entry;
  return pure(content);
};

export function ContentProvider({children}) {
  const [user, setUser] = useState(null);
  const [gm, setGM] = useState(false);
  const [contributor, setContributor] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [contributorRecords, setContributorRecords] = useState([]);
  const [directoryError, setDirectoryError] = useState('');
  const [authPending, setAuthPending] = useState(configured);
  const [seeded, setSeeded] = useState(false);
  const [published, setPublished] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!configured) return;
    let stopContributor=()=>{};
    const stopAuth=onAuthStateChanged(auth, async next => {
      stopContributor();stopContributor=()=>{};
      setUser(next);
      setGM(false);
      setContributor(false);
      setAuthPending(true);
      if (next) {
        // Registro leggero degli accessi alla wiki. Non espone il catalogo Firebase Auth:
        // sono registrati solo gli utenti che entrano nel sito da questa versione.
        try {
          const profileRef=doc(db,'wikiUsers',next.uid);
          const profile=await getDoc(profileRef);
          if (!profile.exists()) await setDoc(profileRef,{
            displayName:String(next.displayName||'Utente').slice(0,90),
            email:String(next.email||'').slice(0,254),
            createdAt:serverTimestamp(),updatedAt:serverTimestamp(),
          });
        } catch (e) {
          // Il vecchio regolamento Firestore può essere ancora attivo durante il deploy.
          // Il login e la lettura del compendio devono continuare a funzionare.
          console.warn('Registro utenti non ancora disponibile:',e.message);
        }
        try {
          const admin = await getDoc(doc(db, 'admins', next.uid));
          setGM(admin.exists() && admin.data().enabled === true);
        } catch (e) { setError(`Verifica del ruolo GM: ${e.message}`); }
        // Un'autorizzazione concessa dal GM diventa attiva senza richiedere il refresh.
        stopContributor=onSnapshot(doc(db, 'contributors', next.uid), snap=>{
          setContributor(snap.exists() && snap.data().enabled === true);
        }, e=>setError(`Ruolo Collaboratore: ${e.message}. Verifica le regole Firestore.`));
      }
      setAuthPending(false);
    }, e => { setError(e.message); setAuthPending(false); });
    return ()=>{stopContributor();stopAuth();};
  }, []);
  useEffect(() => {
    if (!configured) return;
    const offConfig = onSnapshot(doc(db,'site','config'), snap => {setSeeded(Boolean(snap.data()?.initialized));setConfigLoaded(true);}, e => {setConfigLoaded(true);setError(`Configurazione: ${e.message}`);});
    const offPublished = onSnapshot(collection(db,'entries'), snap => { setPublished(snap.docs.map(d => ({...d.data(),id:d.id}))); setLoaded(true); }, e => { setLoaded(true);setError(`Lettura del compendio: ${e.message}`); });
    return () => { offConfig(); offPublished(); };
  }, []);
  useEffect(() => {
    if (!configured || !gm) {setDrafts([]);return;}
    return onSnapshot(collection(db,'drafts'), snap => setDrafts(snap.docs.map(d => ({...d.data(),id:d.id}))), e => setError(`Lettura delle bozze: ${e.message}`));
  }, [gm]);
  useEffect(() => {
    if (!configured || !user || (!gm && !contributor)) { setSubmissions([]); return; }
    const ref = gm ? collection(db, 'submissions') : query(collection(db, 'submissions'), where('authorId','==',user.uid));
    return onSnapshot(ref, snap => setSubmissions(snap.docs.map(d=>({...d.data(),id:d.id}))),
      e => setError(`Lettura delle proposte: ${e.message}`));
  }, [user?.uid,gm,contributor]);
  useEffect(() => {
    if (!configured || !gm) {
      setRegisteredUsers([]);setContributorRecords([]);setDirectoryError('');return;
    }
    // Gli account autenticati si registrano in wikiUsers; il GM vede anche gli UID
    // abilitati prima di questa versione, anche se non hanno ancora effettuato accesso.
    const offUsers=onSnapshot(collection(db,'wikiUsers'), snap=>{
      setRegisteredUsers(snap.docs.map(d=>({...d.data(),id:d.id})));
      setDirectoryError('');
    }, e=>setDirectoryError(`Elenco utenti: ${e.message}. Pubblica le regole Firestore v3.10.2.`));
    const offRoles=onSnapshot(collection(db,'contributors'), snap=>{
      setContributorRecords(snap.docs.map(d=>({...d.data(),id:d.id})));
    }, e=>setDirectoryError(`Elenco collaboratori: ${e.message}`));
    return ()=>{offUsers();offRoles();};
  }, [gm]);
  const entries = useMemo(() => {
    const primary = seeded && loaded ? published : fallback;
    const map = new Map(primary.map(e => [e.id,e]));
    // Le due raccolte strutturali esistono anche nei database inizializzati prima della v2.5.
    for (const builtIn of fallback.filter(e => ['alchimia-fondamenti','alchimia-materiali','alchimia-genesi'].includes(e.id))) if (!map.has(builtIn.id)) map.set(builtIn.id,builtIn);
    if (gm) for (const draft of drafts) map.set(draft.id,{...draft, _draft:true});
    return [...map.values()];
  }, [seeded, loaded, published, gm, drafts]);
  const materials = useMemo(() => entries.filter(e => e.kind === 'material').sort((a,b) => a.order - b.order || a.title.localeCompare(b.title,'it')), [entries]);
  const processes = useMemo(() => entries.filter(e => e.kind === 'genesis').sort((a,b) => a.order - b.order || a.title.localeCompare(b.title,'it')), [entries]);
  const pages = useMemo(() => expandCounterbodyPages(entries.filter(e => e.kind === 'page' || e.kind === 'chapter' || e.kind === 'collection')).sort((a,b) => a.order - b.order || a.title.localeCompare(b.title,'it')), [entries]);
  const isDraft = (id) => gm && drafts.some(d => d.id===id);
  async function login() { if (!auth) throw Error('Configura prima Firebase.'); setError(''); await signInWithPopup(auth, new GoogleAuthProvider()); }
  async function logout() { if (auth) await signOut(auth); }
  function requireGM() { if (!gm || !db || !user) throw Error('Permesso GM non disponibile.'); }
  async function saveDraft(entry) {
    requireGM();
    if (!seeded) throw Error('Importa prima il compendio iniziale.');
    if (!entry?.id || !entry?.title || !entry?.kind) throw Error('Titolo, tipo e identificativo obbligatori.');
    await setDoc(doc(db,'drafts',entry.id), {...omitServer(entry), updatedAt:serverTimestamp(),updatedBy:user.uid});
  }
  async function publish(entry) {
    requireGM();
    if (!seeded) throw Error('Importa prima il compendio iniziale.');
    if (!entry?.id || !entry?.title || !entry?.kind) throw Error('Titolo, tipo e identificativo obbligatori.');
    const normalized = omitServer(entry);
    const batch = writeBatch(db);
    batch.set(doc(db,'entries',entry.id), {...normalized, published:true,updatedAt:serverTimestamp(),updatedBy:user.uid});
    batch.set(doc(collection(db,'revisions')), {entryId:entry.id,content:normalized,author:user.uid,at:serverTimestamp()});
    batch.delete(doc(db,'drafts',entry.id));
    await batch.commit();
  }
  async function remove(entryId) {
    requireGM();
    if (!seeded) throw Error('Importa prima il compendio iniziale.');
    const batch = writeBatch(db);
    batch.delete(doc(db,'entries',entryId));
    batch.delete(doc(db,'drafts',entryId));
    await batch.commit();
  }
  async function importEntries(items,{publishNow=false,replaceExisting=false}={}) {
    requireGM();
    if (!seeded) throw Error('Importa prima il compendio iniziale.');
    if (!Array.isArray(items) || !items.length) throw Error('Nessuna voce da importare.');
    if (items.length>250) throw Error('Massimo 250 voci per operazione.');
    const occupied=new Set([...published,...drafts].map(e=>e.id));
    const selected=[];let skipped=0;
    for (const item of items) {
      const entry=ensureImportEntry(omitServer(item));
      if(occupied.has(entry.id)&&!replaceExisting){skipped++;continue;}
      selected.push(entry);
    }
    // Firestore: lotti limitati per evitare il massimo di 500 scritture per batch.
    // Nessun file del dispositivo viene salvato: solo dati testuali e URL.
    let imported=0;
    for(let offset=0;offset<selected.length;offset+=60){
      const batch=writeBatch(db);
      const chunk=selected.slice(offset,offset+60);
      for(const entry of chunk){
        const content={...entry};delete content.existing;
        if (publishNow) {
          batch.set(doc(db,'entries',entry.id),{...content,published:true,updatedAt:serverTimestamp(),updatedBy:user.uid});
          batch.set(doc(collection(db,'revisions')),{entryId:entry.id,content,author:user.uid,at:serverTimestamp()});
          batch.delete(doc(db,'drafts',entry.id));
        } else {
          batch.set(doc(db,'drafts',entry.id),{...content,updatedAt:serverTimestamp(),updatedBy:user.uid});
        }
      }
      await batch.commit();imported+=chunk.length;
    }
    return {imported,skipped,mode:publishNow?'pubblicate':'bozze'};
  }
  // Le proposte sono dati privati: un contributore non scrive mai direttamente in entries/drafts.
  async function submitProposal(entry, targetId='') {
    if (!db || !user || (!contributor && !gm)) throw Error('Richiedi al GM il ruolo Collaboratore.');
    if (!seeded) throw Error('Il compendio non è ancora inizializzato.');
    if (entry?.kind !== 'page' || !String(entry.title||'').trim()) throw Error('Per le proposte è necessaria una pagina con titolo.');
    if (String(entry.title).length > 160 || String(entry.description||'').length > 700) throw Error('Titolo o descrizione troppo lunghi.');
    if (!Array.isArray(entry.blocks) || entry.blocks.length>40) throw Error('Massimo 40 blocchi.');
    const normalized=omitServer(entry);
    if (JSON.stringify(normalized).length > 100000) throw Error('Proposta troppo grande (massimo 100 KB).');
    const record=doc(collection(db,'submissions'));
    await setDoc(record,{authorId:user.uid,authorName:user.displayName||user.email||'Collaboratore',status:'pending',targetId:targetId||'',entry:normalized,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    return record.id;
  }
  async function decideProposal(proposal, decision, editedEntry=null) {
    requireGM();
    if (!['approved','rejected'].includes(decision) || proposal?.status!=='pending') throw Error('Proposta non più in attesa.');
    const proposalRef=doc(db,'submissions',proposal.id);
    // Transazione: due GM non possono approvare contemporaneamente la stessa proposta.
    await runTransaction(db, async transaction => {
      const snap=await transaction.get(proposalRef);
      if (!snap.exists() || snap.data().status!=='pending') throw Error('La proposta è stata già esaminata.');
      if (decision==='approved') {
        const entry=omitServer(editedEntry||snap.data().entry);
        if (entry.kind!=='page' || !entry.id || !entry.title || (editedEntry && entry.id!==snap.data().entry.id)) throw Error('Pagina proposta non valida.');
        const entryRef=doc(db,'entries',entry.id),draftRef=doc(db,'drafts',entry.id);
        const existing=await transaction.get(entryRef);
        const draft=await transaction.get(draftRef);
        if (existing.exists() && (snap.data().targetId!==entry.id || existing.data().kind!=='page')) throw Error('La proposta tenta di sovrascrivere una voce non modificabile.');
        if (snap.data().targetId && !existing.exists()) throw Error('La pagina originale non esiste più.');
        if (draft.exists()) throw Error('Esiste una bozza GM per questa pagina: risolvila prima di approvare.');
        transaction.set(entryRef,{...entry,published:true,updatedAt:serverTimestamp(),updatedBy:user.uid});
        transaction.set(doc(collection(db,'revisions')),{entryId:entry.id,content:entry,author:user.uid,sourceProposal:proposal.id,at:serverTimestamp()});
      }
      transaction.update(proposalRef,{status:decision,reviewedAt:serverTimestamp(),reviewedBy:user.uid});
    });
  }
  async function setContributorEnabled(uid,enabled) {
    requireGM();
    if (!/^[a-zA-Z0-9_-]{6,128}$/.test(uid)) throw Error('UID Firebase non valido.');
    await setDoc(doc(db,'contributors',uid),{enabled:Boolean(enabled),updatedAt:serverTimestamp(),updatedBy:user.uid});
  }
  async function resetLegacyLore(ids){
    requireGM();
    if(!seeded) throw Error('Il compendio non è inizializzato.');
    const permitted=new Set(legacyLore.map(e=>e.id));
    if(!Array.isArray(ids)||!ids.length)throw Error('Nessuna voce selezionata.');
    const unique=[...new Set(ids)];
    if(unique.length>100||unique.some(id=>!permitted.has(id)))throw Error('Selezione non ammessa: puoi ripulire soltanto l’importazione lore v3.0.');
    const protectedIds=new Set(['alchimia','alchimia-materiali','alchimia-genesi']);
    if(unique.some(id=>protectedIds.has(id)))throw Error('Le raccolte principali di Alchimia non possono essere cancellate.');
    if(unique.some(id=>[...published,...drafts].some(e=>e.id===id&&e.packageId==='bto-lore-v3.1')))throw Error('Sono presenti voci della nuova v3.1: la ripulitura serve soltanto per la vecchia importazione.');
    for(let i=0;i<unique.length;i+=150){
      const batch=writeBatch(db);
      unique.slice(i,i+150).forEach(id=>{batch.delete(doc(db,'entries',id));batch.delete(doc(db,'drafts',id));});
      await batch.commit();
    }
    return {deleted:unique.length};
  }
  async function loadHistory(entryId) {
    requireGM();
    const snap = await getDocs(query(collection(db,'revisions'), where('entryId','==',entryId)));
    return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.at?.seconds||0)-(a.at?.seconds||0)).slice(0,25);
  }
  async function bootstrap() {
    requireGM();
    if (seeded) throw Error('Il compendio risulta già inizializzato.');
    const batch = writeBatch(db);
    for (const entry of fallback) batch.set(doc(db,'entries',entry.id), {...omitServer(entry),published:true, updatedAt:serverTimestamp(),updatedBy:user.uid});
    batch.set(doc(db,'site','config'), {initialized:true, source:source.source, initializedAt:serverTimestamp(),initializedBy:user.uid});
    await batch.commit();
  }
  async function syncEditorial() {
    requireGM();
    if (!seeded) throw Error('Importa prima il compendio iniziale.');
    // Mai sovrascrivere testi personalizzati, né le bozze ancora in lavorazione.
    const previous = new Map(previousSource.materials.map(m => [m.id,m]));
    const previous250 = new Map(previousV25.materials.map(m => [m.id,m]));
    const current = new Map(source.materials.map(m => [m.id,m]));
    const live = new Map(published.map(e => [e.materialId,e]));
    const draftIds = new Set(drafts.map(d => d.id));
    let updated=0,skipped=0;
    for (const [id,newMaterial] of current) {
      const oldMaterial=previous.get(id),old250=previous250.get(id),record=live.get(id);
      if (!record || !oldMaterial || !old250 || draftIds.has(record.id)) {skipped++;continue;}
      const changes={};
      if (newMaterial.profile?.theme!==oldMaterial.profile?.theme) {
        if (record.profile?.theme===oldMaterial.profile?.theme) changes['profile.theme']=newMaterial.profile.theme;
        else skipped++;
      }
      // Migrazione selettiva: i riferimenti storici personalizzati dal GM non vanno riscritti.
      if (newMaterial.profile?.history!==old250.profile?.history) {
        if (record.profile?.history===old250.profile?.history) changes['profile.history']=newMaterial.profile.history;
        else skipped++;
      }
      // Il collegamento bibliografico precedente è stato rimosso dall'editor e dal sito.
      if (record.profile?.historicalUrl && record.profile.historicalUrl===old250.profile?.historicalUrl && !newMaterial.profile?.historicalUrl) {
        changes['profile.historicalUrl']=deleteField();
      }
      if (id==='amalgama') {
        const previousAbility=old250.abilities.find(a=>a.name==='Esistenza Transitoria');
        const nextAbility=newMaterial.abilities.find(a=>a.name==='Esistenza Transitoria');
        const currentAbility=record.abilities?.find(a=>a.name==='Esistenza Transitoria');
        if (previousAbility && nextAbility && currentAbility?.html===previousAbility.html) {
          changes.abilities=record.abilities.map(a=>a.name==='Esistenza Transitoria'?{...a,html:nextAbility.html}:a);
        } else skipped++;
      }
      if (id==='argentovivo') {
        const previousAbility=oldMaterial.abilities.find(a=>a.name==='Memoria Vitale');
        const nextAbility=newMaterial.abilities.find(a=>a.name==='Memoria Vitale');
        const currentAbility=record.abilities?.find(a=>a.name==='Memoria Vitale');
        if (previousAbility && nextAbility && currentAbility?.html===previousAbility.html) changes.abilities=record.abilities.map(a=>a.name==='Memoria Vitale'?{...a,html:nextAbility.html}:a);
        else skipped++;
      }
      // Uniformazione delle 120 descrizioni: si interviene soltanto quando il
      // testo corrisponde esattamente alla v2.7.1 non personalizzata.
      // Materiali e abilità modificati dal GM, o con bozze, restano intatti.
      const previousAbilityTexts = previousAbilitiesV271[id] || {};
      const previousV280Texts = previousAbilitiesV280[id] || {};
      let abilitiesChanged = false;
      const candidateAbilities = (changes.abilities ?? record.abilities ?? []).map(ability => {
        const previousHtml = previousAbilityTexts[String(ability.level)];
        const lastPublishedHtml = previousV280Texts[String(ability.level)];
        const nextAbility = newMaterial.abilities.find(item => String(item.level) === String(ability.level));
        if (!previousHtml || !nextAbility || nextAbility.html === ability.html) return ability;
        // Accetta soltanto i testi distribuiti dalla v2.7.1 o dalla v2.8.
        if (ability.html !== previousHtml && ability.html !== lastPublishedHtml) { skipped++; return ability; }
        abilitiesChanged = true;
        return { ...ability, html: nextAbility.html };
      });
      if (abilitiesChanged) changes.abilities = candidateAbilities;
      if (Object.keys(changes).length) {
        const updatedRecord={...record};
        if(changes['profile.theme'])updatedRecord.profile={...updatedRecord.profile,theme:changes['profile.theme']};
        if(changes['profile.history'])updatedRecord.profile={...updatedRecord.profile,history:changes['profile.history']};
        if(changes['profile.historicalUrl']){updatedRecord.profile={...updatedRecord.profile};delete updatedRecord.profile.historicalUrl;}
        if(changes.abilities)updatedRecord.abilities=changes.abilities;
        const batch=writeBatch(db);
        batch.update(doc(db,'entries',record.id),{...changes,updatedAt:serverTimestamp(),updatedBy:user.uid});
        batch.set(doc(collection(db,'revisions')),{entryId:record.id,content:omitServer(updatedRecord),author:user.uid,at:serverTimestamp()});
        await batch.commit();updated++;
      }
    }
    // Correzioni testuali v2.7.1 ai 12 Processi alchemici.
    // Si aggiorna solo il testo ancora identico alla versione v2.7;
    // le bozze e ogni contenuto modificato dal GM sono preservati.
    const previousProcessMap = new Map(previousProcessesV27.map(p => [slug(p.name), p]));
    for (const nextProcess of source.genesisProcesses) {
      const id = `genesis-${slug(nextProcess.name)}`;
      const record = published.find(e => e.id === id);
      const oldProcess = previousProcessMap.get(slug(nextProcess.name));
      if (!record || !oldProcess || draftIds.has(id)) { skipped++; continue; }
      if (record.html === nextProcess.html) continue;
      if (record.html !== oldProcess.html) { skipped++; continue; }
      const updatedRecord = { ...record, html: nextProcess.html };
      const batch = writeBatch(db);
      batch.update(doc(db, 'entries', id), {
        html: nextProcess.html, updatedAt: serverTimestamp(), updatedBy: user.uid,
      });
      batch.set(doc(collection(db, 'revisions')), {
        entryId: id, content: omitServer(updatedRecord), author: user.uid, at: serverTimestamp(),
      });
      await batch.commit();
      updated++;
    }
    for(const id of ['alchimia-materiali','alchimia-genesi']) {
      if(!published.some(e=>e.id===id)) {
        const item=fallback.find(e=>e.id===id);
        await setDoc(doc(db,'entries',id),{...omitServer(item),published:true,updatedAt:serverTimestamp(),updatedBy:user.uid});updated++;
      }
    }
    return {updated,skipped};
  }
  const value = { configured, user, gm, contributor, submissions, registeredUsers, contributorRecords, directoryError, authPending, seeded, loaded, ready:!configured||(loaded&&configLoaded), error, setError, entries, publishedEntries:published, draftEntries:gm?drafts:[], materials, processes, pages, isDraft, resetLegacyLore, login, logout, submitProposal, decideProposal, setContributorEnabled, saveDraft, publish, remove, loadHistory, bootstrap, syncEditorial, importEntries, baseVersion:source.version };
  return <context.Provider value={value}>{children}</context.Provider>;
}
export function useContent() { const value = useContext(context); if(!value) throw Error('ContentProvider mancante'); return value; }
export const newEntry = (kind, title, parentId='root') => {
  if (!['collection','page'].includes(kind)) throw Error('Per nuovi contenuti utilizza una Raccolta o una Pagina.');
  const unique = `${slug(title)}-${Math.random().toString(36).slice(2,7)}`;
  const id = `${kind}-${unique}`;
  return {id,kind,title,parentId,order:0,description:'',imageUrl:'',imageAlt:'',blocks:[]};
};
