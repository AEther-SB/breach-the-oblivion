import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocs, onSnapshot, query, where, setDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import source from './data/compendium.json';

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
  return [base, ...mat, ...gen];
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
    if (gm) for (const draft of drafts) map.set(draft.id,{...draft, _draft:true});
    return [...map.values()];
  }, [seeded, loaded, published, gm, drafts]);
  const materials = useMemo(() => entries.filter(e => e.kind === 'material').sort((a,b) => a.order - b.order || a.title.localeCompare(b.title,'it')), [entries]);
  const processes = useMemo(() => entries.filter(e => e.kind === 'genesis').sort((a,b) => a.order - b.order || a.title.localeCompare(b.title,'it')), [entries]);
  const pages = useMemo(() => entries.filter(e => e.kind === 'page' || e.kind === 'chapter').sort((a,b) => a.order - b.order || a.title.localeCompare(b.title,'it')), [entries]);
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
  const value = { configured, user, gm, authPending, seeded, loaded, error, setError, entries, materials, processes, pages, isDraft, login, logout, saveDraft, publish, remove, loadHistory, bootstrap, baseVersion:source.version };
  return <context.Provider value={value}>{children}</context.Provider>;
}
export function useContent() { const value = useContext(context); if(!value) throw Error('ContentProvider mancante'); return value; }
export const newEntry = (kind, title, parentId='root') => {
  const unique = `${slug(title)}-${Math.random().toString(36).slice(2,7)}`;
  const id = `${kind}-${unique}`;
  const common = {id, kind, title, parentId, order:Date.now(), description:'', imageUrl:'',imageAlt:''};
  if(kind==='material') return {...common, materialId:unique, name:title, group:'Elementi',symbol:'◇', bonus:'',ability:'int',requirementsText:'Nessuno.',profile:{theme:'',history:'',historicalUrl:''},abilities:[],parentId:'alchimia-materiali'};
  if(kind==='genesis') return {...common,name:title,html:'<p>Descrizione del processo…</p>',parentId:'alchimia-genesi'};
  return {...common,blocks:[{id:'blocco-1',type:'rich',html:'<p>Inserisci il testo…</p>'}]};
};
