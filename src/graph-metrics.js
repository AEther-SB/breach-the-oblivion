// Il grado conta vicini UNICI: due relazioni verso la stessa voce valgono una connessione.
export const DEGREE_LEGEND=[
  {min:0,max:0,label:'Isolato',color:'#71839d',radius:5},
  {min:1,max:2,label:'1–2',color:'#7aaed5',radius:6.5},
  {min:3,max:5,label:'3–5',color:'#8bc6af',radius:8.5},
  {min:6,max:11,label:'6–11',color:'#dab57d',radius:11},
  {min:12,max:Infinity,label:'12+',color:'#db897e',radius:14},
];
export function connectionDegrees(graph, referencesOnly=false){
 const neighbors=new Map(graph.nodes.map(n=>[n.id,new Set()]));
 for(const e of graph.edges){if(referencesOnly&&e.type!=='reference')continue;if(e.source===e.target)continue;
  neighbors.get(e.source)?.add(e.target);neighbors.get(e.target)?.add(e.source);
 }
 return new Map([...neighbors].map(([id,items])=>[id,items.size]));
}
export const degreeStyle=count=>DEGREE_LEGEND.find(b=>count<=b.max)||DEGREE_LEGEND.at(-1);
