import type { ReactNode } from 'react'
import { objeto, type FichaCompleta } from '../../lib/equipeFicha'
import { mascararCpfEquipe, rotuloTipoEquipe, type ClinicaEquipe, type DetalheMembroEquipe } from '../../lib/equipe'
import type { AcessoEquipe } from '../../lib/equipeAcessos'
import { Selo } from './EquipeSelos'
import { formatarData, naUnidade, rotuloOpcao, secaoDaPendencia, seloPessoa, textoPendencia, type ResumoAtuacao, type ResumoRecebimento } from '../../lib/equipeApresentacao'
import { AcaoCartao, Campo, Cartao, Esqueleto, GradeCampos, NotaInfo } from './EquipeFichaUI'

// Visão geral e Dados pessoais da ficha. Só apresentação dos dados que a ficha já recebe.

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function Abrir({ rotulo, onClick }: { rotulo: string; onClick: () => void }) {
  return <button type="button" className="equipe-link" aria-label={`Abrir ${rotulo.toLocaleLowerCase('pt-BR')}`} onClick={onClick}>Abrir</button>
}

export function VisaoGeral({ detalhe, clinicaId, clinicaNome, ficha, carregando, autenticada, desabilitarConsulta, pendencias, rotulos, recebimentoSituacao, resumoAtuacao, resumoRecebimento, acesso, saude, navegar, onTentarNovamente }: {
  detalhe: DetalheMembroEquipe
  clinicaId: string
  clinicaNome: string
  ficha: FichaCompleta | null
  carregando: boolean
  autenticada: boolean
  desabilitarConsulta: boolean
  pendencias: string[]
  rotulos: Record<string, string>
  recebimentoSituacao: 'configurado' | 'ausente' | 'indisponivel'
  resumoAtuacao: ResumoAtuacao | null
  resumoRecebimento: ResumoRecebimento | null
  acesso: AcessoEquipe | null | undefined
  saude: boolean
  navegar: (id: string) => void
  onTentarNovamente: () => void
}) {
  const vigente = ficha?.registros.find(r => r.tipo === 'contrato' && r.dados.situacao === 'vigente')
  const seloAcesso = seloPessoa(detalhe, acesso, clinicaId)
  return <div className="equipe-visao">
    <Cartao titulo="O que falta neste cadastro" testId="ficha-pendencias" className="equipe-visao-pendencias">
      {carregando ? <Esqueleto rotulo="Consultando pendências" linhas={2} />
        : ficha ? pendencias.length ? <ul className="equipe-ficha-pendencias">{pendencias.map((p, i) => {
          const origem = secaoDaPendencia(p)
          return <li key={i}>
            <span className="equipe-pendencia-ponto" aria-hidden="true" />
            <div className="equipe-pendencia-texto"><p className="equipe-pendencia-titulo">{textoPendencia(p)}</p><p className="equipe-pendencia-origem">{rotulos[origem] ?? 'Ficha'}</p></div>
            <button type="button" className="equipe-link" onClick={() => navegar(origem)}>Conferir<span className="sr-only">: {p}</span></button>
          </li>
        })}</ul>
          : <p className="equipe-estado-em-dia"><Selo tom="ativo">Cadastro em dia</Selo><span>Nenhuma pendência nos dados confirmados desta consulta.</span></p>
          : <div className="equipe-estado-erro"><p>Pendências não consultadas. Falha de leitura não confirma ausência.</p><button type="button" className="equipe-botao-secundario" disabled={desabilitarConsulta || !autenticada} onClick={onTentarNovamente}>Tentar novamente</button></div>}
      {saude && recebimentoSituacao === 'indisponivel' && <p className="equipe-texto-discreto">Recebimento não consultado: configuração não confirmada nesta clínica.</p>}
      <NotaInfo>Vencimentos próximos consideram 30 dias; pendências não alteram acesso, atuação profissional ou situação contratual.</NotaInfo>
    </Cartao>
    <div className="equipe-visao-resumos">
      <Cartao titulo="Contrato vigente" testId="ficha-resumo-contrato" acao={<Abrir rotulo="Contratos e jornada" onClick={() => navegar('contratos')} />}>
        {carregando ? <Esqueleto rotulo="Consultando contratos" linhas={2} />
          : !ficha ? <p className="equipe-texto-discreto">Contratos não consultados.</p>
            : vigente ? <GradeCampos>
              <Campo rotulo="Vínculo" valor={rotuloOpcao('contrato', 'vinculo', vigente.dados.vinculo)} />
              <Campo rotulo="Início" valor={formatarData(vigente.dados.admissao)} />
              {/* horas_semanais é validado de 0 a 168 e rotulado "Carga horária semanal": unidade em horas. */}
              <Campo rotulo="Carga semanal" valor={String(vigente.dados.horas_semanais ?? '').trim() ? `${String(vigente.dados.horas_semanais)} h` : ''} />
              <Campo rotulo="Cargo" valor={String(vigente.dados.cargo ?? '')} />
            </GradeCampos>
              : <p className="equipe-texto-discreto">Nenhum contrato vigente nesta consulta.</p>}
      </Cartao>
      {saude && <Cartao titulo={`Atendimento ${naUnidade(clinicaNome)}`} testId="ficha-resumo-atendimento" acao={<Abrir rotulo="Atuação e atendimentos" onClick={() => navegar('atuacao')} />}>
        {resumoAtuacao ? <GradeCampos>
          <Campo rotulo="Duração" valor={`${resumoAtuacao.duracao_minutos} min`} />
          <Campo rotulo="Preço nesta clínica" valor={resumoAtuacao.valor_consulta === null ? '' : moeda(resumoAtuacao.valor_consulta)} />
          <Campo rotulo="Participação da clínica" valor={resumoAtuacao.percentual_clinica === null ? 'Regra vigente não configurada' : `${resumoAtuacao.percentual_clinica}%`} />
        </GradeCampos> : <p className="equipe-texto-discreto">Consulte a atuação para ver duração, preço e participação.</p>}
      </Cartao>}
      <Cartao titulo="Acesso ao sistema" testId="ficha-resumo-acesso" acao={<Abrir rotulo="Acesso ao sistema" onClick={() => navegar('acessos')} />}>
        <p className="equipe-resumo-selo"><Selo tom={seloAcesso.tom}>{seloAcesso.texto}</Selo><span>{naUnidade(clinicaNome)}</span></p>
      </Cartao>
      {saude && <Cartao titulo="Recebimento" testId="ficha-resumo-recebimento" acao={<Abrir rotulo="Recebimento" onClick={() => navegar('recebimento')} />}>
        {resumoRecebimento ? <GradeCampos>
          <Campo rotulo="Preferência" valor={resumoRecebimento.preferencia === 'pix' ? 'PIX' : 'Transferência'} />
          <Campo rotulo="Favorecido" valor={resumoRecebimento.favorecido} />
        </GradeCampos> : recebimentoSituacao === 'ausente' ? <p className="equipe-texto-discreto">Não configurado nesta clínica.</p>
          : <p className="equipe-texto-discreto">Consulte a seção para ver a configuração.</p>}
      </Cartao>}
    </div>
  </div>
}

