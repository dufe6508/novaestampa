import Link from "next/link";
import { Arquivar } from "@/components/icones";
import { Abas, Busca, Topo, Valor } from "@/components/painel";
import { SeloCampanha } from "@/components/selo";
import {
  data,
  listarClientes,
  listarTodasCampanhas,
  type ClienteResumo,
} from "@/lib/painel";

const TIPO_CLIENTE: Record<ClienteResumo["tipo"], string> = {
  escola: "Escola",
  faculdade: "Faculdade",
  empresa: "Empresa",
  outro: "Outro",
};

function EstadoVazio({ tipo, busca }: { tipo: "clientes" | "campanhas"; busca?: string }) {
  const nome = tipo === "clientes" ? "cliente arquivado" : "campanha encerrada";

  return (
    <div
      role="status"
      className="flex min-h-56 flex-col items-center justify-center gap-2 rounded-lg border
        border-dashed border-line-strong bg-surface px-5 py-10 text-center"
    >
      <Arquivar className="h-8 w-8 text-faint" />
      <h2 className="text-h3">{busca ? `Nenhum ${nome} encontrado` : `Nenhum ${nome}`}</h2>
      <p className="max-w-md text-body-sm text-muted">
        {busca
          ? "Confira a escrita ou limpe a busca para ver todos os registros."
          : tipo === "clientes"
            ? "Clientes arquivados aparecem aqui sem perder campanhas, pedidos ou pagamentos."
            : "Campanhas encerradas e concluídas ficam reunidas aqui para consulta."}
      </p>
      {busca && (
        <Link href={`/painel/arquivados?tipo=${tipo}`} className="mt-2 text-caption font-semibold underline">
          Limpar busca
        </Link>
      )}
    </div>
  );
}

function Clientes({ clientes }: { clientes: ClienteResumo[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {clientes.map((cliente, i) => (
        <li
          key={cliente.id}
          className="entra flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center"
          style={{ "--atraso": `${i * 35}ms` } as React.CSSProperties}
        >
          <div className="min-w-0 flex-1">
            <Link
              href={`/painel/cliente/${cliente.id}`}
              className="rounded-sm text-body-sm font-semibold text-ink hover:text-brand-deep"
            >
              {cliente.nome}
            </Link>
            <p className="mt-0.5 text-caption text-muted">
              {TIPO_CLIENTE[cliente.tipo]}
              {cliente.cidade ? ` · ${cliente.cidade}` : ""}
              {cliente.arquivado_em ? ` · arquivado em ${data(cliente.arquivado_em)}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-caption text-muted">
            <span data-nums>
              {cliente.campanhas} {cliente.campanhas === 1 ? "campanha" : "campanhas"}
            </span>
            <span data-nums>
              {cliente.pedidos} {cliente.pedidos === 1 ? "pedido" : "pedidos"}
            </span>
            <Valor centavos={cliente.recebido_centavos} tom="forte" />
          </div>

          <Link
            href={`/painel?arquivados=1&arquivar=${cliente.id}`}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border
              border-line px-3 text-caption font-semibold text-ink-2 transition-colors
              duration-fast ease-soft hover:border-line-strong hover:text-ink"
          >
            Desarquivar
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function Arquivados({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string }>;
}) {
  const { q, tipo } = await searchParams;
  const secao = tipo === "campanhas" ? "campanhas" : "clientes";
  const busca = q?.trim().toLocaleLowerCase("pt-BR");

  const [clientes, todasCampanhas] = await Promise.all([
    listarClientes(q, "1"),
    listarTodasCampanhas(),
  ]);

  const campanhas = todasCampanhas
    .filter((campanha) => campanha.status === "encerrada" || campanha.status === "concluida")
    .filter((campanha) => {
      if (!busca) return true;
      return `${campanha.nome} ${campanha.cliente_nome}`.toLocaleLowerCase("pt-BR").includes(busca);
    })
    .sort((a, b) => a.cliente_nome.localeCompare(b.cliente_nome) || a.nome.localeCompare(b.nome));

  return (
    <>
      <Topo
        titulo="Arquivados"
        subtitulo="Registros fora da operação diária, preservados para consulta."
      />

      <Abas
        opcoes={[
          {
            texto: "Clientes",
            href: "/painel/arquivados?tipo=clientes",
            ativo: secao === "clientes",
            contagem: clientes.length,
          },
          {
            texto: "Campanhas",
            href: "/painel/arquivados?tipo=campanhas",
            ativo: secao === "campanhas",
            contagem: campanhas.length,
          },
        ]}
        acao={<Busca valor={q} placeholder={`Buscar ${secao}`} escondidos={{ tipo: secao }} />}
      />

      {secao === "clientes" ? (
        clientes.length > 0 ? (
          <Clientes clientes={clientes} />
        ) : (
          <EstadoVazio tipo="clientes" busca={q} />
        )
      ) : campanhas.length > 0 ? (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {campanhas.map((campanha, i) => (
            <li
              key={campanha.id}
              className="entra flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center"
              style={{ "--atraso": `${i * 35}ms` } as React.CSSProperties}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/painel/campanha/${campanha.id}`}
                    className="rounded-sm text-body-sm font-semibold text-ink hover:text-brand-deep"
                  >
                    {campanha.nome}
                  </Link>
                  <SeloCampanha status={campanha.status} />
                </div>
                <p className="mt-0.5 text-caption text-muted">{campanha.cliente_nome}</p>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-caption text-muted">
                <span data-nums>
                  {campanha.grupos} {campanha.grupos === 1 ? campanha.label_grupo.toLowerCase() : campanha.label_grupo_plural.toLowerCase()}
                </span>
                <span data-nums>
                  {campanha.pedidos} {campanha.pedidos === 1 ? "pedido" : "pedidos"}
                </span>
                <Valor centavos={campanha.recebido_centavos} tom="forte" />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EstadoVazio tipo="campanhas" busca={q} />
      )}
    </>
  );
}
