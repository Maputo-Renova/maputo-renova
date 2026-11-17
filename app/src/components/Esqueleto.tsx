// Esqueleto de carregamento das áreas autenticadas: aparece no instante do
// clique (o Next pré-carrega a shell até ao primeiro loading.tsx), enquanto o
// servidor em Dublin responde — a navegação deixa de parecer "presa".
export function EsqueletoPainel() {
  return (
    <div className="grid min-h-dvh md:grid-cols-[250px_1fr]">
      <aside className="hidden border-r border-line bg-card md:block">
        <div className="animate-pulse px-5 py-6">
          <div className="mb-8 flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-green-150" />
            <div className="h-4 w-28 rounded bg-bg" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="mb-3 h-9 rounded-xl bg-bg" />
          ))}
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-line/60 px-5 py-3.5 md:px-8">
          <div className="size-10 animate-pulse rounded-[10px] bg-card md:hidden" />
          <div className="ml-auto h-11 w-36 animate-pulse rounded-full bg-card" />
        </header>
        <main className="mx-auto w-full max-w-290 animate-pulse px-5 pb-12 pt-6 md:px-8">
          <div className="mb-2 h-7 w-52 rounded bg-card" />
          <div className="mb-6 h-4 w-72 rounded bg-card" />
          <div className="grid max-w-180 gap-4">
            <div className="h-36 rounded-2xl bg-card" />
            <div className="h-56 rounded-2xl bg-card" />
          </div>
        </main>
      </div>
    </div>
  );
}
