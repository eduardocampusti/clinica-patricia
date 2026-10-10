// Lista fixa. Estes aliases .invalid não criam DNS, tenant de navegação ou rota real.
// A consulta de banco ainda exige contexto ativo/não expirado e versão aplicada.
const HOSTS: Readonly<Record<string,string>> = Object.freeze({
 'clinicabrotas.com.br':'brotas',
 'clinicaipupiara.com.br':'ipupiara',
 'configuracoes-homologacao-a.invalid':'homologacao-configuracoes-a',
 'configuracoes-homologacao-b.invalid':'homologacao-configuracoes-b',
 'configuracoes-homologacao-r2-a.invalid':'homologacao-configuracoes-r2-a',
 'configuracoes-homologacao-r2-b.invalid':'homologacao-configuracoes-r2-b',
 'configuracoes-homologacao-r3-a.invalid':'homologacao-configuracoes-r3-a',
 'configuracoes-homologacao-r3-b.invalid':'homologacao-configuracoes-r3-b',
})
export function resolverHostnamePublico(v:unknown):string|null {
 if(!v||typeof v!=='object'||Array.isArray(v))return null
 const b=v as Record<string,unknown>
 if(Object.keys(b).length!==1||typeof b.hostname!=='string')return null
 const hostname=b.hostname.toLowerCase().replace(/^www\./,'')
 return Object.hasOwn(HOSTS,hostname)?HOSTS[hostname]:null
}
