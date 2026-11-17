"use client";

import { useActionState } from "react";
import { criarCondominio, criarFlat, type Resultado } from "./actions";

const PROVINCIAS = [
  "Maputo Cidade", "Maputo Província", "Gaza", "Inhambane", "Sofala",
  "Manica", "Tete", "Zambézia", "Nampula", "Cabo Delgado", "Niassa",
];

function Mensagem({ r }: { r: Resultado }) {
  if (!r) return null;
  if (r.erro)
    return (
      <p className="rounded-xl border border-red-700/40 bg-red-100 p-3 text-[13px] font-semibold text-red-700" role="alert">
        {r.erro}
      </p>
    );
  return (
    <p className="num rounded-xl bg-green-100 p-3 text-[13px] font-semibold text-green-800 break-words">
      {r.ok}
    </p>
  );
}

export function FormNovaFlat({
  condominios,
}: {
  condominios: { id: string; nome: string }[];
}) {
  const [resultado, accao, pendente] = useActionState(criarFlat, null);

  return (
    <form action={accao} className="grid gap-3.5">
      <Mensagem r={resultado} />
      <div className="field">
        <label htmlFor="condominio_id">Condomínio</label>
        <select id="condominio_id" name="condominio_id" required defaultValue="">
          <option value="" disabled>Escolha o condomínio</option>
          {condominios.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="field"><label htmlFor="bloco">Bloco</label><input id="bloco" name="bloco" placeholder="A" /></div>
        <div className="field"><label htmlFor="andar">Andar</label><input id="andar" name="andar" className="num" placeholder="3" /></div>
        <div className="field"><label htmlFor="numero">Número</label><input id="numero" name="numero" className="num" required placeholder="301" /></div>
      </div>
      <p className="text-xs font-semibold text-ink-3">
        A flat fica registada em nome do proprietário, não do inquilino.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="field"><label htmlFor="nome">Nome</label><input id="nome" name="nome" required placeholder="Nome próprio" /></div>
        <div className="field"><label htmlFor="apelido">Apelido</label><input id="apelido" name="apelido" required placeholder="Sobrenome" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="field"><label htmlFor="nascimento">Data de nascimento</label><input id="nascimento" name="nascimento" type="date" /></div>
        <div className="field"><label htmlFor="nuit">NUIT</label><input id="nuit" name="nuit" className="num" inputMode="numeric" placeholder="9 dígitos" /></div>
      </div>
      <div className="grid grid-cols-[110px_1fr] gap-3">
        <div className="field">
          <label htmlFor="doc_tipo">Documento</label>
          <select id="doc_tipo" name="doc_tipo"><option>BI</option><option>Passaporte</option></select>
        </div>
        <div className="field"><label htmlFor="doc_numero">Número do documento</label><input id="doc_numero" name="doc_numero" className="num" placeholder="Ex.: 110100482371B" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="field"><label htmlFor="telefone">Telefone</label><input id="telefone" name="telefone" className="num" inputMode="tel" required placeholder="84 000 0000" /></div>
        <div className="field"><label htmlFor="quota_mensal">Quota mensal (MT)</label><input id="quota_mensal" name="quota_mensal" className="num" inputMode="numeric" placeholder="Padrão do condomínio" /></div>
      </div>
      <div className="field"><label htmlFor="email">Email do proprietário</label><input id="email" name="email" type="email" placeholder="Para o convite de acesso" /></div>
      <button className="btn btn-primary w-full" disabled={pendente}>
        {pendente ? "A registar…" : "Registar flat"}
      </button>
      <p className="text-xs font-semibold text-ink-3">
        O sistema cruza proprietário, flat e endereço: duplicados são negados automaticamente.
      </p>
    </form>
  );
}

export function FormNovoCondominio() {
  const [resultado, accao, pendente] = useActionState(criarCondominio, null);

  return (
    <form action={accao} className="grid gap-3.5">
      <Mensagem r={resultado} />
      <div className="field"><label htmlFor="c-nome">Nome do condomínio</label><input id="c-nome" name="nome" required placeholder="Ex.: Residencial Costa Viva" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="field">
          <label htmlFor="c-prov">Província</label>
          <select id="c-prov" name="provincia" defaultValue="Maputo Cidade">
            {PROVINCIAS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="c-cidade">Cidade</label><input id="c-cidade" name="cidade" defaultValue="Maputo" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="field"><label htmlFor="c-bairro">Bairro</label><input id="c-bairro" name="bairro" required placeholder="Ex.: Polana Caniço" /></div>
        <div className="field"><label htmlFor="c-cp">Código postal</label><input id="c-cp" name="codigo_postal" className="num" placeholder="1100" /></div>
      </div>
      <div className="grid grid-cols-[1fr_110px] gap-3">
        <div className="field"><label htmlFor="c-rua">Rua / Avenida</label><input id="c-rua" name="rua" required placeholder="Ex.: Av. Julius Nyerere" /></div>
        <div className="field"><label htmlFor="c-num">Número</label><input id="c-num" name="numero_porta" className="num" placeholder="1247" /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="field"><label htmlFor="c-mor">Moradias</label><input id="c-mor" name="total_moradias" className="num" inputMode="numeric" placeholder="24" /></div>
        <div className="field"><label htmlFor="c-quota">Quota (MT)</label><input id="c-quota" name="quota_padrao" className="num" inputMode="numeric" defaultValue="1500" /></div>
        <div className="field"><label htmlFor="c-venc">Vencimento</label><input id="c-venc" name="dia_vencimento" className="num" inputMode="numeric" defaultValue="5" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="field"><label htmlFor="g-nome">Gestor · nome</label><input id="g-nome" name="gestor_nome" placeholder="Nome próprio" /></div>
        <div className="field"><label htmlFor="g-apelido">Gestor · apelido</label><input id="g-apelido" name="gestor_apelido" placeholder="Sobrenome" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="field"><label htmlFor="g-email">Gestor · email</label><input id="g-email" name="gestor_email" type="email" placeholder="gestor@exemplo.co.mz" /></div>
        <div className="field"><label htmlFor="g-tel">Gestor · contacto</label><input id="g-tel" name="gestor_telefone" className="num" inputMode="tel" placeholder="84 000 0000" /></div>
      </div>
      <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-ink-2">
        <input type="checkbox" name="termos" className="mt-0.5 size-4.5 accent-green-600" />
        <span>
          Declaro que o condomínio e o gestor aceitam os{" "}
          <a href="/termos" target="_blank" className="font-bold text-green-700 underline">Termos e Condições</a>{" "}
          e a{" "}
          <a href="/privacidade" target="_blank" className="font-bold text-green-700 underline">Política de Privacidade</a>
          ; a aceitação fica registada com data e autor.
        </span>
      </label>
      <button className="btn btn-primary w-full" disabled={pendente}>
        {pendente ? "A criar…" : "Criar condomínio"}
      </button>
    </form>
  );
}
