export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

export function formatarCpf(valor: string): string {
  const digitos = apenasDigitos(valor).slice(0, 11)
  return digitos
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function calcularDigitoVerificador(base: string): number {
  let soma = 0
  let peso = base.length + 1
  for (const caractere of base) {
    soma += Number(caractere) * peso
    peso -= 1
  }
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

export function cpfValido(valor: string): boolean {
  const cpf = apenasDigitos(valor)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const digito1 = calcularDigitoVerificador(cpf.slice(0, 9))
  const digito2 = calcularDigitoVerificador(cpf.slice(0, 9) + digito1)

  return cpf === cpf.slice(0, 9) + String(digito1) + String(digito2)
}
