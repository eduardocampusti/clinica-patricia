"""Inspeção dos artefatos reais; não aplica backend nem gera PDFs."""
from pathlib import Path
import hashlib,json,re
from pypdf import PdfReader
from pypdf.generic import ContentStream
import pdfplumber
import pypdfium2 as pdfium

raiz=Path(__file__).resolve().parents[2]
saida=raiz/'scratch/configuracoes-revisao'
original=saida/'demonstracao-original.pdf'
assert hashlib.sha256(original.read_bytes()).hexdigest()=='c26f69613fd60c815d096b3ad9930e3eb2fdbf36157cd0faca22e5a9c4e4aec7'
rel=[]
for path in [raiz/'output/pdf/demonstracao-configuracoes-revisada.pdf',saida/'financeiro-revisado.pdf',saida/'nome-longo-revisado.pdf']:
    r=PdfReader(path);fontes={};textos=[];ops=[];usadas=set()
    for p in r.pages:
        assert abs(float(p.mediabox.width)-595.28)<.02 and abs(float(p.mediabox.height)-841.89)<.02
        textos.append(p.extract_text())
        for args,op in ContentStream(p.get_contents(),r).operations:
            if op==b'Tf':usadas.add(str(args[0]))
            if op in [b'Tc',b'Tw',b'Tz',b'TJ']:
                ops.append([op.decode(),str(args)])
                if op in [b'Tc',b'Tw']:assert float(args[0])==0
                if op==b'Tz':assert float(args[0])==100
        for k,v in p['/Resources']['/Font'].items():
            f=v.get_object();cid=f['/DescendantFonts'][0].get_object();d=cid['/FontDescriptor'].get_object()
            assert '/FontFile2' in d and '/ToUnicode' in f and str(f['/Encoding'])=='/Identity-H'
            fontes[str(k)]={'nome':str(f['/BaseFont']),'tipo':str(f['/Subtype']),'incorporada':True,'encoding':str(f['/Encoding']),'larguras':len(cid['/W']),'unicode':True}
    assert usadas==set(fontes)
    assert len(r.pages)>=2 if not path.name.startswith('nome-longo') else len(r.pages)==1
    completo='\n'.join(textos)
    if path.name.startswith('demonstracao'):
        for n,t in enumerate(textos,1):
            for trecho in ['Clínica Exemplo','11.222.333/0001-81','CNPJ DE TESTE','Rodapé personalizado','DEMONSTRAÇÃO','SEM VALIDADE CLÍNICA',f'Página {n} de {len(r.pages)}']:
                assert trecho in t,(n,trecho)
        assert 'Instituições Multiclínicas' in completo
        assert 'Parágrafo demonstrativo 22.' in completo
        # XObject raster proporcional (4:1), incorporado e reutilizado nas páginas.
        imgs=[v.get_object() for v in r.pages[0]['/Resources']['/XObject'].values() if v.get_object().get('/Subtype')=='/Image']
        assert any(float(i['/Width'])/float(i['/Height'])==4 for i in imgs)
    elif path.name.startswith('financeiro'):
        assert 'unidade 1; padrão geral 2; fonte fonte-financeira-sintetica' in r.metadata.subject
        assert 'Clínica Financeira Fictícia' in completo
        assert '1.234,56' in completo
        for n in range(1,181):assert re.search(rf'Movimento fictício {n}\b',completo),f'Linha financeira {n} ausente'
        assert completo.count('Movimento fictício ')==180
        assert completo.count('12,34')==180
    else:
        assert completo.count('Nome Institucional Longo')==3
        assert 'Conferência de nome longo em negrito' in completo
    doc=pdfium.PdfDocument(str(path))
    for n in range(len(doc)):
        p=doc[n];texto=p.get_textpage().get_text_range();assert 'Clínica' in texto
        p.render(scale=1.5).to_pil().save(saida/f'{path.stem}-pdfium-{n+1}.png');p.close()
    doc.close()
    with pdfplumber.open(path) as pdf:
        # Tudo não rotacionado deve permanecer dentro da folha; marca-d'água é rotacionada.
        for n,p in enumerate(pdf.pages,1):
            for c in p.chars:
                if c['upright']:assert c['x0']>=18*72/25.4-.1 and c['x1']<=p.width-18*72/25.4+.1 and c['top']>=0 and c['bottom']<=p.height+.1,(n,c['text'],c['x0'],c['x1'])
    rel.append({'arquivo':str(path.relative_to(raiz)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'paginas':len(r.pages),'fontes':fontes,'espacamento':ops[:12]})
(saida/'inspecao-revisada.json').write_text(json.dumps(rel,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(rel,ensure_ascii=False))
