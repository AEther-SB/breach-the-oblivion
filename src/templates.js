// Modelli modificabili: nessun contenuto è una regola o un fatto canonico.
const text = (html) => ({type:'rich',html});
const heading = (value) => ({type:'heading',level:2,text:value});
export const TEMPLATES = [
  {id:'blank',kind:'page',name:'Pagina vuota',description:'Parti da una pagina senza contenuto.',descriptionText:'',blocks:[]},
  {id:'character',kind:'page',name:'Personaggio',description:'Identità, ritratto, storia e relazioni.',descriptionText:'Scheda narrativa del personaggio.',blocks:[
    {type:'image',url:'',alt:'Ritratto del personaggio',caption:''},
    heading('Identità'),{type:'table',columns:['Voce','Dettaglio'],rows:[['Nome',''],['Ruolo',''],['Affiliazione',''],['Luogo','']]},
    heading('Storia'),text('<p>Inserisci la storia del personaggio.</p>'),
    heading('Personalità'),text('<p>Tratti, motivazioni e obiettivi.</p>'),
    heading('Relazioni'),{type:'links',links:[{text:'',url:''}]},
  ]},
  {id:'location',kind:'page',name:'Luogo',description:'Atmosfera, geografia, punti di interesse e collegamenti.',descriptionText:'Scheda descrittiva del luogo.',blocks:[
    {type:'image',url:'',alt:'Panorama del luogo',caption:''},
    heading('Panoramica'),text('<p>Descrivi il luogo.</p>'),
    heading('Punti di interesse'),{type:'list',items:[''],ordered:false},
    heading('Collegamenti'),{type:'links',links:[{text:'',url:''}]},
  ]},
  {id:'event',kind:'page',name:'Evento',description:'Cronologia, protagonisti, conseguenze.',descriptionText:'Evento o avvenimento.',blocks:[
    {type:'table',columns:['Data','Luogo'],rows:[['','']]},
    heading('Svolgimento'),text('<p>Racconta gli avvenimenti.</p>'),
    heading('Conseguenze'),text('<p>Descrivi le conseguenze.</p>'),
    heading('Collegamenti'),{type:'links',links:[{text:'',url:''}]},
  ]},
  {id:'collection',kind:'collection',name:'Raccolta vuota',description:'Organizza pagine e sottoraccolte.',descriptionText:'',blocks:[]},
  {id:'characters',kind:'collection',name:'Archivio personaggi',description:'Una raccolta predisposta per i personaggi.',descriptionText:'Personaggi e figure del mondo.',blocks:[heading('Archivio'),text('<p>Presentazione della raccolta.</p>')]},
];
export const templatesForKind = kind => TEMPLATES.filter(t=>t.kind===kind);
export function applyTemplate(entry, templateId) {
  const template=TEMPLATES.find(t=>t.id===templateId&&t.kind===entry.kind)||TEMPLATES.find(t=>t.kind===entry.kind);
  return {...entry,description:template.descriptionText,blocks:(template.blocks||[]).map((b,i)=>({...JSON.parse(JSON.stringify(b)),id:`blocco-${i}-${Math.random().toString(36).slice(2,9)}`})),templateId:template.id};
}
