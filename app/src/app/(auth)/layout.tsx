import { MarcaSimbolo } from "@/components/Marca";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 pt-[7vh] pb-10">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <MarcaSimbolo tamanho={56} />
        <div>
          <div className="text-[21px] font-extrabold tracking-tight">Maputo Renova</div>
          <div className="text-xs font-semibold text-ink-3">
            Gestão de condomínios · Maputo
          </div>
        </div>
      </div>
      <div className="w-full max-w-105">{children}</div>
    </main>
  );
}
