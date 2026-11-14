import { MarcaSimbolo } from "@/components/Marca";
import { sair } from "@/app/actions/sair";

export default function ContaPendente() {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 pt-[12vh]">
      <div className="mb-6"><MarcaSimbolo tamanho={56} /></div>
      <div className="card w-full max-w-120 text-center">
        <h1 className="mb-2 text-[18px] font-extrabold">Conta a aguardar aprovação</h1>
        <p className="text-sm text-ink-2">
          O seu registo de gestor foi recebido. Pode entrar na conta, mas a
          gestão do condomínio só fica disponível depois da aprovação pela
          consola do Maputo Renova. Será avisado por email.
        </p>
        <form action={sair} className="mt-5">
          <button className="btn btn-ghost">Terminar sessão</button>
        </form>
      </div>
    </main>
  );
}
