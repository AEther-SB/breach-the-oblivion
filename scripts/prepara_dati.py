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
    m.pop('features',None)
    m.pop('bonusDescription',None)
    m.pop('completeText',None)
count=sum(len(m['abilities']) for m in source['materials'])
output={
    'version':'0.7.36',
    'source':'Suite BTE v0.7.36 · Exalt Core 0.7.28',
    'dcFormula':'6 + Competenza + Purezza effettiva del singolo materiale + modificatore di Intelligenza',
    'materials':source['materials'],
    'genesisProcesses':source['processes'],
    'stats':{'materials':len(source['materials']),'abilities':count,'processes':len(source['processes'])}
}
dest=root/'src'/'data'/'compendium.json'
dest.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f"Aggiornati: {len(source['materials'])} materiali, {count} capacità, {len(source['processes'])} processi")
