import { Icone, type NomeIcone } from "@/components/Icone";

export function Kpi({
  rotulo,
  valor,
  detalhe,
  icone,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  icone?: NomeIcone;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-2.5 text-[13.5px] font-bold text-ink-2">
        {icone ? (
          <span className="card-ico">
            <Icone nome={icone} />
          </span>
        ) : null}
        {rotulo}
      </div>
      <div className="num mt-2 text-[27px] font-extrabold tracking-tight">{valor}</div>
      {detalhe ? <div className="mt-1 text-[12.5px] font-semibold text-ink-3">{detalhe}</div> : null}
    </div>
  );
}

export const MT = (v: number) =>
  `${Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} MT`;
