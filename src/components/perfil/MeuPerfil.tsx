import { useEffect, useRef, useState } from 'react'
import type { IdentidadeConta } from '../../hooks/useIdentidadeConta'
import { iniciaisConta, nomeCadastrado } from '../../lib/identidadeApresentacao'
import { ErroSalvarPerfil, salvarMeuPerfil, validarFotoPessoal } from '../../lib/meuPerfil'
import { ModalBase } from '../ModalBase'
import { FeedbackAlert } from '../feedback/FeedbackAlert'
import { ConfirmacaoDialog } from '../feedback/ConfirmacaoDialog'

const botao = 'min-h-11 rounded-lg border border-[var(--borda)] px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[var(--cor-primaria)] disabled:opacity-50'
export function MeuPerfil({ identidade, conta, papel, clinica, onFechar }: { identidade: IdentidadeConta; conta: string; papel: string; clinica: string; onFechar: () => void }) {
  const [nome, setNome] = useState(identidade.nome ?? '')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [previa, setPrevia] = useState<string>()
  const [remover, setRemover] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [validando, setValidando] = useState(false)
  const [erro, setErro] = useState<string>()
  const [sucesso, setSucesso] = useState(false)
  const [exigeConferencia, setExigeConferencia] = useState(false)
  const [confirmacao, setConfirmacao] = useState<'descartar' | 'foto' | null>(null)
  const controlador = useRef<AbortController | null>(null)
  const selecao = useRef(0)
  const montado = useRef(true)
  const input = useRef<HTMLInputElement>(null)
  const alterado = nomeCadastrado(nome) !== identidade.nome || !!arquivo || remover
  const podeSalvar = identidade.estadoPerfil === 'disponivel' && !!identidade.perfil && !identidade.erroNome && !identidade.erroFoto && !exigeConferencia
  useEffect(() => {
    // Keep the resource containers, not a snapshot of their mutable operations.
    const recursos = { montado, selecao, controlador }
    recursos.montado.current = true
    // These refs hold asynchronous resources, not rendered DOM nodes.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    return () => { recursos.montado.current = false; recursos.selecao.current++; recursos.controlador.current?.abort() }
  }, [])
  useEffect(() => () => { if (previa) URL.revokeObjectURL(previa) }, [previa])
  // A persistent reconsultation may finish after the modal was opened.
  useEffect(() => { if (!identidade.carregando) setNome(identidade.nome ?? '') }, [identidade.nome, identidade.carregando])
  async function selecionar(foto?: File) {
    if (!foto) return
    const rodada = ++selecao.current
    setValidando(true); setErro(undefined); setSucesso(false)
    try {
      await validarFotoPessoal(foto)
      if (!montado.current || rodada !== selecao.current) return
      setPrevia(URL.createObjectURL(foto)); setArquivo(foto); setRemover(false)
    } catch (e) { if (montado.current && rodada === selecao.current) setErro(e instanceof Error ? e.message : 'A imagem não pôde ser lida.') }
    finally { if (montado.current && rodada === selecao.current) setValidando(false) }
  }
  const fechar = () => { if (ocupado || validando) return; if (alterado) setConfirmacao('descartar'); else onFechar() }
  async function salvar() {
    if (!podeSalvar || !identidade.perfil || ocupado || validando) return
    setOcupado(true); setErro(undefined); setSucesso(false)
    const abort = new AbortController(); controlador.current = abort
    try {
      await salvarMeuPerfil(identidade.perfil, nome, arquivo, remover, abort.signal)
      if (!montado.current || abort.signal.aborted) return
      setArquivo(null); setPrevia(undefined); setRemover(false); setSucesso(true)
      identidade.reconsultar?.()
    } catch (e) {
      if (montado.current && !abort.signal.aborted) {
        setErro(e instanceof Error ? e.message : 'O salvamento não foi confirmado.')
        if (e instanceof ErroSalvarPerfil && e.exigeConferencia) setExigeConferencia(true)
      }
    }
    finally { if (montado.current) setOcupado(false) }
  }
  const url = remover ? undefined : previa ?? identidade.fotoUrl
  return <ModalBase titulo="Meu perfil" subtitulo="Nome e foto da sua conta" largura="lg" onFechar={fechar} ocupado={ocupado || validando}>
    <form onSubmit={e => { e.preventDefault(); void salvar() }} className="space-y-5">
      {identidade.estadoPerfil === 'carregando' && <p role="status" className="text-sm">Consultando seu perfil…</p>}
      {identidade.estadoPerfil === 'ausente' && <FeedbackAlert variant="warning" title="Salvamento ainda indisponível" description="O serviço de perfil pessoal precisa ser habilitado. Você pode preparar o nome e a foto, mas as alterações não serão salvas. A prévia aparece somente nesta janela." />}
      {identidade.estadoPerfil === 'erro' && <FeedbackAlert variant="destructive" title="Serviço de perfil indisponível" description="Não foi possível consultar seu perfil. Nenhuma alteração foi salva." action={<button type="button" className={botao} onClick={() => identidade.reconsultar?.()}>Tentar novamente</button>} />}
      {identidade.erroFoto && identidade.estadoPerfil === 'disponivel' && <FeedbackAlert variant="destructive" title="Foto indisponível" description="Reabra o perfil para consultar sua foto antes de editar." />}
      {identidade.erroNome && <FeedbackAlert variant="destructive" title="Nome indisponível" description="Não foi possível consultar o nome anterior. Reabra o perfil antes de editar." />}
      <div>
        <label htmlFor="meu-perfil-nome" className="mb-2 block text-sm font-semibold">Nome de exibição</label>
        <input id="meu-perfil-nome" value={nome} onChange={e => { setNome(e.target.value); setSucesso(false) }} maxLength={120} autoComplete="name" disabled={ocupado || identidade.carregando || identidade.estadoPerfil === 'carregando' || identidade.erroNome} className="min-h-11 w-full min-w-0 rounded-lg border border-[var(--borda)] bg-[var(--fundo-pagina)] px-3 text-sm focus-visible:outline-2 focus-visible:outline-[var(--cor-primaria)]" aria-describedby="meu-perfil-nome-ajuda" />
        <p id="meu-perfil-nome-ajuda" className="mt-2 text-xs text-[var(--texto-secundario)]">Use o nome pelo qual deseja ser identificado. Sua grafia será preservada.</p>
      </div>
      <fieldset disabled={ocupado || validando || identidade.estadoPerfil === 'carregando'}>
        <legend className="mb-3 text-sm font-semibold">Foto pessoal</legend>
        <div className="flex flex-wrap items-center gap-4">
          <div role="img" aria-label="Prévia da foto pessoal" className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--cor-primaria-suave)] text-xl font-semibold">
            {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : iniciaisConta(nomeCadastrado(nome))}
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            <button type="button" className={botao} onClick={() => input.current?.click()}>{url ? 'Substituir foto' : 'Selecionar foto'}</button>
            {url && <button type="button" className={botao} onClick={() => setConfirmacao('foto')}>Remover foto</button>}
          </div>
        </div>
        <input ref={input} aria-label="Arquivo da foto pessoal" type="file" accept="image/jpeg,image/png" className="sr-only" tabIndex={-1} onChange={e => { void selecionar(e.target.files?.[0]); e.target.value = '' }} />
        <p className="mt-3 text-xs leading-relaxed text-[var(--texto-secundario)]">JPEG ou PNG, até 5 MB. De 32 a 4096 px, até 8 megapixels. A foto pessoal é independente da foto profissional da Equipe.</p>
        {arquivo && <p role="status" className="mt-2 text-xs">Nova foto em prévia. Ainda não foi salva.</p>}
        {remover && <p role="status" className="mt-2 text-xs">A remoção será confirmada ao salvar.</p>}
      </fieldset>
      <dl className="space-y-3 rounded-lg bg-[var(--fundo-pagina)] p-4 text-sm">
        <div><dt className="text-xs text-[var(--texto-secundario)]">Conta conectada · somente consulta</dt><dd className="mt-1 break-words [overflow-wrap:anywhere]">{conta}</dd></div>
        <div><dt className="text-xs text-[var(--texto-secundario)]">Clínica ativa</dt><dd className="mt-1 break-words">{clinica}</dd></div>
        <div><dt className="text-xs text-[var(--texto-secundario)]">Papel nesta clínica · somente consulta</dt><dd className="mt-1">{papel}</dd></div>
      </dl>
      {erro && <FeedbackAlert variant="destructive" title="Alteração não confirmada" description={erro} />}
      {sucesso && <FeedbackAlert variant="success" title="Perfil salvo" description="Sua identificação foi salva no servidor." onClose={() => setSucesso(false)} />}
      <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--borda)] pt-4">
        <button type="button" className={botao} disabled={ocupado || validando} onClick={fechar}>{sucesso ? 'Fechar' : 'Cancelar'}</button>
        <button type="submit" className={`${botao} bg-[var(--cor-primaria)] text-[var(--texto-sobre-primaria)]`} disabled={!podeSalvar || !alterado || ocupado || validando}>{ocupado ? 'Salvando…' : 'Salvar perfil'}</button>
      </div>
    </form>
    <ConfirmacaoDialog open={!!confirmacao} onOpenChange={aberto => { if (!aberto) setConfirmacao(null) }} title={confirmacao === 'foto' ? 'Remover foto pessoal?' : 'Descartar alterações?'} description={confirmacao === 'foto' ? 'A prévia passará a usar iniciais. A foto atual será mantida no servidor até você salvar.' : 'O nome e a foto preparados nesta janela não serão salvos.'} confirmLabel={confirmacao === 'foto' ? 'Remover foto' : 'Descartar alterações'} tone="warning" onConfirm={() => {
      if (confirmacao === 'foto') { setArquivo(null); setPrevia(undefined); setRemover(true); setSucesso(false) }
      else onFechar()
      setConfirmacao(null)
    }} />
  </ModalBase>
}
