# Regenera data/questions.json a partir de scripts/jsonl/*.jsonl (um arquivo por modelo)
import json,glob,os
fs=sorted(glob.glob('scripts/jsonl/*.jsonl')); models=[os.path.basename(f)[:-6] for f in fs]; Q={}
for m,f in zip(models,fs):
    for l in open(f):
        if l.strip():
            r=json.loads(l); Q.setdefault(r['idx'],{'idx':r['idx'],'prompt':r['prompt'],'r':{}})['r'][m]=r['resposta']
json.dump({'models':models,'questions':[Q[i] for i in sorted(Q)]},open('data/questions.json','w'),ensure_ascii=False)
print(len(Q),'perguntas,',len(models),'modelos')
