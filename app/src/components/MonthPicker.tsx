import Link from "next/link";

export function MonthPicker({
  base,
  rotulo,
  prev,
  next,
  corrente,
}: {
  base: string;
  rotulo: string;
  prev: string;
  next: string;
  corrente: boolean;
}) {
  return (
    <div className="month-pick" role="group" aria-label="Mês">
      <Link href={`${base}?mes=${prev}`} aria-label="Mês anterior">
        ‹
      </Link>
      <b className="num">{rotulo}</b>
      <Link
        href={`${base}?mes=${next}`}
        aria-label="Mês seguinte"
        aria-disabled={corrente ? "true" : undefined}
      >
        ›
      </Link>
    </div>
  );
}
