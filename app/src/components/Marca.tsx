export function MarcaSimbolo({ tamanho = 38 }: { tamanho?: number }) {
  return (
    <span
      aria-hidden
      className="grid place-items-center rounded-[29%] bg-green-600"
      style={{ width: tamanho, height: tamanho }}
    >
      <svg
        viewBox="0 0 24 24"
        style={{ width: tamanho * 0.55, height: tamanho * 0.55 }}
        className="stroke-white fill-none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 20V9l4-3v14M10 20V6l4-3v17M16 20v-9l4-3v12M2 20h20" />
      </svg>
    </span>
  );
}

export function Marca({ sub }: { sub?: string }) {
  return (
    <span className="flex items-center gap-3">
      <MarcaSimbolo />
      <span>
        <span className="block text-[16.5px] font-extrabold leading-tight tracking-tight">
          Maputo Renova
        </span>
        {sub ? (
          <span className="block text-xs font-semibold text-ink-3">{sub}</span>
        ) : null}
      </span>
    </span>
  );
}
