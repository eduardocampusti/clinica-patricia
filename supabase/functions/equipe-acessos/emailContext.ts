// Apresentação apenas: nunca usado para conceder acesso ou determinar papéis.
export function identidadeEmailConvite(clinicas: readonly { id: string; nome: string }[], vinculos: unknown): 'brotas' | 'ipupiara' | 'conjunta' {
  if (!Array.isArray(vinculos) || !vinculos.length) return 'conjunta'
  const nomes = vinculos.map(v => v && typeof v.clinica_id === 'string' ? clinicas.find(c => c.id === v.clinica_id)?.nome : undefined)
  if (nomes.some(n => !n || !['Clínica Brotas', 'Clínica Ipupiara'].includes(n))) return 'conjunta'
  if (nomes.every(n => n === 'Clínica Brotas')) return 'brotas'
  if (nomes.every(n => n === 'Clínica Ipupiara')) return 'ipupiara'
  return 'conjunta'
}
