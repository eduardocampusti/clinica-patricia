import assert from 'node:assert/strict'
import test from 'node:test'
import { TAMANHO_MAXIMO_FOTO_PACIENTE, validarFotoPaciente } from './pacienteFotoValidacao'

test('aceita somente formatos de imagem aprovados e identifica a extensão segura', () => {
  assert.equal(validarFotoPaciente(new File(['foto'], 'foto.jpeg', { type: 'image/jpeg' })).extensao, 'jpg')
  assert.equal(validarFotoPaciente(new File(['foto'], 'foto.png', { type: 'image/png' })).extensao, 'png')
  assert.equal(validarFotoPaciente(new File(['foto'], 'foto.webp', { type: 'image/webp' })).extensao, 'webp')
  assert.throws(() => validarFotoPaciente(new File(['<svg/>'], 'foto.svg', { type: 'image/svg+xml' })), /JPG, PNG ou WebP/)
})

test('rejeita imagem vazia ou acima de 5 MB', () => {
  assert.throws(() => validarFotoPaciente(new File([], 'vazia.png', { type: 'image/png' })), /vazia/)
  const grande = new File([new Uint8Array(TAMANHO_MAXIMO_FOTO_PACIENTE + 1)], 'grande.jpg', { type: 'image/jpeg' })
  assert.throws(() => validarFotoPaciente(grande), /5 MB/)
})
