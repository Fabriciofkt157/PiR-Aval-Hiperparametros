# Regenera data/questions.json a partir de scripts/jsonl/*.jsonl (um arquivo por modelo)
# e, se existir, scripts/referencias.json (um item por pergunta, na ordem em que aparecem nos jsonl).
# Itens "pergunta de personalidade"/"pergunta de conversação" = sem referência factual (não aparece painel).
import json,glob,os
fs=sorted(glob.glob('scripts/jsonl/*.jsonl')); models=[os.path.basename(f)[:-6] for f in fs]; Q={}; ordem=[]
for m,f in zip(models,fs):
    for l in open(f):
        if l.strip():
            r=json.loads(l)
            if r['idx'] not in Q: ordem.append(r['idx'])
            Q.setdefault(r['idx'],{'idx':r['idx'],'prompt':r['prompt'],'r':{}})['r'][m]=r['resposta']
if os.path.exists('scripts/referencias.json'):
    refs=json.load(open('scripts/referencias.json'))
    assert len(refs)==len(ordem),f'{len(refs)} referências para {len(ordem)} perguntas'
    for idx,ref in zip(ordem,refs):
        if ref and not ref.startswith('pergunta de '): Q[idx]['ref']=ref
json.dump({'models':models,'questions':[Q[i] for i in sorted(Q)]},open('data/questions.json','w'),ensure_ascii=False)
print(len(Q),'perguntas,',len(models),'modelos,',sum('ref' in q for q in Q.values()),'com referência')
