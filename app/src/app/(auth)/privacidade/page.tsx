import Link from "next/link";

export const metadata = { title: "Política de Privacidade — Maputo Renova" };

export default function Privacidade() {
  return (
    <div className="card max-w-2xl text-[14px] leading-relaxed text-ink-2">
      <h1 className="mb-1 text-[20px] font-extrabold text-ink">Política de Privacidade</h1>
      <p className="mb-4 text-[12.5px] text-ink-3">
        Versão de trabalho · sujeita a revisão jurídica antes do lançamento
      </p>

      <h2 className="mb-1 mt-4 text-[15px] font-extrabold text-ink">1. Que dados tratamos</h2>
      <p>
        Dados de identificação do proprietário e do gestor (nome, BI ou
        passaporte, NUIT, data de nascimento, contactos), dados da flat e do
        condomínio, comprovativo de endereço, faturas, pagamentos e
        comprovativos de transferência. São os dados mínimos necessários para o
        cadastro verificado, a cobrança e o repasse.
      </p>

      <h2 className="mb-1 mt-4 text-[15px] font-extrabold text-ink">2. Para que os usamos</h2>
      <p>
        Exclusivamente para operar o serviço: emitir e cobrar quotas, validar
        pagamentos, repassar valores ao condomínio, enviar lembretes e avisos
        (email e, futuramente, SMS) e manter o registo contabilístico do
        condomínio. Não vendemos nem cedemos dados a terceiros para marketing.
      </p>

      <h2 className="mb-1 mt-4 text-[15px] font-extrabold text-ink">3. Quem vê o quê</h2>
      <p>
        O isolamento é imposto na base de dados: cada proprietário vê apenas a
        sua flat e as suas faturas; cada gestor vê apenas o seu condomínio; os
        agentes de cadastro não acedem a dados financeiros; a administração da
        plataforma acede ao conjunto, com as acções sensíveis registadas em
        auditoria. Os documentos (comprovativos, BI) ficam em armazenamento
        privado, acessível apenas por ligações assinadas de curta duração.
      </p>

      <h2 className="mb-1 mt-4 text-[15px] font-extrabold text-ink">4. Segurança</h2>
      <p>
        Sessões com tokens assinados, isolamento por regras de acesso ao nível
        da base de dados, verificação em dois passos disponível em todas as
        contas (recomendada para a administração), e registo de auditoria das
        operações sensíveis.
      </p>

      <h2 className="mb-1 mt-4 text-[15px] font-extrabold text-ink">5. Retenção e direitos</h2>
      <p>
        Os registos financeiros são conservados pelo período exigido para
        prestação de contas do condomínio. Pode pedir a correcção dos seus
        dados de cadastro através do suporte na própria plataforma; a
        eliminação de dados pessoais é atendida na medida em que não conflitue
        com obrigações de registo contabilístico.
      </p>

      <p className="mt-5">
        <Link href="/termos" className="font-bold text-green-700 hover:underline">
          Termos e Condições
        </Link>
        {" · "}
        <Link href="/entrar" className="font-bold text-green-700 hover:underline">
          Voltar à entrada
        </Link>
      </p>
    </div>
  );
}
