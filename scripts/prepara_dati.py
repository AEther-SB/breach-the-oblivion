#!/usr/bin/env python3
"""Ricrea i contenuti del sito dagli export della Suite BTE.
Uso: python3 scripts/prepara_dati.py [contenuti/materials_v0736.json]
I testi delle capacità sono mantenuti identici; i profili editoriali sono separati.
"""
from pathlib import Path
import json, sys
root=Path(__file__).resolve().parents[1]
source_path=Path(sys.argv[1]) if len(sys.argv)>1 else root/'contenuti'/'materials_v0736.json'
source=json.loads(source_path.read_text(encoding='utf-8'))
requirements=json.loads((root/'contenuti'/'prerequisiti.json').read_text(encoding='utf-8'))
profiles=json.loads((root/'contenuti'/'profili-materiali.json').read_text(encoding='utf-8'))
process_errata=json.loads((root/'contenuti'/'errata-processi.json').read_text(encoding='utf-8'))
for m in source['materials']:
    m['requirementsText']=requirements.get(m['id'],'Nessuno.')
    m['profile']=profiles[m['id']]
    # Correzione successiva all'export v0.7.36: Scudo di Azoth = +1 CA fisso.
    if m['id']=='argentovivo':
        for ability in m['abilities']:
            if ability['name']=='Memoria Vitale':
                ability['html']=ability['html'].replace('bonus alla CA per <strong>1 minuto</strong>', '<strong>+1 alla CA per 1 minuto</strong>')
    # Capienza di Amalgama aggiornata nella Suite BTE v0.7.38.
    if m['id']=='amalgama':
        for ability in m['abilities']:
            if ability['name']=='Esistenza Transitoria':
                ability['html']=ability['html'].replace(
                    '5 volte la somma della Purezza effettiva di tutti i materiali posseduti',
                    '6 per grado di Purezza effettiva di Amalgama, più 3 per grado di Purezza effettiva degli altri materiali posseduti'
                )
    # Testi sincronizzati con Foundry; non aggiungere correzioni meccaniche autonome.
    revision_path = root/'contenuti'/'ability-editorial-overrides.json'
    editorial_overrides = json.loads(revision_path.read_text(encoding='utf-8')) if revision_path.exists() else {}
    for ability in m['abilities']:
        revised = editorial_overrides.get(m['id'], {}).get(str(ability['level']))
        if revised is not None:
            ability['html'] = revised
    m.pop('features',None)
    m.pop('bonusDescription',None)
    m.pop('completeText',None)
# Interventi editoriali localizzati: solo marcatori HTML e refusi certi.
# L'export originale rimane intatto per consentire confronti e migrazioni conservative.
import re, html
for process in source['processes']:
    spec=process_errata[process['name']]
    raw=process['html']
    label=spec['label']
    options=[label+':',label.replace('’','&#x27;')+':']
    target=next((x for x in options if raw.count(x)==1),None)
    assert target,(process['name'],'intestazione non univoca',options)
    raw=raw.replace(target,'<strong>'+target+'</strong>',1)
    for old,new in spec.get('replacements',[]):
        assert raw.count(old)==1,(process['name'],'refuso non univoco',old)
        raw=raw.replace(old,new,1)
    if process['name']=='Proiezione':
        original='<p>*Questo processo non può essere ottenuto tramite altre capacità o altri processi.*</p>'
        assert original in raw
        raw=raw.replace(original,'<p><em>Questo processo non può essere ottenuto tramite altre capacità o altri processi.</em></p>',1)
    if process['name']=='Moltiplicazione':
        # Le sei opzioni erano paragrafi che iniziavano col simbolo bullet.
        pattern=r'((?:<p>• [^<]*</p>){6})'
        match=re.search(pattern,raw)
        assert match, 'Elenco di Moltiplicazione non trovato'
        items=re.findall(r'<p>• ([^<]*)</p>',match.group(1))
        assert len(items)==6
        raw=raw[:match.start()]+'<ul>'+''.join('<li>'+item+'</li>' for item in items)+'</ul>'+raw[match.end():]
    process['html']=raw

count=sum(len(m['abilities']) for m in source['materials'])
output={
    'version':'0.7.40',
    'source':'Suite BTE v0.7.40 · descrizioni uniformate con Foundry',
    'dcFormula':'6 + Competenza + Purezza effettiva del singolo materiale + modificatore di Intelligenza',
    'materials':source['materials'],
    'genesisProcesses':source['processes'],
    'stats':{'materials':len(source['materials']),'abilities':count,'processes':len(source['processes'])}
}
dest=root/'src'/'data'/'compendium.json'
dest.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f"Aggiornati: {len(source['materials'])} materiali, {count} capacità, {len(source['processes'])} processi")
