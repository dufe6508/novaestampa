import { cookies } from "next/headers";

/**
 * Sessão do aluno · PROVISÓRIA.
 *
 * A auth definitiva é decisão pós-reunião (CLAUDE.md §3.3). Até lá a sessão é
 * um cookie httpOnly com o id do perfil, e as funções `aluno_*` do banco fazem
 * a validação de dono antes de escrever.
 *
 * Dívida conhecida e aceita, do mesmo tamanho da que já está registrada para o
 * painel: quem descobrir um `perfil_id` alheio consegue se passar por ele. Só
 * vale em protótipo. A troca por auth real mexe neste arquivo e nas funções do
 * banco, não nas telas.
 */

const COOKIE = "ne_aluno";

export type Aluno = {
  id: string;
  nome: string;
};

export async function sessao(): Promise<Aluno | null> {
  const bruto = (await cookies()).get(COOKIE)?.value;
  if (!bruto) return null;
  try {
    const dado = JSON.parse(bruto) as Aluno;
    return dado?.id ? dado : null;
  } catch {
    return null;
  }
}

export async function abrirSessao(aluno: Aluno) {
  (await cookies()).set(COOKIE, JSON.stringify(aluno), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180, // a campanha inteira, o aluno não deve relogar
  });
}

export async function fecharSessao() {
  (await cookies()).delete(COOKIE);
}