/** Cartões separados por formulário: cadastro básico (Identificação, Contato, Dados profissionais) e dados complementares. */
export function DadosPessoaisCartoes({ detalhe, clinicaId, clinicas, ficha, carregando, podeEditarCadastro, desabilitarEdicao, onEditarCadastro, editorComplementar, onEditarComplementar }: {
  detalhe: DetalheMembroEquipe
  clinicaId: string
  clinicas: ClinicaEquipe[]
  ficha: FichaCompleta | null
  carregando: boolean
  podeEditarCadastro: boolean
  desabilitarEdicao: boolean
  onEditarCadastro?: () => void
  editorComplementar: ReactNode
  onEditarComplementar?: () => void
}) {
  const profissional = detalhe.tipo === 'profissional_saude'
  const acaoBasica = (valores: unknown[], assunto: string) => podeEditarCadastro && onEditarCadastro
    ? <AcaoCartao valores={valores} assunto={assunto} onClick={onEditarCadastro} desabilitado={desabilitarEdicao} /> : undefined
  const cpf = detalhe.cpf_situacao === 'ausente' ? '' : mascararCpfEquipe(detalhe.cpf, detalhe.cpf_situacao)
  // Dados complementares só existem para quem administra todos os vínculos (pode_global).
  const complementares = ficha?.pode_global ? ficha.registros.find(r => r.tipo === 'pessoal')?.dados ?? {} : null
  const endereco = complementares ? Object.values(objeto(complementares.endereco)).filter(Boolean).join(', ') : ''
  const emergencia = complementares ? Object.values(objeto(complementares.emergencia)).filter(Boolean).join(' · ') : ''
  const documento = complementares && complementares.documento_tipo ? `${rotuloOpcao('pessoal', 'documento_tipo', complementares.documento_tipo)}${complementares.documento_numero ? ' · número protegido, disponível na edição autorizada' : ''}` : ''
  const nomeSocial = complementares ? String(complementares.nome_social ?? '') : ''
  const nascimento = complementares ? formatarData(complementares.nascimento) : ''
  // Escolaridade é texto livre no formulário: mostrada como foi informada.
  const escolaridade = complementares ? String(complementares.escolaridade ?? '') : ''
  return <div className="equipe-pessoal-cartoes">
    <Cartao titulo="Identificação" testId="ficha-secao-identificacao" acao={acaoBasica([detalhe.cargo, cpf], 'identificação')}>
      <GradeCampos colunas={3}>
        <Campo rotulo="Nome completo" valor={detalhe.nome_completo} />
        <Campo rotulo="Cargo ou função" valor={detalhe.cargo} />
        <Campo rotulo="Tipo de membro" valor={rotuloTipoEquipe(detalhe.tipo)} />
        <Campo rotulo="Situação cadastral" valor="Pessoa cadastrada" />
        <Campo rotulo="CPF" valor={cpf} />
      </GradeCampos>
    </Cartao>
    <Cartao titulo="Contato" testId="ficha-secao-contato" acao={acaoBasica([detalhe.telefone, detalhe.email_contato], 'contato')}>
      <GradeCampos>
        <Campo rotulo="Tel./WhatsApp" valor={detalhe.telefone ?? ''} />
        <Campo rotulo="E-mail de contato" valor={detalhe.email_contato ?? ''} />
      </GradeCampos>
      <NotaInfo>O e-mail de contato é apenas cadastral; não comprova a existência de login.</NotaInfo>
    </Cartao>
    <Cartao titulo="Dados profissionais" testId="ficha-secao-profissional" acao={profissional ? acaoBasica([detalhe.profissao, detalhe.especialidade_nome, detalhe.conselho_classe, detalhe.registro_conselho, detalhe.conselho_uf], 'dados profissionais') : undefined}>
      {profissional ? <GradeCampos>
        <Campo rotulo="Profissão" valor={detalhe.profissao ?? ''} />
        <Campo rotulo="Especialidade" valor={detalhe.especialidade_nome ?? ''} />
        <Campo rotulo="Conselho" valor={detalhe.conselho_classe ?? ''} />
        <Campo rotulo="Registro profissional" valor={detalhe.registro_conselho ?? ''} />
        <Campo rotulo="UF do conselho" valor={detalhe.conselho_uf ?? ''} />
      </GradeCampos> : <p className="equipe-texto-discreto">Dados de conselho, registro, UF e especialidade não se aplicam a esta função.</p>}
    </Cartao>
    <Cartao titulo="Dados complementares" testId="ficha-secao-complementares" className="equipe-cartao-complementares"
      acao={complementares && onEditarComplementar ? <AcaoCartao valores={[nomeSocial, nascimento, documento, escolaridade, endereco, emergencia]} assunto="dados complementares" onClick={onEditarComplementar} desabilitado={desabilitarEdicao} /> : undefined}>
      {carregando && !ficha ? <Esqueleto rotulo="Consultando dados complementares" linhas={2} />
        : complementares ? <GradeCampos colunas={3}>
          <Campo rotulo="Nome social" valor={nomeSocial} />
          <Campo rotulo="Nascimento" valor={nascimento} />
          <Campo rotulo="Identificação documental" valor={documento} />
          <Campo rotulo="Escolaridade" valor={escolaridade} />
          <Campo rotulo="Endereço" valor={endereco} amplo />
          <Campo rotulo="Contato de emergência" valor={emergencia} amplo />
        </GradeCampos> : !ficha ? <p className="equipe-texto-discreto">Dados complementares não consultados.</p> : null}
      {editorComplementar}
    </Cartao>
    <Cartao titulo="Clínicas" testId="ficha-secao-clinicas">
      {detalhe.clinicas.length ? <ul className="equipe-ficha-vinculos">{detalhe.clinicas.map(c => <li key={c.id}><strong>{clinicas.find(x => x.id === c.id)?.nome ?? c.nome}</strong><span>{c.id === clinicaId ? 'Clínica selecionada' : 'Vínculo cadastral'}</span></li>)}</ul>
        : <p className="equipe-texto-discreto">Nenhum vínculo clínico foi informado nesta consulta.</p>}
      <NotaInfo>O vínculo informa onde a pessoa atua. O acesso ao sistema é conferido separadamente.</NotaInfo>
    </Cartao>
  </div>
}
