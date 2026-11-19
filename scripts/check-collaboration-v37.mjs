import fs from 'node:fs';
import assert from 'node:assert/strict';
import {connectionDegrees,degreeStyle,DEGREE_LEGEND} from '../src/graph-metrics.js';
const read=f=>fs.readFileSync(f,'utf8');
const rules=read('firestore.rules'),store=read('src/content-store.jsx'),ui=read('src/ContributionCenter.jsx'),history=read('src/StoriaTimeline.jsx'),relation=read('src/RelationMap.jsx'),main=read('src/main.jsx');
for(const x of ['match /contributors/{uid}','match /submissions/{submissionId}','request.resource.data.status == \'pending\'','allow create: if contributor()','allow update, delete: if gm()','match /entries/{entryId}','allow create, update, delete: if gm()']) assert(rules.includes(x),`Regola assente: ${x}`);
for(const x of ['submitProposal','decideProposal','setContributorEnabled','sourceProposal:proposal.id','reviewedBy:user.uid','setContributor','contributor()']){}
for(const x of ['submitProposal','decideProposal','setContributorEnabled','sourceProposal:proposal.id','reviewedBy:user.uid','setContributor'])assert(store.includes(x),`Flusso mancante: ${x}`);
for(const x of ['BlocksComposer','GenericBlocks','Approva e pubblica','Respingi','Nuova voce / evento','editingProposal','loreCategory','Timeline','timeline']) {
 if(x==='Timeline')continue;
 assert(ui.toLowerCase().includes(x.toLowerCase()),`Editor/revisione mancanti: ${x}`);
}
assert(history.includes('openContribution({parentId:\'storia-passato\',historical:true})'));
assert(history.includes('page.loreCategory||LORE_AREAS[page.id]'));
assert(main.includes('<ContributionCenter/>')&&main.includes('<ProposalAction entry={entry}/>'));
assert(relation.includes('DEGREE_LEGEND')&&relation.includes('connessioni dirette')&&relation.includes('Linee continue: gerarchia'));
const graph={nodes:[{id:'a'},{id:'b'},{id:'c'}],edges:[{source:'a',target:'b',type:'category'},{source:'a',target:'b',type:'reference'},{source:'a',target:'c',type:'reference'}]};
const all=connectionDegrees(graph),refs=connectionDegrees(graph,true);
assert.equal(all.get('a'),2,'Le connessioni duplicate non devono gonfiare i gradi');
assert.equal(refs.get('a'),2);assert.equal(refs.get('b'),1);
assert.equal(degreeStyle(0).label,'Isolato');assert.equal(degreeStyle(3).label,'3–5');assert.equal(degreeStyle(20).label,'12+');
assert.equal(DEGREE_LEGEND.length,5);
console.log('OK — v3.7: permessi Firestore, proposte isolate, revisione GM, archivio storico e legenda per densità.');
