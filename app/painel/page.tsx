import Link from "next/link";
import { Logo } from "@/components/logo";
import { Gestao, Voltar } from "@/components/icones";

/**
 * Área de gestão · ainda não construída.
 *
 * Esta página existe para a aba não levar a lugar nenhum. O painel de verdade
 * é a próxima etapa (CLAUDE.md §4.2, telas E1 a E9), e ele precisa de duas
 * coisas que ainda não estão de pé: a `SUPABASE_SERVICE_ROLE_KEY`, porque o
 * painel lê pedido e pagamento, e a porta de entrada por código, que é o que separa aluno de gestão.
 */

const TELAS = [
  { nome: "Clientes", texto: "Grade de cards com busca. É a home da empresa" },
  { nome: "Campanha", texto: "Adesão, financeiro e alertas por turma" },
  { nome: "Turma", texto: "Abas Pedidos e Produção, com exportação" },
  { nome: "Pedido", texto: "Detalhe, registrar pagamento, liberar produção" },
  { nome: "Produtos", texto: "Cadastro com fotos e montagem de kit" },
  { nome: "Configurações", texto: "Código de acesso da empresa e contas com acesso" },
];

export default function Painel() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-7 px-4 py-10">
      <header className="entra flex flex-col gap-4">
        <Logo destaque />
        <div className="flex flex-col gap-1.5">
          <h1>Gestão</h1>
          <p className="max-w-[60ch] text-body-sm leading-relaxed text-muted">
            Área de quem administra a campanha: Nova Estampa, comissão de formatura e
            representante de turma. Ainda não foi construída. A área do aluno veio primeiro
            porque é ela que faz o dinheiro entrar, e o painel depende dos pedidos que ela
            gera.
          </p>
        </div>
      </header>

      <section
        className="entra overflow-hidden rounded-xl border border-line bg-surface"
        style={{ "--atraso": "60ms" } as React.CSSProperties}
      >
        <h2 className="flex items-center gap-2 border-b border-line px-5 py-3 text-h3">
          <Gestao className="h-5 w-5 text-muted" />O que vem aqui
        </h2>
        <ul className="divide-y divide-line">
          {TELAS.map((t) => (
            <li key={t.nome} className="flex flex-col gap-0.5 px-5 py-3">
              <p className="text-body-sm font-semibold">{t.nome}</p>
              <p className="text-caption leading-relaxed text-muted">{t.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      <p
        className="entra rounded-lg bg-warning-soft px-4 py-3 text-caption leading-relaxed
          text-warning"
        style={{ "--atraso": "120ms" } as React.CSSProperties}
      >
        No protótipo, quem chega aqui tem acesso total, sem distinção. Os níveis de
        permissão de verdade ficam para depois da reunião, junto da autenticação definitiva:
        admin da Nova Estampa vê tudo; comissão e representante veem a própria turma, para
        cobrar, sem editar pedido nem baixar pagamento.
      </p>

      <Link
        href="/entrar"
        className="inline-flex w-fit items-center gap-1.5 text-caption font-semibold text-ink-2
          transition-colors duration-fast ease-soft hover:text-ink"
      >
        <Voltar className="h-4 w-4" />
        Voltar para a área do aluno
      </Link>
    </main>
  );
}
