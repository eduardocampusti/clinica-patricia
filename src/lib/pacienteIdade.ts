/** Idade civil calculada em tempo de exibição, nunca persistida. */
export function calcularIdade(data: string, hoje = new Date()): number | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data)
  if (!partes) return null
  const ano = Number(partes[1])
  const mes = Number(partes[2])
  const dia = Number(partes[3])
  const nascimento = new Date(0)
  nascimento.setFullYear(ano, mes - 1, dia)
  if (nascimento.getFullYear() !== ano || nascimento.getMonth() !== mes - 1 || nascimento.getDate() !== dia) return null
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth() + 1
  const diaAtual = hoje.getDate()
  if (ano > anoAtual || (ano === anoAtual && (mes > mesAtual || (mes === mesAtual && dia > diaAtual)))) return null
  return anoAtual - ano - (mesAtual < mes || (mesAtual === mes && diaAtual < dia) ? 1 : 0)
}
