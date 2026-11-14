import { MarcaSimbolo } from "@/components/Marca";
import { sair } from "@/app/actions/sair";

export default function ContaSuspensa() {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 pt-[12vh]">
      <div className="mb-6"><MarcaSimbolo tamanho={56} /></div>
      <div className="card w-full max-w-120 text-center">
        <h1 className="mb-2 text-[18px] font-extrabold">Conta suspensa</h1>
        <p className="text-sm text-ink-2">
          O acesso desta conta foi suspenso pela administração. Se acha que se
          trata de um engano, contacte o gestor do seu condomínio ou o suporte
          do Maputo Renova.
        </p>
        <form action={sair} className="mt-5">
          <button className="btn btn-ghost">Terminar sessão</button>
        </form>
      </div>
    </main>
  );
}
