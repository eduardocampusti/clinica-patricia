const CATEGORIAS = ['novidades', 'melhorias', 'correcoes']

export function temNotas(notas) {
  return CATEGORIAS.some(categoria => Array.isArray(notas?.[categoria]) && notas[categoria].length > 0)
}

function unicaPorVersao(entradas, nome) {
  const versoes = entradas.map(entrada => entrada.versao)
  if (new Set(versoes).size !== versoes.length) throw new Error(`${nome} contém versões duplicadas.`)
}

export function prepararNotas(origem, versao) {
  if (!/^\d+\.\d+\.\d+$/.test(versao)) throw new Error('Versão proposta inválida.')
  const notas = structuredClone(origem)
  notas.versoesPreparadas ??= []
  if (notas.versoesLancadas.some(entrada => entrada.versao === versao)) {
    throw new Error(`A versão ${versao} já foi publicada.`)
  }
  const existente = notas.versoesPreparadas.find(entrada => entrada.versao === versao)
  if (temNotas(notas.naoLancadas)) {
    const entrada = { versao, notas: structuredClone(notas.naoLancadas) }
    notas.versoesPreparadas = [...notas.versoesPreparadas.filter(item => item.versao !== versao), entrada]
    notas.naoLancadas = Object.fromEntries(CATEGORIAS.map(categoria => [categoria, []]))
  } else if (!existente) {
    throw new Error(`Não há notas aprovadas para preparar ${versao}.`)
  }
  notas.versaoEmDesenvolvimento = versao
  return notas
}

export function publicarNotas(origem, versao, data) {
  const notas = structuredClone(origem)
  notas.versoesPreparadas ??= []
  if (notas.versoesLancadas.some(entrada => entrada.versao === versao)) return notas
  const preparada = notas.versoesPreparadas.find(entrada => entrada.versao === versao)
  if (!preparada || !temNotas(preparada.notas)) throw new Error(`Não há notas preparadas para ${versao}.`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error('Data de publicação inválida.')
  notas.versoesLancadas.push({ versao, lancadaEm: data, notas: preparada.notas })
  notas.versoesPreparadas = notas.versoesPreparadas.filter(entrada => entrada.versao !== versao)
  if (notas.versaoEmDesenvolvimento === versao) notas.versaoEmDesenvolvimento = null
  return notas
}

export function validarNotas({ pacote, lock, manifesto, config, notas }) {
  const versao = pacote.version
  if (lock.version !== versao || lock.packages[''].version !== versao) {
    throw new Error('Versão divergente entre package.json e lockfile.')
  }
  if (manifesto['.'] === '0.0.0' && config['initial-version'] !== versao) {
    throw new Error('A primeira versão proposta deve corresponder à versão em desenvolvimento.')
  }
  const preparadas = notas.versoesPreparadas ?? []
  unicaPorVersao(preparadas, 'versoesPreparadas')
  unicaPorVersao(notas.versoesLancadas, 'versoesLancadas')
  if (preparadas.some(item => notas.versoesLancadas.some(lancada => lancada.versao === item.versao))) {
    throw new Error('Uma versão não pode estar preparada e publicada ao mesmo tempo.')
  }
  const lancada = notas.versoesLancadas.find(item => item.versao === versao)
  const preparada = preparadas.find(item => item.versao === versao)
  if (lancada) {
    if (manifesto['.'] !== versao || !lancada.lancadaEm || !temNotas(lancada.notas)) {
      throw new Error(`A versão publicada ${versao} não está consistente.`)
    }
    return 'publicada'
  }
  if (preparada) {
    if (manifesto['.'] !== versao || !temNotas(preparada.notas)) {
      throw new Error(`A versão em preparação ${versao} não está consistente.`)
    }
    return 'em preparação'
  }
  if (manifesto['.'] === versao || notas.versaoEmDesenvolvimento !== versao || !temNotas(notas.naoLancadas)) {
    throw new Error(`A versão em desenvolvimento ${versao} não possui notas vinculadas ao build.`)
  }
  return 'em desenvolvimento'
}
