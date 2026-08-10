import Link from "next/link";
import { listarClientes, pct, reais } from "@/lib/painel";
import { Barra, Busca, Topo, Valor } from "@/components/painel";
import { Empresa } from "@/components/icones";
import { Vazio } from "@/components/campos";

/**
 * E1 · Clientes. Home da gestão.
 *
 * Cada card responde três coisas na ordem em que a pessoa pergunta: quem é,
 * quanto já entrou, e tem alguma coisa vencida. O valor em atraso é o único
 * número colorido do card, porque é o único que exige ação hoje.
 */

const TIPO: Record<string, string> = {
  escola: "Escola",
  faculdade: "Faculdade",
  empresa: "Empresa",
  outro: "Cliente",
};

export default async function Clientes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const clientes = await listarClientes(q);

  return (
    <>
      <Topo
        titulo="Clientes"
        subtitulo={
          clientes.length > 0
            ? `${clientes.length} ${clientes.length === 1 ? "cliente" : "clientes"}${
                q ? ` para "${q}"` : ""
              }`
            : undefined
        }
        acoes={<Busca valor={q} placeholder="Buscar cliente" />}
      />

      {clientes.length === 0 ? (
        <Vazio
          icone={<Empresa className="h-8 w-8" />}
          titulo={q ? "Nenhum cliente com esse nome" : "Nenhum cliente ainda"}
          texto={
            q
              ? "Confira a escrita ou limpe a busca para ver todos."
              : "Cadastre a escola, faculdade ou empresa e depois crie a campanha dela."
          }
          acao={
            q ? (
              <Link href="/painel" className="text-caption font-semibold text-ink underline">
                Limpar busca
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {clientes.map((c, i) => (
            <li
              key={c.id}
              className="entra"
              style={{ "--atraso": `${i * 40}ms` } as React.CSSProperties}
            >
              <Link
                href={`/painel/cliente/${c.id}`}
                className="flex h-full flex-col gap-4 rounded-lg border border-line bg-surface p-4
                  shadow-card transition-[border-color,box-shadow] duration-base ease-soft
                  hover:border-line-strong hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <h2 className="truncate text-h3">{c.nome}</h2>
                    <p className="text-caption text-muted">
                      {TIPO[c.tipo] ?? "Cliente"}
                      {c.cidade ? ` · ${c.cidade}` : ""}
                    </p>
                  </div>
                  <span
                    data-nums
                    className="shrink-0 rounded-sm bg-surface-2 px-2 py-1 text-caption
                      font-semibold text-ink-2"
                  >
                    {c.campanhas} {c.campanhas === 1 ? "campanha" : "campanhas"}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-caption">
                    <span className="text-muted">
                      Recebido de <Valor centavos={c.vendido_centavos} />
                    </span>
                    <span data-nums className="font-semibold text-ink">
                      {pct(c.recebido_centavos, c.vendido_centavos)}%
                    </span>
                  </div>
                  <Barra parte={c.recebido_centavos} total={c.vendido_centavos} />
                </div>

                <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1 border-t border-line pt-3">
                  <div className="flex flex-col">
                    <dt className="label text-muted">Recebido</dt>
                    <dd className="text-body-sm">
                      <Valor centavos={c.recebido_centavos} tom="forte" />
                    </dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="label text-muted">Em atraso</dt>
                    <dd className="text-body-sm">
                      {c.atrasado_centavos > 0 ? (
                        <Valor centavos={c.atrasado_centavos} tom="alerta" />
                      ) : (
                        <span data-nums className="text-muted">
                          {reais(0)}
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
