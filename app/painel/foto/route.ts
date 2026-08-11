import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { perfilEmpresa } from "@/lib/empresa";

/**
 * Recebe uma foto de produto já comprimida e guarda no bucket `produtos`.
 *
 * Por que uma rota e não Server Action: Server Action na Vercel aceita 1 MB de
 * corpo por padrão, e mesmo comprimida uma foto pode passar disso. Route
 * handler aceita bem mais, e o arquivo sobe um por requisição, o que também dá
 * progresso por foto na tela.
 *
 * Por que não subir direto do navegador para o Storage: o bucket é público
 * para leitura e não tem policy de escrita. Abrir escrita para `anon`
 * deixaria qualquer pessoa com a chave pública encher o bucket. Aqui a chave
 * de serviço fica no servidor e quem manda precisa ter acesso de empresa.
 *
 * A compressão é do navegador (`components/fotos-produto.tsx`), e é decisão de
 * projeto: quem cadastra produto sobe do celular, no 4G da escola. As fotos da
 * polo saíram de 13,8 MB para 0,68 MB a 1600 px.
 */

const LIMITE = 3 * 1024 * 1024;
const TIPOS = ["image/webp", "image/jpeg", "image/png"];
const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(req: Request) {
  const perfil = await perfilEmpresa();
  if (!perfil?.id) {
    return NextResponse.json({ erro: "Sem permissão para subir fotos." }, { status: 403 });
  }

  const dados = await req.formData();
  const campanhaId = String(dados.get("campanha_id") ?? "");
  const arquivo = dados.get("arquivo");

  if (!UUID.test(campanhaId)) {
    return NextResponse.json({ erro: "Campanha não informada." }, { status: 400 });
  }
  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "Nenhuma foto recebida." }, { status: 400 });
  }
  if (!TIPOS.includes(arquivo.type)) {
    return NextResponse.json({ erro: "Envie uma imagem." }, { status: 415 });
  }
  if (arquivo.size > LIMITE) {
    return NextResponse.json({ erro: "A foto ficou grande demais." }, { status: 413 });
  }

  const extensao = arquivo.type === "image/webp" ? "webp" : arquivo.type.split("/")[1];
  const caminho = `campanha/${campanhaId}/${crypto.randomUUID()}.${extensao}`;

  const { error } = await db()
    .storage.from("produtos")
    .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });

  if (error) {
    console.error("[foto]", error.message);
    return NextResponse.json({ erro: "Não consegui guardar a foto." }, { status: 500 });
  }

  return NextResponse.json({ caminho });
}
