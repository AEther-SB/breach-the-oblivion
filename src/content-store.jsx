import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocs, onSnapshot, query, where, setDoc, deleteDoc, deleteField, serverTimestamp, writeBatch } from 'firebase/firestore';
import source from './data/compendium.json';
import previousSource from './data/editorial-baseline-v242.json';
import previousV25 from './data/editorial-baseline-v250-history.json';

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
  const [authPending, setAuthPending] = useState(configured);
  const [seeded, setSeeded] = useState(false);
  const [published, setPublished] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!configured) return;
    return onAuthStateChanged(auth, async next => {
      setUser(next);
      setGM(false);
      setAuthPending(true);
      if (next) {
        try {
          const admin = await getDoc(doc(db, 'admins', next.uid));
          setGM(admin.exists() && admin.data().enabled === true);
        } catch (e) { setError(`Verifica del ruolo GM: ${e.message}`); }
      }
      setAuthPending(false);
    }, e => { setError(e.message); setAuthPending(false); });
  }, []);
  useEffect(() => {
    if (!configured) return;
    const offConfig = onSnapshot(doc(db,'site','config'), snap => setSeeded(Boolean(snap.data()?.initialized)), e => setError(`Configurazione: ${e.message}`));
    const offPublished = onSnapshot(collection(db,'entries'), snap => { setPublished(snap.docs.map(d => ({...d.data(),id:d.id}))); setLoaded(true); }, e => { setLoaded(true);setError(`Lettura del compendio: ${e.message}`); });
    return () => { offConfig(); offPublished(); };
  }, []);
  useEffect(() => {
    if (!configured || !gm) {setDrafts([]);return;}
    return onSnapshot(collection(db,'drafts'), snap => setDrafts(snap.docs.map(d => ({...d.data(),id:d.id}))), e => setError(`Lettura delle bozze: ${e.message}`));
  }, [gm]);
  const entries = useMemo(() => {
    const primary = seeded && loaded ? published : fallback;
    const map = new Map(primary.map(e => [e.id,e]));
    // Le due raccolte strutturali esistono anche nei database inizializzati prima della v2.5.
    for (const builtIn of fallback.filter(e => ['alchimia-materiali','alchimia-genesi'].includes(e.id))) if (!map.has(builtIn.id)) map.set(builtIn.id,builtIn);
    if (gm) for (const draft of drafts) map.set(draft.id,{...draft, _draft:true});
    return [...map.values()];
  }, [seeded, loaded, published, gm, drafts]);
  const materials = useMemo(() => entries.filter(e => e.kind === 'material').sort((a,b) => a.order - b.order || a.title.localeCompare(b.title,'it')), [entries]);
  const processes = useMemo(() => entries.filter(e => e.kind === 'genesis').sort((a,b) => a.order - b.order || a.title.localeCompare(b.title,'it')), [entries]);
  const pages = useMemo(() => entries.filter(e => e.kind === 'page' || e.kind === 'chapter' || e.kind === 'collection').sort((a,b) => a.order - b.order || a.title.localeCompare(b.title,'it')), [entries]);
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
    for(const id of ['alchimia-materiali','alchimia-genesi']) {
      if(!published.some(e=>e.id===id)) {
        const item=fallback.find(e=>e.id===id);
        await setDoc(doc(db,'entries',id),{...omitServer(item),published:true,updatedAt:serverTimestamp(),updatedBy:user.uid});updated++;
      }
    }
    return {updated,skipped};
  }
  const value = { configured, user, gm, authPending, seeded, loaded, error, setError, entries, materials, processes, pages, isDraft, login, logout, saveDraft, publish, remove, loadHistory, bootstrap, syncEditorial, baseVersion:source.version };
  return <context.Provider value={value}>{children}</context.Provider>;
}
export function useContent() { const value = useContext(context); if(!value) throw Error('ContentProvider mancante'); return value; }
export const newEntry = (kind, title, parentId='root') => {
  if (!['collection','page'].includes(kind)) throw Error('Per nuovi contenuti utilizza una Raccolta o una Pagina.');
  const unique = `${slug(title)}-${Math.random().toString(36).slice(2,7)}`;
  const id = `${kind}-${unique}`;
  return {id,kind,title,parentId,order:Date.now(),description:'',imageUrl:'',imageAlt:'',blocks:[]};
};
