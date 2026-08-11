import Link from "next/link";
import { redirect } from "next/navigation";
import { publico } from "@/lib/supabase";
import { concederAcesso } from "@/lib/empresa";
import { sessao } from "@/lib/sessao";
import { Marca } from "@/components/logo";
import { CampoCodigo } from "./campo-codigo";
import { Apresentacao } from "./apresentacao";

/**
 * Primeira tela do aluno.
 *
 * Quem chega pelo link do representante cai direto em /t/[codigo] e nunca vê esta tela.
 * Ela existe para quem perdeu o link, e é a porta de entrada da demo.
 */

/**
 * Apresentação animada acima do campo do código, desligada.
 *
 * O código continua em `apresentacao.tsx` e as fotos em `public/apresentacao/`. Ligar é
 * trocar esta linha para `true`: a tela volta a abrir com a peça, o campo desce para o
 * fim da página e perde o foco automático, que ali jogaria a rolagem para baixo.
 */
const APRESENTACAO: boolean = false;

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

  if (data) redirect(`/t/${data.codigo}`);

  /**
   * Não é turma. Pode ser o código da empresa, que entra por esta mesma tela
   * por decisão do usuário: a Nova Estampa não tem por que decorar um segundo
   * endereço para começar o dia de trabalho.
   *
   * Só tenta com sessão aberta, porque o acesso gruda na conta (§3.3). Sem
   * conta, o caminho é o link embaixo do card, que pede nome e código juntos.
   */
  const quem = await sessao();
  if (quem?.id) {
    const { erro } = await concederAcesso(quem.id, digitado);
    if (!erro) redirect("/painel");
  }

  return `Não encontrei a turma ${digitado}. Confira o código com seu representante.`;
}

export default function Entrar() {
  return (
    <main className={APRESENTACAO ? undefined : "flex min-h-dvh items-center justify-center"}>
      {APRESENTACAO && <Apresentacao />}

      {/* `scroll-mt` deixa o card respirar quando o link do herói ancora aqui. */}
      <section
        id="codigo"
        className={`flex justify-center px-4 scroll-mt-8 ${APRESENTACAO ? "pb-16" : "py-8"}`}
      >
        <div className="w-full max-w-[352px]">
          <div className="rounded-xl border border-line bg-surface px-6 py-7 shadow-float">
            <header className="mb-6 flex flex-col items-center gap-4 text-center">
              {!APRESENTACAO && <Marca destaque className="h-8 w-8 text-ink" />}

              <div className="flex flex-col gap-1.5">
                <h1 className="text-[22px] leading-tight">
                  {APRESENTACAO ? "Entrar na sua turma" : "Seja bem-vindo"}
                </h1>
                <p className="text-body-sm leading-relaxed text-muted">
                  {APRESENTACAO
                    ? "Digite o código que o representante passou."
                    : "Digite o código da sua turma para ver os uniformes."}
                </p>
              </div>
            </header>

            <CampoCodigo acao={procurarTurma} autoFoco={!APRESENTACAO} />
          </div>

          <p className="mt-5 text-center text-caption leading-relaxed text-muted">
            Recebeu um link do representante? Abra por ele, já cai na turma certa.
          </p>

          {/* Quem é da Nova Estampa digita o código da empresa no mesmo campo acima. Este
              link existe para o primeiro acesso, que precisa criar a conta antes. */}
          <p className="mt-2 text-center text-caption text-muted">
            É da Nova Estampa?{" "}
            <Link
              href="/painel/entrar"
              className="font-semibold text-ink-2 underline-offset-2 transition-colors
                duration-fast ease-soft hover:text-ink hover:underline"
            >
              Área da empresa
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
