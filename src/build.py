import json, re, shutil, os
from tasks_a import *; from tasks_b import *; from tasks_c import *; from interview import INTERVIEW
lessons=json.load(open('lessons.json'))
from chapters import CHAPTERS as CH
def clean(t):
    t={k:v for k,v in t.items() if k!='bad'}
    for x in t.get('tests',[]): x.setdefault('hidden',False)
    return t
levels=[]
for i,(tasks,test,viz) in enumerate(CH):
    L=lessons[i]; short=re.sub(r'^Глава \d+\.\s*','',L['title'])
    levels.append(dict(title=L['title'],short=short,part=L['part'].replace('. ',' · ',1),
        cards=L['cards'],viz=viz,tasks=[clean(t) for t in tasks],test=test))
import markdown
def to_html(text):
    h = markdown.markdown(text, extensions=['tables','fenced_code','sane_lists'])
    return h.replace('<table>','<div class="tw"><table>').replace('</table>','</table></div>')
from new_a import NEW_A; from new_b import NEW_B; from new_c import NEW_C; from new_d import NEW_D; from new_e import NEW_E; from new_f import NEW_F
for C in NEW_A+NEW_B+NEW_C+NEW_D+NEW_E+NEW_F:
    levels.append(dict(title=C['title'],short=re.sub(r'^Глава \d+\.\s*','',C['title']),part=C['part'],
        cards=[dict(title=t,html=to_html(m)) for t,m in C['cards']],viz=C['viz'],tasks=[clean(t) for t in C['tasks']],test=C['test']))
from iv2 import INTERVIEW2
ivs=[clean(p) for p in INTERVIEW+INTERVIEW2]
data='const DATA = '+json.dumps(dict(levels=levels,interview=ivs),ensure_ascii=False)+';'
html=open('template.html').read().replace('/*__DATA__*/',data.replace('</','<\\/')).replace('/*__APP__*/',open('app.js').read()+'\n'+open('viz2.js').read())
os.makedirs('dist/py',exist_ok=True)
open('dist/artifact.html','w').write(html)
full='<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<style>[hidden]{display:none!important}body{margin:0}</style>\n'+html.replace('<header class="top">','</head>\n<body>\n<header class="top">',1)+'\n</body>\n</html>\n'
open('dist/index.html','w').write(full)
import base64
open('dist/py/python_stdlib.zip.txt','w').write(base64.b64encode(open(os.environ.get('PYODIDE_DIR','/tmp/pyo/package')+'/python_stdlib.zip','rb').read()).decode())
if os.path.exists('dist/py/python_stdlib.zip'): os.remove('dist/py/python_stdlib.zip')
for f in ['pyodide.js','pyodide.asm.js','pyodide.asm.wasm','pyodide-lock.json']:
    shutil.copy(os.environ.get('PYODIDE_DIR','/tmp/pyo/package')+'/'+f,'dist/py/'+f)
print(len(html)//1024,'KB', sum(len(l['tasks']) for l in levels),'tasks', len(ivs),'iv')
