"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function confirmarTransferencia(fd: FormData) {
  const supabase = await createClient();
  await supabase.rpc("fn_confirmar_transferencia", {
    p_pagamento: String(fd.get("pagamento_id")),
  });
  revalidatePath("/gestor/pagamentos");
  revalidatePath("/gestor");
}

export async function rejeitarTransferencia(fd: FormData) {
  const supabase = await createClient();
  await supabase.rpc("fn_rejeitar_transferencia", {
    p_pagamento: String(fd.get("pagamento_id")),
  });
  revalidatePath("/gestor/pagamentos");
}
