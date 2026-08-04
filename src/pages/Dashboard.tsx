import { iniciais } from '../lib/texto'

// ⚠️ PLACEHOLDER — dados fixos de exemplo, só para validar o layout do dashboard.
// Nada aqui vem do banco. Serão substituídos quando os módulos de Agenda e
// Financeiro existirem de verdade.

type StatusAtendimento = 'confirmado' | 'aguardando' | 'em_atendimento' | 'concluido' | 'cancelado'

const STATUS_CONFIG: Record<
  StatusAtendimento,
  { label: string; bg: string; cor: string }
> = {
  confirmado: { label: 'Confirmado', bg: 'var(--cor-sucesso-suave)', cor: 'var(--cor-sucesso)' },
  aguardando: { label: 'Aguardando', bg: 'var(--cor-alerta-suave)', cor: 'var(--cor-alerta)' },
  em_atendimento: {
    label: 'Em atendimento',
    bg: 'var(--cor-primaria-suave)',
    cor: 'var(--cor-primaria)',
  },
  concluido: { label: 'Concluído', bg: 'var(--fundo-pagina)', cor: 'var(--texto-secundario)' },
  cancelado: { label: 'Cancelado', bg: 'var(--cor-erro-suave)', cor: 'var(--cor-erro)' },
}

const ATENDIMENTOS_PLACEHOLDER: {
  paciente: string
  especialidade: string
  horario: string
  status: StatusAtendimento
}[] = [
  { paciente: 'Marcos Vinícius Souza', especialidade: 'Clínica Geral', horario: '08:30', status: 'concluido' },
  { paciente: 'Ana Beatriz Farias', especialidade: 'Psicologia', horario: '09:15', status: 'concluido' },
  { paciente: 'João Pedro Almeida', especialidade: 'Pediatria', horario: '10:00', status: 'em_atendimento' },
  { paciente: 'Rita de Cássia Nunes', especialidade: 'Cardiologia', horario: '10:45', status: 'confirmado' },
  { paciente: 'Felipe Cordeiro', especialidade: 'Dermatologia', horario: '11:30', status: 'confirmado' },
  { paciente: 'Luciana Mendes', especialidade: 'Psicologia', horario: '14:00', status: 'aguardando' },
  { paciente: 'Heitor Barbosa', especialidade: 'Clínica Geral', horario: '15:20', status: 'cancelado' },
]

const ESPECIALIDADES_PLACEHOLDER: { nome: string; quantidade: number; cor: string }[] = [
  { nome: 'Clínica Geral', quantidade: 8, cor: 'var(--cor-categoria-1)' },
  { nome: 'Psicologia', quantidade: 6, cor: 'var(--cor-categoria-2)' },
  { nome: 'Pediatria', quantidade: 4, cor: 'var(--cor-categoria-3)' },
  { nome: 'Cardiologia', quantidade: 3, cor: 'var(--cor-categoria-4)' },
  { nome: 'Dermatologia', quantidade: 2, cor: 'var(--cor-categoria-5)' },
]

const ENTRADAS_PLACEHOLDER = 12480
const SAIDAS_PLACEHOLDER = 4120

// TODO: plugar no status real do caixa (módulo Financeiro/Abrir Caixa) e no
// nome de quem abriu, quando o Dashboard passar a ler dados de verdade.
const BRIEFING_PLACEHOLDER = 'Caixa aberto desde 08:14 · Recepção Ana Paula'

