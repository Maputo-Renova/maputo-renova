"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icone } from "@/components/Icone";
import { createClient } from "@/lib/supabase/client";

const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];

/** Foto de perfil (protótipo): carregar ficheiro ou tirar foto; remover. */
export function FormFoto({ fotoUrl, iniciais }: { fotoUrl: string | null; iniciais: string }) {
  const router = useRouter();
  const refFicheiro = useRef<HTMLInputElement>(null);
  const refCamara = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);

  async function carregar(ev: React.ChangeEvent<HTMLInputElement>) {
    const ficheiro = ev.target.files?.[0];
    ev.target.value = "";
    if (!ficheiro) return;
    setErro(null);
    if (!TIPOS_FOTO.includes(ficheiro.type)) {
      setErro("Use uma imagem JPEG, PNG ou WebP.");
      return;
    }
    if (ficheiro.size > 10 * 1024 * 1024) {
      setErro("A foto é demasiado grande — o máximo são 10 MB.");
      return;
    }
    setAEnviar(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) { setErro("Sessão expirada — volte a entrar."); setAEnviar(false); return; }

    const ext = (ficheiro.name.split(".").pop() || "jpg").toLowerCase();
    const caminho = `${user.id}/perfil-foto-${Date.now()}.${ext}`;
    const { error: erroUpload } = await supabase.storage
      .from("comprovativos")
      .upload(caminho, ficheiro);
    if (erroUpload) { setErro("Falhou o envio da foto."); setAEnviar(false); return; }

    const { error: erroRpc } = await supabase.rpc("fn_actualizar_foto", { p_path: caminho });
    setAEnviar(false);
    if (erroRpc) { setErro(erroRpc.message); return; }
    router.refresh();
  }

  async function remover() {
    setErro(null);
    setAEnviar(true);
    const { error } = await createClient().rpc("fn_actualizar_foto", { p_path: null });
    setAEnviar(false);
    if (error) { setErro(error.message); return; }
    router.refresh();
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-4 border-b border-line-soft pb-5">
      {fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL assinada de curta duração
        <img src={fotoUrl} alt="Foto de perfil" className="size-16 rounded-full object-cover" />
      ) : (
        <span className="grid size-16 place-items-center rounded-full bg-green-150 text-[20px] font-extrabold text-green-800">
          {iniciais}
        </span>
      )}
      <div className="grid gap-2">
        <div className="flex flex-wrap gap-2.5">
          <button type="button" className="btn btn-ghost btn-sm" disabled={aEnviar} onClick={() => refFicheiro.current?.click()}>
            <Icone nome="file" sm />
            {aEnviar ? "A enviar…" : "Carregar foto"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={aEnviar} onClick={() => refCamara.current?.click()}>
            <Icone nome="camera" sm />
            Tirar foto
          </button>
          {fotoUrl ? (
            <button type="button" className="btn btn-ghost btn-sm" disabled={aEnviar} onClick={remover}>
              Remover foto
            </button>
          ) : null}
        </div>
        <span className="text-xs font-semibold text-ink-3">JPEG, PNG ou WebP · máx. 10 MB</span>
        {erro ? <span className="text-[13px] font-semibold text-red-700">{erro}</span> : null}
      </div>
      <input ref={refFicheiro} name="foto" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={carregar} />
      <input ref={refCamara} name="foto" type="file" accept="image/*" capture="user" className="hidden" onChange={carregar} />
    </div>
  );
}
