export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Normaliza ?mes=YYYY-MM para o dia 1 desse mês (default: mês corrente). */
export function mesDe(param: string | undefined): { iso: string; rotulo: string; prev: string; next: string; corrente: boolean } {
  const hoje = new Date();
  let ano = hoje.getFullYear();
  let mes = hoje.getMonth(); // 0-based
  const m = param?.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    ano = Number(m[1]);
    mes = Number(m[2]) - 1;
  }
  const chave = (a: number, m0: number) =>
    `${a}-${String(m0 + 1).padStart(2, "0")}`;
  return {
    iso: `${chave(ano, mes)}-01`,
    rotulo: `${MESES[mes]} ${ano}`,
    prev: chave(mes === 0 ? ano - 1 : ano, mes === 0 ? 11 : mes - 1),
    next: chave(mes === 11 ? ano + 1 : ano, mes === 11 ? 0 : mes + 1),
    corrente: ano === hoje.getFullYear() && mes === hoje.getMonth(),
  };
}
