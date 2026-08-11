import { NextRequest, NextResponse } from "next/server";
import { fecharSessao } from "@/lib/sessao";

/**
 * Recupera uma sessao cujo perfil deixou de existir.
 *
 * Cookies so podem ser alterados em Server Actions ou Route Handlers. Esta
 * rota fica fora da renderizacao da pagina Conta para que a limpeza seja
 * aceita pelo Next.js.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ codigo: string }> },
) {
  const { codigo } = await params;
  await fecharSessao();

  const destino = request.nextUrl.clone();
  destino.pathname = `/t/${encodeURIComponent(codigo)}/entrar`;
  destino.search = "";

  return NextResponse.redirect(destino);
}
