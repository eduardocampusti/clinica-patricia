import { useCallback, useEffect, useRef, useState } from 'react'
import { buscarFotosEquipe, erroRecursosSeguro, liberarFotosEquipe, type FotosEquipe } from '../../lib/equipeRecursos'
import { supabase } from '../../lib/supabase'
const vazio=():FotosEquipe=>({metas:{},fotos:{},falhaImagem:false})
export function useEquipeFotos(clinicaId:string|null,identidades:string,habilitado:boolean) {
  const [dados,setDados]=useState<FotosEquipe>(vazio)
  const [erro,setErro]=useState<string|null>(null);const [carregando,setCarregando]=useState(false)
  const geracao=useRef(0);const confirmados=useRef<FotosEquipe>(vazio())
  const reconsultar=useCallback(async():Promise<boolean>=>{
    if(!clinicaId||!habilitado)return false
    const atual=++geracao.current;setCarregando(true)
    try {
      const novos=await buscarFotosEquipe(clinicaId)
      if(atual!==geracao.current){liberarFotosEquipe(novos.fotos);return false}
      liberarFotosEquipe(confirmados.current.fotos);confirmados.current=novos;setDados(novos)
      setErro(novos.falhaImagem?'Uma foto confirmada não pôde ser carregada. Reconsulte antes de avaliar a imagem.':null)
      return !novos.falhaImagem
    }catch(e){if(atual===geracao.current)setErro(erroRecursosSeguro(e).message);return false}
    finally{if(atual===geracao.current)setCarregando(false)}
  },[clinicaId,habilitado])
  useEffect(()=>{
    geracao.current++;liberarFotosEquipe(confirmados.current.fotos);confirmados.current=vazio();setDados(confirmados.current);setErro(null)
    if(habilitado&&identidades)void reconsultar()
    const limpar=()=>{geracao.current++;liberarFotosEquipe(confirmados.current.fotos)}
    return limpar
  },[identidades,reconsultar,habilitado])
  useEffect(()=>{
    const {data}=supabase.auth.onAuthStateChange(event=>{
      if(event==='SIGNED_OUT'){geracao.current++;liberarFotosEquipe(confirmados.current.fotos);confirmados.current=vazio();setDados(confirmados.current);setErro('Entre novamente para consultar as fotos.');setCarregando(false)}
    });return()=>data.subscription.unsubscribe()
  },[])
  return {...dados,erro,carregando,reconsultar}
}