// TODO: substituir por soma real de entradas_caixa por profissional (join com
// profissionais.taxa_repasse_clinica de cada um, ver sessão do repasse
// profissional) quando o Dashboard passar a ler dado real.
// ATENÇÃO: taxa_repasse_clinica vem do banco como INTEIRO 0-100 (ex.: 20 =
// 20%), não como fração — por isso o placeholder abaixo também usa 20 (não
// 0.2) e a fórmula divide por 100. Usar o inteiro direto na conta faria o
// repasse sair 100x errado.
const REPASSE_PLACEHOLDER: { nome: string; especialidade: string; atendimentos: number; totalProduzido: number }[] = [
  { nome: 'Dra. Ana Ferreira', especialidade: 'Clínica Geral', atendimentos: 3, totalProduzido: 690 },
  { nome: 'Dra. Juliana Prado', especialidade: 'Psicologia', atendimentos: 2, totalProduzido: 400 },
  { nome: 'Dr. Marcos Lima', especialidade: 'Pediatria', atendimentos: 2, totalProduzido: 460 },
  { nome: 'Dr. Felipe Cordeiro', especialidade: 'Dermatologia', atendimentos: 1, totalProduzido: 220 },
]
const TAXA_REPASSE_CLINICA_PLACEHOLDER = 20 // inteiro 0-100, mesmo formato de profissionais.taxa_repasse_clinica

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function Dashboard() {
  const saldo = ENTRADAS_PLACEHOLDER - SAIDAS_PLACEHOLDER

  const maiorEspecialidade = Math.max(...ESPECIALIDADES_PLACEHOLDER.map((e) => e.quantidade))

  const hoje = new Date()
  const dataFormatadaBruta = hoje.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
  const dataFormatada = dataFormatadaBruta.charAt(0).toUpperCase() + dataFormatadaBruta.slice(1)

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="texto-titulo-tela text-[var(--texto-principal)]">Olá!</h1>
        <p className="mt-1.5 text-sm text-[var(--texto-secundario)]">{dataFormatada} · Painel do dia</p>
      </header>

      <section
        className="flex items-center gap-3 rounded-[18px] bg-[var(--fundo-card)] px-5 py-4"
        style={{ boxShadow: 'var(--sombra-neutra)' }}
      >
        <span className="h-2 w-2 flex-none rounded-full bg-[var(--cor-sucesso)]" />
        <p className="text-sm font-medium text-[var(--texto-principal)]">{BRIEFING_PLACEHOLDER}</p>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          className="rounded-[18px] bg-[var(--fundo-card)] p-5"
          style={{ boxShadow: 'var(--sombra-neutra)' }}
        >
          <div className="text-sm font-medium text-[var(--texto-secundario)]">Saldo do dia</div>
          <div
            className="numero-tabular mt-1.5 text-[28px] leading-none font-semibold"
            style={{ color: saldo >= 0 ? 'var(--cor-sucesso)' : 'var(--cor-erro)' }}
          >
            {formatarMoeda(saldo)}
          </div>
          <div className="mt-2 text-xs text-[var(--texto-terciario)]">Entradas menos saídas</div>
        </div>

        <div
          className="rounded-[18px] p-5"
          style={{ backgroundColor: 'var(--categoria-financeiro-fundo)', boxShadow: 'var(--categoria-financeiro-sombra)' }}
        >
          <div className="text-sm font-medium" style={{ color: 'var(--categoria-financeiro-label)' }}>
            ↑ Entradas
          </div>
          <div
            className="numero-tabular mt-1.5 text-[28px] leading-none font-semibold"
            style={{ color: 'var(--categoria-financeiro-valor)' }}
          >
            {formatarMoeda(ENTRADAS_PLACEHOLDER)}
          </div>
        </div>

        <div
          className="rounded-[18px] p-5"
          style={{ backgroundColor: 'var(--categoria-financeiro-fundo)', boxShadow: 'var(--categoria-financeiro-sombra)' }}
        >
          <div className="text-sm font-medium" style={{ color: 'var(--categoria-financeiro-label)' }}>
            ↓ Saídas
          </div>
          <div
            className="numero-tabular mt-1.5 text-[28px] leading-none font-semibold"
            style={{ color: 'var(--categoria-financeiro-valor)' }}
          >
            {formatarMoeda(SAIDAS_PLACEHOLDER)}
          </div>
        </div>

        <div
          className="rounded-[18px] p-5"
          style={{ backgroundColor: 'var(--categoria-agenda-fundo)', boxShadow: 'var(--categoria-agenda-sombra)' }}
        >
          <div className="text-sm font-medium" style={{ color: 'var(--categoria-agenda-label)' }}>
            Atendimentos hoje
          </div>
          <div
            className="numero-tabular mt-1.5 text-[28px] leading-none font-semibold"
            style={{ color: 'var(--categoria-agenda-valor)' }}
          >
            {ATENDIMENTOS_PLACEHOLDER.length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.7fr_1fr]">
        <section
          className="rounded-[18px] bg-[var(--fundo-card)] p-6"
          style={{ boxShadow: 'var(--sombra-neutra)' }}
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="texto-titulo-secao text-[var(--texto-principal)]">Atendimentos de hoje</h2>
            <span className="text-sm text-[var(--texto-secundario)]">
              {ATENDIMENTOS_PLACEHOLDER.length} no total
            </span>
          </div>

          <ul>
            {ATENDIMENTOS_PLACEHOLDER.map((a, indice) => {
              const status = STATUS_CONFIG[a.status]
              return (
                <li
                  key={`${a.paciente}-${a.horario}`}
                  className={`flex items-center gap-3.5 py-3 ${indice > 0 ? 'border-t border-[var(--borda)]' : ''}`}
                >
                  <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-[var(--cor-primaria-suave)] text-sm font-semibold text-[var(--cor-primaria)]">
                    {iniciais(a.paciente)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[var(--texto-principal)]">
                      {a.paciente}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--texto-secundario)]">
                      {a.especialidade}
                    </div>
                  </div>
                  <div className="numero-tabular w-14 flex-none text-right text-sm font-medium text-[var(--texto-principal)]">
                    {a.horario}
                  </div>
                  <div
                    className="flex-none rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
                    style={{ backgroundColor: status.bg, color: status.cor }}
                  >
                    {status.label}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section
          className="flex flex-col gap-4 rounded-[18px] bg-[var(--fundo-card)] p-6"
          style={{ boxShadow: 'var(--sombra-neutra)' }}
        >
          <h2 className="texto-titulo-secao text-[var(--texto-principal)]">Resumo por especialidade</h2>

          {ESPECIALIDADES_PLACEHOLDER.map((e) => (
            <div key={e.nome} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 flex-none rounded-full"
                    style={{ backgroundColor: e.cor }}
                  />
                  <span className="text-sm font-medium text-[var(--texto-principal)]">{e.nome}</span>
                </div>
                <span className="numero-tabular text-sm font-semibold text-[var(--texto-secundario)]">
                  {e.quantidade}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--fundo-pagina)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round((e.quantidade / maiorEspecialidade) * 100)}%`,
                    backgroundColor: e.cor,
                  }}
                />
              </div>
            </div>
          ))}
        </section>
      </div>

      <section
        className="rounded-[18px] p-6"
        style={{ backgroundColor: 'var(--categoria-repasse-fundo)', boxShadow: 'var(--categoria-repasse-sombra)' }}
      >
        <h2 className="texto-titulo-secao" style={{ color: 'var(--categoria-repasse-valor)' }}>
          Repasse do dia por profissional
        </h2>

        <ul className="mt-2">
          {REPASSE_PLACEHOLDER.map((p, indice) => {
            const valorRepassado = p.totalProduzido * (1 - TAXA_REPASSE_CLINICA_PLACEHOLDER / 100)
            return (
              <li
                key={p.nome}
                className={`flex items-center gap-3.5 py-3 ${indice > 0 ? 'border-t' : ''}`}
                style={{ borderColor: 'color-mix(in srgb, var(--categoria-repasse-label) 20%, transparent)' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold" style={{ color: 'var(--categoria-repasse-valor)' }}>
                    {p.nome}
                  </div>
                  <div className="mt-0.5 text-xs" style={{ color: 'var(--categoria-repasse-label)' }}>
                    {p.especialidade} · {p.atendimentos} atendimento{p.atendimentos > 1 ? 's' : ''}
                  </div>
                </div>
                <div
                  className="numero-tabular flex-none text-right text-sm font-semibold"
                  style={{ color: 'var(--categoria-repasse-valor)' }}
                >
                  {formatarMoeda(valorRepassado)}
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

export default Dashboard
