// Modelli modificabili: nessun contenuto è una regola o un fatto canonico.
const text = (html) => ({type:'rich',html});
const heading = (value) => ({type:'heading',level:2,text:value});
// Il layout determina pittogramma, accento e struttura senza richiedere codice custom per ogni nuova voce.
const lorePage = (id,name,description,layout,icon,headings)=>({id,kind:'page',name,description,layout,icon,descriptionText:'',blocks:headings.flatMap((title,i)=>[heading(title),text('<p>'+(['Introduzione e informazioni confermate.','Da approfondire: dati, fonti e collegamenti pertinenti.'][i%2])+'</p>')])});
export const TEMPLATES = [
  {id:'blank',kind:'page',name:'Pagina vuota',description:'Parti da una pagina senza contenuto.',descriptionText:'',blocks:[],layout:'lore',icon:'book'},
  lorePage('flame-lore','Fiamme · approfondimento','Articolo per manifestazioni, Essenza e colori.','flames','flame',['Fondamenti','Caratteristiche','Rapporti con i poteri']),
  lorePage('quirk-lore','Quirk · dossier','Pagina per poteri e classificazioni.','quirk','dna',['Panoramica','Tipologia e capacità','Fiamma e Traccia Quirk']),
  lorePage('counterbody-lore','Controcorpi · dossier','Pagina per origine, tipologia e funzionamento.','counterbodies','shield',['Panoramica','Classificazione','Interazioni note']),
  lorePage('historical-lore','Storia · evento','Pagina per un evento e le sue diramazioni.','history','history',['Contesto','Svolgimento','Conseguenze e fonti']),
  lorePage('organization','Organizzazione','Profilo organizzativo e collegamenti geografici.','organizations','users',['Panoramica','Obiettivi e attività','Sedi e relazioni']),
  lorePage('alchemy-lore','Alchimia · approfondimento','Approfondimento narrativo per fenomeni alchemici.','alchemy','flask',['Panoramica','Teorie e conoscenze','Relazioni']),
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
  {id:'collection',kind:'collection',name:'Raccolta vuota',description:'Organizza pagine e sottoraccolte.',descriptionText:'',blocks:[],layout:'lore',icon:'book'},
  {id:'flame-collection',kind:'collection',name:'Raccolta Fiamme',description:'Raccolta con layout per Fiamme ed Essenza.',descriptionText:'',blocks:[],layout:'flames',icon:'flame'},
  {id:'organization-collection',kind:'collection',name:'Raccolta Organizzazioni',description:'Archivio di gruppi, società e strutture.',descriptionText:'',blocks:[],layout:'organizations',icon:'users'},
  {id:'historical-collection',kind:'collection',name:'Raccolta Storia',description:'Raccolta per eventi e cronache.',descriptionText:'',blocks:[],layout:'history',icon:'history'},
  {id:'characters',kind:'collection',name:'Archivio personaggi',description:'Una raccolta predisposta per i personaggi.',descriptionText:'Personaggi e figure del mondo.',blocks:[heading('Archivio'),text('<p>Presentazione della raccolta.</p>')]},
];
export const templatesForKind = kind => TEMPLATES.filter(t=>t.kind===kind);
export function applyTemplate(entry, templateId) {
  const template=TEMPLATES.find(t=>t.id===templateId&&t.kind===entry.kind)||TEMPLATES.find(t=>t.kind===entry.kind);
  return {...entry,description:template.descriptionText,layout:template.layout||'lore',icon:template.icon||'book',blocks:(template.blocks||[]).map((b,i)=>({...JSON.parse(JSON.stringify(b)),id:`blocco-${i}-${Math.random().toString(36).slice(2,9)}`})),templateId:template.id};
}
