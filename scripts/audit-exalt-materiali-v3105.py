#!/usr/bin/env python3
"""Audit riproducibile del testo meccanico fra Exalt Core e Compendio BTO.
   Le differenze nei prerequisiti editoriali sono intenzionali e documentate.
"""
from pathlib import Path
from html.parser import HTMLParser
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
class Plain(HTMLParser):
    def __init__(self): super().__init__();self.parts=[]
    def handle_data(self, s): self.parts.append(s)
def plain(s):
    p=Plain(); p.feed(s or ''); return ''.join(p.parts).strip()

site=json.loads((ROOT/'src/data/compendium.json').read_text('utf-8'))
source=json.loads((ROOT/'modulo-exalt-dump.json').read_text('utf-8'))
errors=[]; count=0
current={m['id']:m for m in site['materials']}
if set(current)!=set(source):errors.append('Elenco materiali non coincidente')
for mid,mat in source.items():
    if mid not in current:continue
    m=current[mid]
    for field in ('name','group','bonus','ability'):
        if m[field]!=mat[field]:errors.append(f'{mid}: {field}')
    ours=[(a['name'],a['level'],plain(a['html'])) for a in m['abilities']]
    theirs=[(a['name'],a['level'],plain(a['html'])) for a in mat['abilities']]
    count+=len(ours)
    if ours!=theirs:errors.append(f'{mid}: capacità/dettagli diversi')
print(f'Materiali: {len(current)} · Capacità: {count} · Differenze meccaniche: {len(errors)}')
for err in errors:print('DIFF:',err)
sys.exit(1 if errors else 0)
