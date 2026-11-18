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
    m.pop('features',None)
    m.pop('bonusDescription',None)
    m.pop('completeText',None)
count=sum(len(m['abilities']) for m in source['materials'])
output={
    'version':'0.7.38',
    'source':'Suite BTE v0.7.38 · Argentovivo +1 CA e nuova capienza di Amalgama',
    'dcFormula':'6 + Competenza + Purezza effettiva del singolo materiale + modificatore di Intelligenza',
    'materials':source['materials'],
    'genesisProcesses':source['processes'],
    'stats':{'materials':len(source['materials']),'abilities':count,'processes':len(source['processes'])}
}
dest=root/'src'/'data'/'compendium.json'
dest.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f"Aggiornati: {len(source['materials'])} materiali, {count} capacità, {len(source['processes'])} processi")
