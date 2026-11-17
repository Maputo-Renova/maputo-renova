"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validarComprovativo } from "@/lib/uploads";

export type Resultado = { ok?: string; erro?: string } | null;

const texto = (fd: FormData, nome: string) => String(fd.get(nome) ?? "").trim();

/** Anexo opcional (ficheiro OU foto — dois inputs com o mesmo name): valida
    e carrega para o bucket privado; devolve o caminho ou o erro. */
async function carregarAnexo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fd: FormData,
  nome: string,
  rotulo: string,
  userId: string,
  prefixo: string,
): Promise<{ path: string | null; erro?: string }> {
  const ficheiro = fd
    .getAll(nome)
    .find((f): f is File => f instanceof File && f.size > 0);
  if (!ficheiro) return { path: null };
  const invalido = validarComprovativo(ficheiro);
  if (invalido) return { path: null, erro: `${rotulo}: ${invalido}` };
  const ext = (ficheiro.name.split(".").pop() || "pdf").toLowerCase();
  const path = `${userId}/${prefixo}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("comprovativos").upload(path, ficheiro);
  if (error) return { path: null, erro: `${rotulo}: falhou o envio do anexo.` };
  return { path };
}

function mapearErro(mensagem: string): string {
  if (mensagem.includes("uq_condominios_nome_endereco"))
    return "Cadastro negado: já existe um condomínio com este nome e endereço.";
  if (mensagem.includes("uq_flats_identidade"))
    return "Cadastro negado: já existe uma flat com este bloco, andar e número neste condomínio.";
  if (mensagem.includes("uq_flats_fingerprint"))
    return "Cadastro negado: o cruzamento de proprietário, flat e endereço coincide com um registo existente.";
  return mensagem;
}

export async function criarCondominio(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const nome = texto(fd, "nome");
  const bairro = texto(fd, "bairro");
  const rua = texto(fd, "rua");
  if (!nome || !bairro || !rua) return { erro: "Preencha nome, bairro e rua/avenida." };
  if (!fd.get("termos")) return { erro: "Confirme a aceitação dos Termos e Condições." };

  const numeroPorta = texto(fd, "numero_porta");
  const cidade = texto(fd, "cidade") || "Maputo";
  const provincia = texto(fd, "provincia") || "Maputo Cidade";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada — volte a entrar." };

  const gestorDoc = await carregarAnexo(
    supabase, fd, "gestor_doc", "Cópia do documento do gestor", user.id, "kyc-gestor",
  );
  if (gestorDoc.erro) return { erro: gestorDoc.erro };

  const { data, error } = await supabase
    .from("condominios")
    .insert({
      gestor_doc_path: gestorDoc.path,
      nome,
      provincia,
      cidade,
      bairro,
      rua,
      numero_porta: numeroPorta || null,
      codigo_postal: texto(fd, "codigo_postal") || null,
      endereco: `${rua}${numeroPorta ? `, ${numeroPorta}` : ""} · ${bairro}, ${cidade}`,
      quota_padrao: Number(texto(fd, "quota_padrao") || 0) || 1500,
      dia_vencimento: Number(texto(fd, "dia_vencimento") || 5),
      total_moradias: Number(texto(fd, "total_moradias") || 0) || null,
      gestor_nome: texto(fd, "gestor_nome") || null,
      gestor_apelido: texto(fd, "gestor_apelido") || null,
      gestor_email: texto(fd, "gestor_email") || null,
      gestor_telefone: texto(fd, "gestor_telefone") || null,
      termos_aceites_em: new Date().toISOString(),
      termos_aceites_por: user?.id ?? null,
      created_by: user?.id ?? null,
    })
    .select("id, nome, codigo")
    .single();

  if (error) return { erro: mapearErro(error.message) };

  // Convite de acesso do gestor (uso único): o gestor regista-se com este
  // código e fica pendente até a consola aprovar.
  let convite = "";
  const gestorNome = texto(fd, "gestor_nome");
  if (gestorNome) {
    const { data: conv } = await supabase
      .from("convites_acesso")
      .insert({
        papel: "gestor",
        condominio_id: data.id,
        nome: gestorNome,
        apelido: texto(fd, "gestor_apelido") || null,
        email: texto(fd, "gestor_email") || null,
        telefone: texto(fd, "gestor_telefone") || null,
        criado_por: user?.id ?? null,
      })
      .select("codigo")
      .single();
    if (conv) convite = ` Código de convite do gestor: ${conv.codigo}`;
  }

  revalidatePath("/agente");
  return { ok: `Condomínio "${data.nome}" criado · código ${data.codigo}.${convite}` };
}

export async function criarFlat(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const condominioId = texto(fd, "condominio_id");
  const numero = texto(fd, "numero");
  const nome = texto(fd, "nome");
  const apelido = texto(fd, "apelido");
  const telefone = texto(fd, "telefone");
  if (!condominioId) return { erro: "Escolha o condomínio." };
  if (!numero) return { erro: "Indique o número da flat." };
  if (!nome || !apelido) return { erro: "Indique o nome e o apelido do proprietário." };
  if (!telefone) return { erro: "Indique o telefone do proprietário." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada — volte a entrar." };

  const doc = await carregarAnexo(supabase, fd, "doc", "Cópia do documento", user.id, "kyc-doc");
  if (doc.erro) return { erro: doc.erro };
  const endereco = await carregarAnexo(
    supabase, fd, "endereco", "Comprovativo de endereço", user.id, "kyc-endereco",
  );
  if (endereco.erro) return { erro: endereco.erro };

  const quota = Number(texto(fd, "quota_mensal") || 0);
  const { data, error } = await supabase
    .from("flats")
    .insert({
      proprietario_doc_path: doc.path,
      comprovativo_endereco_path: endereco.path,
      condominio_id: condominioId,
      bloco: texto(fd, "bloco") || null,
      andar: texto(fd, "andar") || null,
      numero,
      quota_mensal: quota > 0 ? quota : null,
      proprietario_nome: nome,
      proprietario_apelido: apelido,
      proprietario_telefone: telefone,
      proprietario_email: texto(fd, "email") || null,
      proprietario_nuit: texto(fd, "nuit") || null,
      proprietario_documento: texto(fd, "doc_numero") || null,
      proprietario_doc_tipo: texto(fd, "doc_tipo") === "Passaporte" ? "passaporte" : "bi",
      proprietario_data_nascimento: texto(fd, "nascimento") || null,
      created_by: user?.id ?? null,
    })
    .select("referencia, codigo_convite")
    .single();

  if (error) return { erro: mapearErro(error.message) };
  revalidatePath("/agente");
  return {
    ok: `Flat registada · referência ${data.referencia}. Código de convite do proprietário: ${data.codigo_convite}`,
  };
}
