/* Regras de upload de comprovativos — espelham os limites do bucket
   (Storage: file_size_limit 10 MB, allowed_mime_types). */

export const TIPOS_COMPROVATIVO = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const TAMANHO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** Devolve a mensagem de erro, ou null se o ficheiro é aceitável. */
export function validarComprovativo(f: File): string | null {
  if (!TIPOS_COMPROVATIVO.includes(f.type)) {
    return "Formato não aceite — envie PDF ou imagem (JPEG, PNG, WebP).";
  }
  if (f.size > TAMANHO_MAX_BYTES) {
    return "Ficheiro demasiado grande — o máximo são 10 MB.";
  }
  if (f.size === 0) {
    return "O ficheiro está vazio.";
  }
  return null;
}
