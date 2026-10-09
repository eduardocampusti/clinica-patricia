"""Conferência local dos PDFs fictícios produzidos pelos testes de navegador.
Executar com o Python bundled do Codex (pypdf/pdfplumber); nenhum backend.
"""
import json
import re
from pathlib import Path
import pdfplumber
from pypdf import PdfReader

raiz = Path(__file__).resolve().parents[2] / "scratch" / "configuracoes"
resultado = []
for arquivo, minimo, maximo in [("uma-pagina.pdf", 1, 1), ("demonstracao.pdf", 3, 3), ("financeiro-ficticio.pdf", 2, 20)]:
    reader = PdfReader(raiz / arquivo)
    assert minimo <= len(reader.pages) <= maximo, arquivo
    assert "/JavaScript" not in reader.trailer["/Root"].get("/Names", {}), arquivo
    textos = []
    with pdfplumber.open(raiz / arquivo) as pdf:
        for n, pagina in enumerate(pdf.pages, 1):
            assert abs(pagina.width - 595.28) < 1 and abs(pagina.height - 841.89) < 1
            texto = pagina.extract_text() or ""
            textos.append(texto)
            assert f"Página {n} de {len(pdf.pages)}" in texto, (arquivo, n)
            if arquivo != "financeiro-ficticio.pdf":
                assert "DADOS FICTÍCIOS" in texto and "SEM VALIDADE CLÍNICA" in texto
            palavras = pagina.extract_words()
            # Todo caractere fica dentro da página. Footer e paginação reservados.
            assert all(-1 <= c["x0"] <= c["x1"] <= pagina.width + 1 and -1 <= c["top"] <= c["bottom"] <= pagina.height + 1 for c in pagina.chars)
            if arquivo == "financeiro-ficticio.pdf":
                assert "Clínica Sintética" in texto
                corpo = [w for w in palavras if w["text"] == "Movimento"]
                assert all(70 < w["top"] and w["bottom"] < 760 for w in corpo), (arquivo, n)
    texto = "\n".join(textos)
    if arquivo == "financeiro-ficticio.pdf":
        assert "1.234,56" in texto and "12,34" in texto
        assert len(re.findall(r"Movimento fictício \d+", texto)) == 180
        assert "Movimento fictício 180" in texto
    resultado.append({"arquivo": arquivo, "paginas": len(reader.pages), "a4": True, "texto_e_paginacao": "aprovados", "dados": "somente fictícios"})
print(json.dumps(resultado, ensure_ascii=False, indent=2))
(raiz / "pdf-verificacao.json").write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")
