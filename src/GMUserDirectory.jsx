import React, {useMemo,useState} from 'react';
import {Search,ShieldCheck,UserRound,Users} from 'lucide-react';
import {useContent} from './content-store.jsx';

/* Il catalogo contiene gli accessi alla wiki, non l'intera rubrica Firebase Auth. */
export default function GMUserDirectory({busy,setError,setMessage,setBusy}){
  const {gm,user,registeredUsers,contributorRecords,directoryError,setContributorEnabled}=useContent();
  const [search,setSearch]=useState('');
  const [uid,setUid]=useState('');
  const [filter,setFilter]=useState('all');
  const people=useMemo(()=>{
    const byId=new Map((registeredUsers||[]).map(person=>[person.id,{
      ...person,enabled:false,registered:true,
    }]));
    for(const role of contributorRecords||[]){
      byId.set(role.id,{...(byId.get(role.id)||{id:role.id,registered:false}),enabled:role.enabled===true});
    }
    return [...byId.values()].sort((a,b)=>{
      if(a.enabled!==b.enabled)return Number(b.enabled)-Number(a.enabled);
      return String(a.displayName||a.id).localeCompare(String(b.displayName||b.id),'it');
    });
  },[registeredUsers,contributorRecords]);
  const shown=useMemo(()=>people.filter(person=>{
    if(filter==='enabled'&&!person.enabled)return false;
    if(filter==='others'&&(person.enabled||person.id===user?.uid))return false;
    const find=`${person.displayName||''} ${person.email||''} ${person.id}`.toLocaleLowerCase('it');
    return find.includes(search.trim().toLocaleLowerCase('it'));
  }),[people,filter,search,user?.uid]);
  async function change(id,enabled){
    if(!id||busy)return;
    setBusy(true);setError('');
    try {await setContributorEnabled(id,enabled);setMessage(enabled?'Collaboratore abilitato.':'Collaboratore revocato.');}
    catch(e){setError(e.message||'Operazione non riuscita.');}
    finally{setBusy(false);}
  }
  if(!gm)return null;
  return <section className="contrib-directory" aria-label="Utenti e autorizzazioni">
    <p className="contrib-hint">Qui trovi gli utenti che hanno effettuato l'accesso dopo l'aggiornamento e gli UID già autorizzati o revocati. L'elenco non comprende automaticamente tutti gli account di Firebase Authentication. L'email è visibile soltanto al GM.</p>
    {directoryError&&<p role="alert" className="contrib-error">{directoryError}</p>}
    <div className="contrib-directory-tools">
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca per nome, email o UID" aria-label="Cerca utenti"/>
      <select aria-label="Filtra utenti" value={filter} onChange={e=>setFilter(e.target.value)}>
        <option value="all">Tutti</option><option value="enabled">Collaboratori abilitati</option><option value="others">Da abilitare / revocati</option>
      </select>
      <span>{shown.length} visualizzati · {people.filter(p=>p.enabled).length} abilitati</span>
    </div>
    {shown.length===0?<p className="contrib-hint">Nessun utente corrispondente. Gli account compariranno dopo il loro prossimo accesso; gli UID già autorizzati restano visibili.</p>:shown.map(person=>{
      const isCurrentGM=person.id===user?.uid;
      const name=person.displayName||`Utente ${person.id.slice(0,8)}…`;
      return <article key={person.id} className="contrib-person">
        <div className="contrib-person-info"><strong>{name}</strong>
          {person.email&&<small>{person.email}</small>}
          <code>UID: {person.id}</code>
          {!person.registered&&<small>UID esistente · profilo non ancora registrato</small>}
        </div>
        <div className="contrib-person-actions">
          <span className={`contrib-role ${person.enabled?'enabled':''}`}>{isCurrentGM?'GM':person.enabled?'Collaboratore':'Non abilitato'}</span>
          <button type="button" disabled={busy||isCurrentGM} onClick={()=>change(person.id,!person.enabled)}>
            {person.enabled?'Revoca':'Abilita'}
          </button>
        </div>
      </article>;
    })}
    <div className="contrib-access">
      <strong><ShieldCheck size={15}/> Autorizza tramite UID</strong>
      <p>Per i player che non sono ancora comparsi nell'elenco, puoi continuare a usare l'UID Firebase. I permessi GM non vengono modificati.</p>
      <input aria-label="UID del player" placeholder="UID Firebase del player" value={uid} onChange={e=>setUid(e.target.value.trim())}/>
      <div><button type="button" disabled={busy||!uid} onClick={()=>change(uid,true)}>Abilita</button><button type="button" disabled={busy||!uid} onClick={()=>change(uid,false)}>Revoca</button></div>
    </div>
  </section>;
}
