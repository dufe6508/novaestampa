import { notFound, redirect } from "next/navigation";
import { buscarTurma, entrar, meusPedidos, totalEmAberto } from "@/lib/aluno";
import { abrirSessao, sessao } from "@/lib/sessao";
import { mascaraTelefone, nomeCompletoValido, telefoneValido } from "@/lib/formato";
import { Marca } from "@/components/logo";
import { FormEntrar } from "./form-entrar";

/**
 * Login do aluno · A2.
 *
 * Vem depois da confirmação de turma e antes da vitrine, por decisão do
 * usuário: ele preferiu identificar antes de mostrar preço a deixar o login
 * só no checkout.
 *
 * PROVISÓRIO. Google e senha entram com a auth definitiva (CLAUDE.md §3.3).
 * Aqui a conta é achada pelo e-mail, e o cookie guarda o perfil.
 */

export default async function EntrarNaTurma({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const turma = await buscarTurma(codigo);
  if (!turma) notFound();

  // Quem já tem sessão não vê tela de login de novo.
  const atual = await sessao();
  if (atual) redirect(await destino(atual.id, turma.codigo));

  async function acao(_estado: string | null, dados: FormData) {
    "use server";

    const nome = String(dados.get("nome") ?? "").trim();
    const email = String(dados.get("email") ?? "").trim();
    const telefone = String(dados.get("telefone") ?? "").trim();

    if (!nomeCompletoValido(nome)) return "Digite seu nome e o sobrenome.";
    if (!email.includes("@")) return "Digite um e-mail válido, com @.";
    if (telefone && !telefoneValido(telefone))
      return "Digite o telefone com DDD, como em (31) 999848388.";

    const r = await entrar(nome, email, telefone ? mascaraTelefone(telefone) : null);
    if (r.erro) return r.erro;

    await abrirSessao({ id: r.perfilId!, nome });
    redirect(await destino(r.perfilId!, turma!.codigo));
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-[352px]">
        <section className="rounded-xl border border-line bg-surface px-6 py-7 shadow-float">
          <header className="mb-6 flex flex-col items-center gap-4 text-center">
            <Marca destaque className="h-8 w-8 text-ink" />
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[22px] leading-tight">Seus dados</h1>
              <p className="text-body-sm leading-relaxed text-muted">
                {turma.grupo_nome} · {turma.campanha_nome}
              </p>
            </div>
          </header>

          <FormEntrar acao={acao} />
        </section>

        <p className="mt-5 text-center text-caption leading-relaxed text-muted">
          Use o mesmo e-mail sempre. É por ele que você volta para pagar e acompanhar.
        </p>
      </div>
    </main>
  );
}

/**
 * Quem deve, cai na Carteira. Quem está quitado, cai na Loja.
 * O aluno que volta, volta para pagar, e é isso que o projeto quer resolver.
 */
async function destino(perfilId: string, codigo: string) {
  const pedidos = await meusPedidos(perfilId, codigo);
  const rota = totalEmAberto(pedidos) > 0 ? "carteira" : "loja";
  return `/t/${codigo}/${rota}`;
}
