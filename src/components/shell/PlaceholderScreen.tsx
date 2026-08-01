interface PlaceholderScreenProps {
  titulo: string
}

function PlaceholderScreen({ titulo }: PlaceholderScreenProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-[var(--borda)] bg-[var(--fundo-card)] p-10 text-center shadow-[0px_1px_8px_rgba(0,0,0,0.1)]">
      <h1 className="text-xl font-normal text-[var(--texto-titulo)]">{titulo}</h1>
      <p className="mt-2 text-sm text-[var(--texto-secundario)]">
        Este módulo ainda está em construção.
      </p>
    </div>
  )
}

export default PlaceholderScreen
