// Exclusivamente harness sintético: nunca importado pela aplicação normal.
export const ACESSO_DIRETO_HABILITADO = new URLSearchParams(window.location.search).get('habilitado') === '1'
