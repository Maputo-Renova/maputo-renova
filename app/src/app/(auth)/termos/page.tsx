import Link from "next/link";

export const metadata = { title: "Termos e Condições — Maputo Renova" };

export default function Termos() {
  return (
    <div className="card max-w-2xl text-[14px] leading-relaxed text-ink-2">
      <h1 className="mb-1 text-[20px] font-extrabold text-ink">Termos e Condições</h1>
      <p className="mb-4 text-[12.5px] text-ink-3">
        Versão de trabalho · sujeita a revisão jurídica antes do lançamento
      </p>

      <h2 className="mb-1 mt-4 text-[15px] font-extrabold text-ink">1. O serviço</h2>
      <p>
        O Maputo Renova é uma plataforma de gestão de condomínios em Maputo:
        emissão de quotas, cobrança, repasse aos condomínios, comunicação e
        registo de despesas. A conta de cada flat é registada em nome do seu
        proprietário, com convite de uso único.
      </p>

      <h2 className="mb-1 mt-4 text-[15px] font-extrabold text-ink">2. Taxas</h2>
      <p>
        A fatura mensal do proprietário tem três componentes: a taxa de
        condomínio (definida pelo condomínio e repassada por inteiro), a taxa da
        associação (fixa, destinada ao fundo de projectos votados em
        assembleia) e a taxa de serviço (percentagem sobre a quota, que remunera
        a plataforma; custos de operadores e mensagens são deduzidos dela e
        nunca cobrados à parte).
      </p>

      <h2 className="mb-1 mt-4 text-[15px] font-extrabold text-ink">3. Pagamentos e repasses</h2>
      <p>
        Os pagamentos são recebidos nas contas da plataforma e os valores da
        taxa de condomínio são repassados ao condomínio, com comprovativo. Um
        pagamento por transferência só é dado como liquidado depois de o gestor
        validar o comprovativo.
      </p>

      <h2 className="mb-1 mt-4 text-[15px] font-extrabold text-ink">4. Contas e acesso</h2>
      <p>
        O acesso é pessoal e intransmissível. Os emails de acesso só podem ser
        alterados pelo gestor (moradores) ou pela consola (gestores e
        colaboradores), com registo em auditoria. Gestores recém-registados são
        aprovados pela administração da plataforma antes de gerirem o
        condomínio.
      </p>

      <h2 className="mb-1 mt-4 text-[15px] font-extrabold text-ink">5. Dados pessoais</h2>
      <p>
        O tratamento de dados pessoais é descrito na{" "}
        <Link href="/privacidade" className="font-bold text-green-700 hover:underline">
          Política de Privacidade
        </Link>
        , que faz parte destes termos.
      </p>

      <h2 className="mb-1 mt-4 text-[15px] font-extrabold text-ink">6. Responsabilidade</h2>
      <p>
        A plataforma presta um serviço de cobrança e organização; a definição
        das quotas, a validação de comprovativos e a execução das despesas são
        da responsabilidade da administração de cada condomínio.
      </p>

      <p className="mt-5">
        <Link href="/entrar" className="font-bold text-green-700 hover:underline">
          ← Voltar à entrada
        </Link>
      </p>
    </div>
  );
}
