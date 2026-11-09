import re, markdown, json
md = open('method.md').read()
lines = md.split('\n')
# split into blocks honoring code fences
chapters = []; cur_part=''; cur_ch=None; cur_sec=None; in_code=False
for ln in lines:
    if ln.startswith('```'): in_code = not in_code
    if not in_code and re.match(r'^## Глава \d+\.', ln):
        cur_ch={'title':ln[3:].strip(),'part':cur_part,'sections':[]}; chapters.append(cur_ch); cur_sec=None; continue
    if not in_code and re.match(r'^# Часть', ln):
        cur_part=ln[2:].strip(); cur_ch=None; cur_sec=None; continue
    if cur_ch is None: continue
    if not in_code and ln.startswith('### '):
        cur_sec={'title':ln[4:].strip(),'body':[]}; cur_ch['sections'].append(cur_sec); continue
    if cur_sec is None:
        cur_sec={'title':'Введение','body':[]}; cur_ch['sections'].append(cur_sec)
    cur_sec['body'].append(ln)
SKIP = re.compile(r'^(Проверь себя|Ответы|Практика|Задачи)')
def to_html(text):
    text = text.replace('\\[','[').replace('\\]',']')
    h = markdown.markdown(text, extensions=['tables','fenced_code','sane_lists'])
    h = re.sub(r'<pre><code class="language-latex">', '<pre class="formula"><code>', h)
    h = h.replace('<table>','<div class="tw"><table>').replace('</table>','</table></div>')
    return h
out=[]
for ch in chapters:
    cards=[]; tasks_card=None
    for s in ch['sections']:
        body='\n'.join(s['body']).strip()
        if s['title'].startswith('Задачи'):
            tasks_card={'title':'Реши на LeetCode','html':to_html(body)}; continue
        if SKIP.match(s['title']): continue
        # split by #### into sub-cards
        parts=re.split(r'\n(?=#### )', '\n'+body)
        head=parts[0].strip()
        subs=parts[1:]
        if head:
            cards.append({'title':s['title'],'html':to_html(head)})
        for p in subs:
            p=p.strip(); t=p.split('\n',1)[0][5:].strip(); b=p.split('\n',1)[1] if '\n' in p else ''
            cards.append({'title':t,'section':s['title'],'html':to_html(b)})
    if tasks_card: cards.append(tasks_card)
    merged=[]; carry=None
    for c in cards:
        c['title']=c['title']
        c['title']=re.sub(r'\\([_\[\]*])',r'\1',c['title'])
        if carry:
            if c.get('section')==carry['title']:
                c={'title':carry['title'],'html':carry['html']+'<h4>'+c['title']+'</h4>'+c['html']}
            else:
                c={'title':carry['title']+' · '+c['title'],'html':carry['html']+'<h4>'+c['title']+'</h4>'+c['html']}
            carry=None
        if len(c['html'])<420 and c is not cards[-1]:
            carry=c; continue
        merged.append(c)
    if carry: merged.append(carry)
    cards=merged
    out.append({'title':ch['title'],'part':ch['part'],'cards':cards})
for ch in out:
    for c in ch['cards']:
        if c['title'].startswith('Введение · '): c['title']=c['title'][len('Введение · '):]
json.dump(out,open('lessons.json','w'),ensure_ascii=False)
for i,c in enumerate(out,1):
    print(i,c['title'][:50],len(c['cards']),'cards', sum(len(x['html']) for x in c['cards'])//1000,'KB')
