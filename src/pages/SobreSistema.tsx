import type { ClinicaAtiva } from '../hooks/useClinicaAtiva'
import { CREDITOS_SOFTWARE, dadosDaClinicaAtiva } from '../config/instituicao'
import { NOTAS_NAO_LANCADAS, VERSAO_EM_DESENVOLVIMENTO, VERSOES_LANCADAS, type CategoriasNotas } from '../config/notasEvolucao'
import './sobre-sistema.css'

function ambienteAtual(): string {
  if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|::1)$/.test(window.location.hostname)) {
    return import.meta.env.DEV ? 'Desenvolvimento local' : 'Prévia local do build'
  }
  return import.meta.env.DEV ? 'Desenvolvimento' : 'Build de produção'
}

function Notas({ notas }: { notas: CategoriasNotas }) {
  const grupos = [
    ['Novidades', notas.novidades],
    ['Melhorias', notas.melhorias],
    ['Correções', notas.correcoes],
  ] as const
  const preenchidos = grupos.filter(([, itens]) => itens.length)
  if (!preenchidos.length) return <p className="sobre-muted">Ainda não há notas registradas para esta versão.</p>
  return <div className="sobre-notas">{preenchidos.map(([titulo, itens]) =>
    <section key={titulo}><h3>{titulo}</h3><ul>{itens.map(item => <li key={item}>{item}</li>)}</ul></section>)}</div>
}

export default function SobreSistema({ clinicaAtiva }: { clinicaAtiva: ClinicaAtiva | null }) {
  const build = __APP_BUILD_INFO__
  const dadosClinica = dadosDaClinicaAtiva(clinicaAtiva)
  const lancamentoAtual = VERSOES_LANCADAS.find(item => item.versao === build.version)
  const emDesenvolvimento = !lancamentoAtual && build.version === VERSAO_EM_DESENVOLVIMENTO

  return <div className="sobre-pagina">
    <header className="sobre-intro">
      <div><h1>Sobre o sistema</h1><p>Informações sobre a versão em uso, a clínica selecionada e o desenvolvimento da plataforma.</p></div>
      {emDesenvolvimento && <span className="sobre-versao">Em desenvolvimento</span>}
    </header>

    <section className="sobre-destaque" aria-label="Versão em execução">
      <div className="sobre-marca" aria-hidden="true">P</div>
      <div className="sobre-destaque-texto"><h2>Clínica Patrícia</h2><p>Agenda, pacientes, prontuários e gestão clínica no contexto da unidade selecionada.</p></div>
      <dl><div><dt>Versão em execução</dt><dd>{build.version}</dd></div><div><dt>Ambiente</dt><dd>{ambienteAtual()}</dd></div></dl>
    </section>

    <div className="sobre-colunas">
      <section className="sobre-secao" aria-labelledby="sobre-instituicao"><h2 id="sobre-instituicao">Instituição</h2>
        <p className="sobre-muted">Clínica selecionada nesta sessão</p>
        <p className="sobre-clinica">{clinicaAtiva?.nome ?? 'Nenhuma clínica selecionada'}</p>
        {dadosClinica?.proprietarioOuResponsavel && <p>Responsável: {dadosClinica.proprietarioOuResponsavel}</p>}
        {dadosClinica?.contatoInstitucional && <p>Contato: {dadosClinica.contatoInstitucional}</p>}
      </section>
      <section className="sobre-secao sobre-desenvolvimento" aria-labelledby="sobre-desenvolvimento"><h2 id="sobre-desenvolvimento">Desenvolvimento e contato</h2>
        <div className="sobre-logo-superficie"><img src={CREDITOS_SOFTWARE.logo} alt="Vencer Digital — Sistemas • Sites • Soluções com IA" /></div>
        <p className="sobre-desenvolvido">Desenvolvido por {CREDITOS_SOFTWARE.desenvolvimento}</p>
        <p className="sobre-empresa">{CREDITOS_SOFTWARE.empresa}</p>
        <div className="sobre-canais">
          <a href={CREDITOS_SOFTWARE.whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label={`Conversar pelo WhatsApp — ${CREDITOS_SOFTWARE.whatsapp}`}>Conversar pelo WhatsApp</a>
          <a href={CREDITOS_SOFTWARE.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label={`Instagram — ${CREDITOS_SOFTWARE.instagram}`}>Instagram</a>
        </div>
      </section>
    </div>

    <section className="sobre-secao" aria-labelledby="sobre-novidades"><div className="sobre-titulo-linha"><h2 id="sobre-novidades">Evolução da versão</h2><span>{emDesenvolvimento ? 'Melhorias em desenvolvimento' : `v${build.version}`}</span></div>
      {emDesenvolvimento ? <Notas notas={NOTAS_NAO_LANCADAS} /> : lancamentoAtual ? <Notas notas={lancamentoAtual.notas} /> : <p className="sobre-muted">Não há notas vinculadas à versão em execução.</p>}
    </section>

    <section className="sobre-secao" aria-labelledby="sobre-historico"><h2 id="sobre-historico">Histórico de versões publicadas</h2>
      {VERSOES_LANCADAS.length ? <ol className="sobre-historico">{VERSOES_LANCADAS.map(versao => <li key={versao.versao}><details><summary><strong>Versão {versao.versao}</strong><span>{versao.lancadaEm ? new Date(`${versao.lancadaEm}T12:00:00`).toLocaleDateString('pt-BR') : 'Data não confirmada'}</span></summary><p>{versao.resumo}</p><Notas notas={versao.notas} /></details></li>)}</ol>
        : <p className="sobre-muted">O histórico será atualizado a partir do primeiro lançamento.</p>}
    </section>

    <details className="sobre-tecnologia"><summary>Tecnologia e informações técnicas</summary><div><p>Interface em React, TypeScript e Vite; estilos com Tailwind CSS. Serviços de autenticação e dados usam Supabase.</p><dl><div><dt>Commit de origem</dt><dd>{build.commit ?? 'Indisponível sem Git'}</dd></div><div><dt>Alterações locais na compilação</dt><dd>{build.alteracoesLocais === null ? 'Não foi possível verificar' : build.alteracoesLocais ? 'Sim — o commit não identifica sozinho todo o código' : 'Não detectadas'}</dd></div><div><dt>Compilado em</dt><dd>{new Date(build.compiladoEm).toLocaleString('pt-BR')}</dd></div></dl></div></details>
  </div>
}
