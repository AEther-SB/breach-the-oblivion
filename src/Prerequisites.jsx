import React, { useMemo } from 'react';
import { Check, LockKeyhole, Route, ShieldCheck } from 'lucide-react';
import { glossaryEntries, linkedHtml } from './relations';
import { useContent } from './content-store';
import { sanitizeHtml } from './sanitize';
import { parseRequirements } from './prerequisite-utils';

// I percorsi sono solo una riformattazione del testo originale; non modificano i requisiti.

function RequirementPhrase({text, glossary}) {
  const html=useMemo(()=>linkedHtml(sanitizeHtml(`<span>${String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>`),glossary),[text,glossary]);
  return <span className="req-phrase" dangerouslySetInnerHTML={{__html:html}}/>;
}

export default function Prerequisites({material}) {
  const {materials, processes}=useContent();
  const structured=useMemo(()=>parseRequirements(material.requirementsText),[material.requirementsText]);
  const glossary=useMemo(()=>glossaryEntries(materials,processes,`material:${material.materialId}`),[materials,processes,material.materialId]);
  return <section className={`requirements-card ${structured.free?'requirements-card-free':''}`} aria-label={`Prerequisiti di ${material.title}`}>
    <div className="requirements-header">
      <span className="requirements-label"><ShieldCheck size={15} strokeWidth={1.6}/> PREREQUISITI</span>
      <span className={`requirements-status ${structured.free?'is-free':'is-locked'}`}>{structured.free?<><Check size={13}/> ACCESSO LIBERO</>:<><LockKeyhole size={12}/> ACCESSO CONDIZIONATO</>}</span>
    </div>
    {structured.free ? <p className="requirements-free-text">Nessuno.</p> : <>
      {structured.level && <div className="requirement-base"><span>Livello minimo</span><strong>{structured.level} <small>Exalt</small></strong></div>}
      <div className={`requirement-paths ${structured.routes.length>1?'is-multiple':''}`}>
        {structured.routes.length>1 && <span className="requirement-paths-caption"><Route size={14}/> Soddisfa uno dei percorsi seguenti</span>}
        {structured.routes.map((part,i)=><div className="requirement-path" key={`${i}-${part}`}>
          {structured.routes.length>1 && <span className="requirement-route-index">{String(i+1).padStart(2,'0')}</span>}
          <RequirementPhrase text={part} glossary={glossary}/>
        </div>)}
      </div>
      {structured.note && <p className="requirements-note">{structured.note}</p>}
    </>}
  </section>;
}
