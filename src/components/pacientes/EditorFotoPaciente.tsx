import { useEffect, useRef, useState } from 'react'
import { obterIniciaisPaciente } from '../../lib/pacienteFormulario'
import { validarFotoPaciente } from '../../lib/pacienteFotoValidacao'

interface EditorFotoPacienteProps {
  nome: string
  imagemAtualUrl?: string | null
  disabled?: boolean
  ativo?: boolean
  onConfirmar: (arquivo: File) => void | Promise<void>
  onRemover: () => void | Promise<void>
}

function IconePessoa() {
  return (
    <svg className="paciente-avatar-neutro" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c.8-4.1 3.3-6.2 7.5-6.2s6.7 2.1 7.5 6.2" />
    </svg>
  )
}

export default function EditorFotoPaciente({
  nome,
  imagemAtualUrl = null,
  disabled = false,
  ativo = true,
  onConfirmar,
  onRemover,
}: EditorFotoPacienteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const ativoRef = useRef(ativo)
  const montadoRef = useRef(true)
  ativoRef.current = ativo
  const urlsCriadasRef = useRef(new Set<string>())
  const [arquivoPendente, setArquivoPendente] = useState<File | null>(null)
  const [previewPendente, setPreviewPendente] = useState<string | null>(null)
  const [previewConfirmada, setPreviewConfirmada] = useState<string | null>(null)
  const [cameraAberta, setCameraAberta] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const iniciais = obterIniciaisPaciente(nome)
  const preview = previewPendente || previewConfirmada || imagemAtualUrl

  function revogar(url: string | null) {
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url)
      urlsCriadasRef.current.delete(url)
    }
  }

  function desligarCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraAberta(false)
  }

  useEffect(() => {
    montadoRef.current = true
    const camera = streamRef
    const urls = urlsCriadasRef
    return () => {
      montadoRef.current = false
      camera.current?.getTracks().forEach((track) => track.stop())
      urls.current.forEach((url) => URL.revokeObjectURL(url))
      urls.current.clear()
    }
  }, [])

  useEffect(() => {
    if (!ativo) desligarCamera()
  }, [ativo])

  function prepararArquivo(arquivo: File) {
    try {
      validarFotoPaciente(arquivo)
      setErro(null)
      revogar(previewPendente)
      setArquivoPendente(arquivo)
      const url = URL.createObjectURL(arquivo)
      urlsCriadasRef.current.add(url)
      setPreviewPendente(url)
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : 'Não foi possível usar esta imagem.')
    }
  }

  async function abrirCamera() {
    setErro(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setErro('A câmera não está disponível neste navegador ou dispositivo.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user' },
      })
      if (!ativoRef.current || !montadoRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      setCameraAberta(true)
      requestAnimationFrame(() => {
        if (!videoRef.current) return
        videoRef.current.srcObject = stream
        void videoRef.current.play()
      })
    } catch {
      desligarCamera()
      setErro('Não foi possível abrir a câmera. Confira a permissão do navegador.')
    }
  }

  function capturarFoto() {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) {
      setErro('A câmera ainda não está pronta para capturar a foto.')
      return
    }
    const limite = 1280
    const escala = Math.min(1, limite / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * escala)
    canvas.height = Math.round(video.videoHeight * escala)
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) {
        setErro('Não foi possível capturar a imagem da câmera.')
        return
      }
      prepararArquivo(new File([blob], `foto-${crypto.randomUUID()}.jpg`, { type: 'image/jpeg' }))
      desligarCamera()
    }, 'image/jpeg', 0.9)
  }

  async function confirmar() {
    if (!arquivoPendente || !previewPendente) return
    setProcessando(true)
    setErro(null)
    try {
      await onConfirmar(arquivoPendente)
      revogar(previewConfirmada)
      setPreviewConfirmada(previewPendente)
      setPreviewPendente(null)
      setArquivoPendente(null)
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : 'Não foi possível confirmar a foto.')
    } finally {
      setProcessando(false)
    }
  }

  async function remover() {
    setProcessando(true)
    setErro(null)
    try {
      await onRemover()
      revogar(previewPendente)
      revogar(previewConfirmada)
      setPreviewPendente(null)
      setPreviewConfirmada(null)
      setArquivoPendente(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : 'Não foi possível remover a foto.')
    } finally {
      setProcessando(false)
    }
  }

  return (
    <div className="paciente-foto-reserva">
      <div className="paciente-avatar" aria-label={preview ? 'Prévia da foto do paciente' : 'Avatar sem foto'}>
        {preview ? <img src={preview} alt="Prévia da foto do paciente" /> : (iniciais || <IconePessoa />)}
      </div>
      <strong>Foto do paciente <span>(opcional)</span></strong>
      <p>JPG, PNG ou WebP, até 5 MB. A ausência não bloqueia o cadastro.</p>

      {cameraAberta ? (
        <div className="paciente-camera">
          <video ref={videoRef} muted playsInline aria-label="Prévia da webcam" />
          <div className="paciente-foto-acoes">
            <button type="button" onClick={capturarFoto} disabled={disabled || processando}>Capturar foto</button>
            <button type="button" onClick={desligarCamera} disabled={processando}>Cancelar câmera</button>
          </div>
        </div>
      ) : (
        <div className="paciente-foto-acoes">
          <input
            ref={inputRef}
            className="paciente-arquivo-oculto"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(evento) => {
              const arquivo = evento.currentTarget.files?.[0]
              if (arquivo) prepararArquivo(arquivo)
            }}
            disabled={disabled || processando}
          />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || processando}>
            {preview ? 'Trocar foto' : 'Enviar foto'}
          </button>
          <button type="button" onClick={abrirCamera} disabled={disabled || processando}>Tirar foto com webcam</button>
          {arquivoPendente && <button type="button" className="paciente-foto-confirmar" onClick={confirmar} disabled={disabled || processando}>Confirmar foto</button>}
          {preview && <button type="button" className="paciente-foto-remover" onClick={remover} disabled={disabled || processando}>Remover foto</button>}
        </div>
      )}
      {arquivoPendente && <p role="status">Confira a prévia e confirme a foto antes de salvar.</p>}
      {erro && <p className="paciente-foto-erro" role="alert">{erro}</p>}
    </div>
  )
}
