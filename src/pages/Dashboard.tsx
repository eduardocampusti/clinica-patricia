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

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function Dashboard() {
  const saldo = ENTRADAS_PLACEHOLDER - SAIDAS_PLACEHOLDER
  const maiorValor = Math.max(ENTRADAS_PLACEHOLDER, SAIDAS_PLACEHOLDER)
  const entradasPct = Math.round((ENTRADAS_PLACEHOLDER / maiorValor) * 100)
  const saidasPct = Math.round((SAIDAS_PLACEHOLDER / maiorValor) * 100)

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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="texto-saudacao text-[var(--texto-titulo)]">Olá!</h1>
          <p className="mt-1.5 text-sm text-[var(--texto-secundario)]">
            {dataFormatada} · Painel do dia
          </p>
        </div>
        <div className="rounded-[10px] border border-[var(--borda)] bg-[var(--fundo-card)] px-4 py-2.5 text-sm font-medium text-[var(--texto-principal)]">
          {ATENDIMENTOS_PLACEHOLDER.length} atendimentos hoje
        </div>
      </header>

      <section className="flex flex-wrap items-center gap-10 rounded-2xl border border-[var(--borda)] bg-[var(--fundo-card)] p-7 shadow-[0px_1px_8px_rgba(0,0,0,0.1)]">
        <div>
          <div className="mb-1.5 text-sm font-medium text-[var(--texto-secundario)]">
            Fluxo de caixa do dia
          </div>
          <div
            className="text-[42px] leading-none font-bold tracking-tight"
            style={{ color: saldo >= 0 ? 'var(--cor-sucesso)' : 'var(--cor-erro)' }}
          >
            {formatarMoeda(saldo)}
          </div>
          <div className="mt-2 text-sm text-[var(--texto-secundario)]">Saldo líquido de hoje</div>
        </div>

        <div className="hidden self-stretch w-px bg-[var(--borda)] sm:block" />

        <div className="flex flex-1 flex-wrap gap-8" style={{ minWidth: 280 }}>
          <div className="flex-1" style={{ minWidth: 150 }}>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-[var(--cor-sucesso-suave)] text-sm font-bold text-[var(--cor-sucesso)]">
                ↑
              </span>
              <span className="text-sm font-medium text-[var(--texto-secundario)]">Entradas</span>
            </div>
            <div className="text-xl font-bold text-[var(--texto-principal)]">
              {formatarMoeda(ENTRADAS_PLACEHOLDER)}
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--fundo-pagina)]">
              <div
                className="h-full rounded-full bg-[var(--cor-sucesso)]"
                style={{ width: `${entradasPct}%` }}
              />
            </div>
          </div>

          <div className="flex-1" style={{ minWidth: 150 }}>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-[var(--cor-erro-suave)] text-sm font-bold text-[var(--cor-erro)]">
                ↓
              </span>
              <span className="text-sm font-medium text-[var(--texto-secundario)]">Saídas</span>
            </div>
            <div className="text-xl font-bold text-[var(--texto-principal)]">
              {formatarMoeda(SAIDAS_PLACEHOLDER)}
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--fundo-pagina)]">
              <div
                className="h-full rounded-full bg-[var(--cor-erro)]"
                style={{ width: `${saidasPct}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.7fr_1fr]">
        <section className="rounded-2xl border border-[var(--borda)] bg-[var(--fundo-card)] p-6 shadow-[0px_1px_8px_rgba(0,0,0,0.1)]">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xl font-normal text-[var(--texto-titulo)]">Atendimentos de hoje</h2>
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
                  <div className="w-14 flex-none text-right text-sm font-medium text-[var(--texto-principal)]">
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

        <section className="flex flex-col gap-4 rounded-2xl border border-[var(--borda)] bg-[var(--fundo-card)] p-6 shadow-[0px_1px_8px_rgba(0,0,0,0.1)]">
          <h2 className="text-xl font-normal text-[var(--texto-titulo)]">Resumo por especialidade</h2>

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
                <span className="text-sm font-semibold text-[var(--texto-secundario)]">
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
    </div>
  )
}

export default Dashboard
