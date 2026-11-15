import { Icone } from "@/components/Icone";
import { MT } from "@/components/Kpi";

export type Projecto = {
  id: string;
  nome: string;
  categoria: string;
  descricao: string | null;
  orcamento: number;
  data_prevista: string;
  financiamento: "fundo" | "quota_extraordinaria" | "associacao";
  quota_extra: number | null;
  gasto: number;
  estado: "pendente" | "aprovado" | "rejeitado" | "concluido";
  progresso: number;
  votos_favor: number;
  votos_contra: number;
};

export type Actualizacao = { texto: string; created_at: string };

const PILL: Record<string, { classe: string; rotulo: string }> = {
  pendente: { classe: "pill pill-pendente", rotulo: "Por aprovar" },
  aprovado: { classe: "pill pill-confirmar", rotulo: "Em curso" },
  concluido: { classe: "pill pill-pago", rotulo: "Concluído" },
  rejeitado: { classe: "pill pill-atraso", rotulo: "Rejeitado" },
};

export function textoFinanciamento(p: Projecto): string {
  if (p.financiamento === "quota_extraordinaria") {
    return p.quota_extra
      ? `Quota extraordinária · ${MT(Number(p.quota_extra))} por flat`
      : "Quota extraordinária";
  }
  if (p.financiamento === "associacao") {
    return "Fundo da associação · votação na assembleia";
  }
  return "Fundo do condomínio";
}

export function ProjectoCard({
  p,
  updates,
  children,
}: {
  p: Projecto;
  updates: Actualizacao[];
  children?: React.ReactNode;
}) {
  const pill = PILL[p.estado] ?? PILL.pendente;
  const totalVotos = p.votos_favor + p.votos_contra;
  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="card-ico">
          <Icone nome="obra" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold">{p.nome}</h2>
          <div className="cell-sub">
            {p.categoria} · conclusão prevista:{" "}
            {new Date(`${p.data_prevista}T00:00:00`).toLocaleDateString("pt-PT")}
          </div>
        </div>
        <span className={pill.classe}>{pill.rotulo}</span>
      </div>
      {p.descricao ? (
        <p className="mb-3.5 mt-2 text-sm text-ink-2">{p.descricao}</p>
      ) : (
        <div className="mt-2" />
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex justify-between text-[13px] font-bold">
            <span>Execução da obra</span>
            <span className="num">{p.progresso}%</span>
          </div>
          <span className="prog">
            <i style={{ width: `${p.progresso}%` }} />
          </span>
          <div className="cell-sub mt-1.5">
            Orçamento <b className="num">{MT(Number(p.orcamento))}</b>
            {Number(p.gasto) > 0 ? (
              <>
                {" "}
                · gasto <b className="num">{MT(Number(p.gasto))}</b>
              </>
            ) : null}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[13px] font-bold">Financiamento</div>
          <div className="cell-sub">{textoFinanciamento(p)}</div>
          {p.financiamento === "associacao" && p.estado !== "pendente" ? (
            <div className="cell-sub mt-1.5">
              {totalVotos > 0 ? (
                <span className="num">
                  Assembleia: <b className="text-green-700">{p.votos_favor} a favor</b> ·{" "}
                  <b className="text-red-700">{p.votos_contra} contra</b>
                </span>
              ) : (
                "Aguarda a assembleia da associação"
              )}
            </div>
          ) : null}
        </div>
      </div>
      {updates.length > 0 ? (
        <ul className="row-list mt-2">
          {updates.slice(0, 2).map((u, i) => (
            <li key={i}>
              <span className="row-ico g">
                <Icone nome="clock" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold">{u.texto}</div>
              </div>
              <span className="cell-sub">
                {new Date(u.created_at).toLocaleDateString("pt-PT")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {children}
    </div>
  );
}
