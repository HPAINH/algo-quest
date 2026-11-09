import io, contextlib, time, math, json, sys
from tasks_a import *; from tasks_b import *; from tasks_c import *; from interview import INTERVIEW
from chapters import CHAPTERS
CHS=[(a,b) for a,b,c in CHAPTERS]
import copy
def norm(v,mode):
    if mode=='sorted': return sorted(v)
    if mode=='groups': return sorted(sorted(g) for g in v)
    return v
def eq(a,b,mode):
    if mode=='float_list':
        try: return len(a)==len(b) and all(math.isclose(float(x),float(y),rel_tol=1e-6) for x,y in zip(a,b))
        except Exception: return False
    if mode=='float':
        try: return math.isclose(float(a),float(b),rel_tol=1e-6,abs_tol=1e-9)
        except Exception: return False
    try: return norm(a,mode)==norm(b,mode)
    except Exception: return False
def load(src,fn):
    g={}; exec(src,g); return g[fn]
def run_tests(src,t):
    f=load(src,t['fn']); bad=[]
    for i,tc in enumerate(t['tests']):
        try: got=f(*copy.deepcopy(tc['args']))
        except Exception as e: got=repr(e)
        if not eq(got,tc['exp'],t.get('compare','exact')): bad.append((i,got,tc['exp']))
    return bad
import multiprocessing as mp
def _sp(src,t,q):
    g={}; exec(t['speed']['gen'],g); args=g['ARGS']; f=load(src,t['fn'])
    t0=time.time()
    args=copy.deepcopy(args); t0=time.time()
    try:
        for _ in range(t['speed'].get('repeat',1)): f(*args)
    except Exception: q.put(99); return
    q.put(time.time()-t0)
def speed(src,t,limit=4):
    q=mp.Queue(); p=mp.Process(target=_sp,args=(src,t,q)); p.start(); p.join(limit)
    if p.is_alive(): p.kill(); return 99
    return q.get() if not q.empty() else 99
errs=[]
allc=[(t,'study') for ch,_ in CHS for t in ch]+[(t,'iv') for t in INTERVIEW]
for t,kind in allc:
    ty=t.get('type','code')
    if kind=='study': assert len(t['hints'])==5, t['id']
    else: assert len(t['hints'])==5, t['id']
    if ty in('code',):
        b=run_tests(t['ref'],t)
        if b: errs.append((t['id'],'ref fails',b))
        for bv in t.get('bad',[]):
            fb=run_tests(bv,t)
            if not fb:
                if 'speed' in t:
                    rs=speed(t['ref'],t); bs=speed(bv,t)
                    if bs < max(5*rs, 0.3): errs.append((t['id'],'bad passes & not slow',rs,bs))
                    else: print('  slow-only bad',t['id'],round(rs,3),round(bs,2))
                else: errs.append((t['id'],'bad passes, no speed'))
        if 'speed' in t:
            rs=speed(t['ref'],t)
            if rs>0.5: errs.append((t['id'],'ref slow',rs))
    if ty=='gap':
        src=t['template'].replace('____',t['ref_fill'])
        b=run_tests(src,t)
        if b: errs.append((t['id'],'gap fails',b))
        b2=run_tests(t['template'].replace('____','pass'),t)
        if not b2: errs.append((t['id'],'gap without fill passes'))
    if ty=='predict':
        buf=io.StringIO()
        with contextlib.redirect_stdout(buf): exec(t['code'],{})
        out=' '.join(buf.getvalue().split())
        if out!=t['answer']: errs.append((t['id'],'predict',out,t['answer']))
    if ty=='bug':
        assert 0<=t['line']<len(t['code']) and 0<=t['fix']<len(t['fixes'])
        # apply fix and run if possible
    if ty=='trace':
        assert len(t['rows'])==len(t['answer'])
        for r,a in zip(t['rows'],t['answer']):
            assert len(r)==len(a)==len(t['columns']),t['id']
            for x,y in zip(r,a): assert x is None or x==y,(t['id'],x,y)
    if ty=='choice': assert 0<=t['answer']<len(t['options'])
print('errors:'); [print(e) for e in errs]
