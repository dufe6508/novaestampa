import { redirect } from "next/navigation";
import { publico } from "@/lib/supabase";
import { Marca } from "@/components/logo";
import { CampoCodigo } from "./campo-codigo";

/**
 * Primeira tela do aluno.
 *
 * Quem chega pelo link do representante cai direto em /t/[codigo] e nunca vê esta tela.
 * Ela existe para quem perdeu o link, e é a porta de entrada da demo.
 */

async function procurarTurma(_estado: string | null, formData: FormData) {
  "use server";

  const digitado = String(formData.get("codigo") ?? "")
    .trim()
    .toUpperCase();

  if (digitado.length < 4) {
    return "Digite o código completo. Ele tem pelo menos 4 caracteres.";
  }

  const { data, error } = await publico()
    .from("vw_turma_publica")
    .select("codigo")
    .eq("codigo", digitado)
    .maybeSingle();

  // Falha de infraestrutura e código inexistente são coisas diferentes, e o aluno
  // precisa saber qual das duas aconteceu: uma ele resolve, a outra não.
  if (error) {
    return "Não consegui verificar agora. Tente de novo em alguns segundos.";
  }
  if (!data) {
    return `Não encontrei a turma ${digitado}. Confira o código com seu representante.`;
  }

  redirect(`/t/${data.codigo}`);
}

export default function Entrar() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-[352px]">
        <section className="rounded-xl border border-line bg-surface px-6 py-7 shadow-float">
          <header className="mb-6 flex flex-col items-center gap-4 text-center">
            <Marca destaque className="h-8 w-8 text-ink" />

            <div className="flex flex-col gap-1.5">
              <h1 className="text-[22px] leading-tight">Seja bem-vindo</h1>
              <p className="text-body-sm leading-relaxed text-muted">
                Digite o código da sua turma para ver os uniformes.
              </p>
            </div>
          </header>

          <CampoCodigo acao={procurarTurma} />
        </section>

        <p className="mt-5 text-center text-caption leading-relaxed text-muted">
          Recebeu um link do representante? Abra por ele, já cai na turma certa.
        </p>
      </div>
    </main>
  );
}
