export function Kpi({
  rotulo,
  valor,
  detalhe,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
}) {
  return (
    <div className="card">
      <div className="text-[13.5px] font-bold text-ink-2">{rotulo}</div>
      <div className="num mt-2 text-[27px] font-extrabold tracking-tight">{valor}</div>
      {detalhe ? <div className="mt-1 text-[12.5px] font-semibold text-ink-3">{detalhe}</div> : null}
    </div>
  );
}

export const MT = (v: number) =>
  `${Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} MT`;
