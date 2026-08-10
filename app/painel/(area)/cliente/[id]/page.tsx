import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarCliente, data, listarCampanhas, pct } from "@/lib/painel";
import { Barra, Kpi, Kpis, Topo, Valor } from "@/components/painel";
import { Sacola } from "@/components/icones";
import { Vazio } from "@/components/campos";
import { reais } from "@/lib/formato";

/**
 * E2 · Cliente. A lista de campanhas dele.
 *
 * Tela de passagem: quem chega aqui está indo para uma campanha. Por isso ela
 * é curta e cada campanha mostra só o que decide qual abrir, adesão, quanto
 * falta receber e se o prazo está perto.
 */

const STATUS: Record<string, { texto: string; classe: string }> = {
  rascunho: { texto: "Rascunho", classe: "bg-surface-2 text-muted" },
  aberta: { texto: "Aberta", classe: "bg-success-soft text-success" },
  encerrada: { texto: "Encerrada", classe: "bg-surface-2 text-ink-2" },
  concluida: { texto: "Concluída", classe: "bg-surface-2 text-muted" },
};

export default async function Cliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cliente = await buscarCliente(id);
  if (!cliente) notFound();

  const campanhas = await listarCampanhas(id);

  return (
    <>
      <Topo
        migalha={[{ texto: "Clientes", href: "/painel" }, { texto: cliente.nome }]}
        titulo={cliente.nome}
        subtitulo={
          <>
            {cliente.cidade && <span>{cliente.cidade}</span>}
            {cliente.contato_nome && (
              <span>
                {cliente.cidade ? " · " : ""}
                {cliente.contato_nome}
                {cliente.contato_telefone && (
                  <>
                    {" · "}
                    <a
                      href={`tel:${cliente.contato_telefone.replace(/\D/g, "")}`}
                      className="text-brand-deep underline-offset-2 hover:underline"
                    >
                      {cliente.contato_telefone}
                    </a>
                  </>
                )}
              </span>
            )}
          </>
        }
      />

      <div className="entra" style={{ "--atraso": "40ms" } as React.CSSProperties}>
        <Kpis>
          <Kpi rotulo="Vendido" valor={reais(cliente.vendido_centavos)} />
          <Kpi
            rotulo="Recebido"
            valor={reais(cliente.recebido_centavos)}
            nota={`${pct(cliente.recebido_centavos, cliente.vendido_centavos)}% do vendido`}
          />
          <Kpi rotulo="A receber" valor={reais(cliente.a_receber_centavos)} />
          <Kpi
            rotulo="Em atraso"
            valor={reais(cliente.atrasado_centavos)}
            tom={cliente.atrasado_centavos > 0 ? "alerta" : "normal"}
            nota={cliente.atrasado_centavos > 0 ? "venceu e não foi pago" : "nada vencido"}
          />
        </Kpis>
      </div>

      {campanhas.length === 0 ? (
        <Vazio
          icone={<Sacola className="h-8 w-8" />}
          titulo="Nenhuma campanha ainda"
          texto="A campanha é onde tudo acontece: produtos, preços, prazos e turmas."
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {campanhas.map((c, i) => {
            const marca = STATUS[c.status] ?? STATUS.rascunho;
            return (
              <li
                key={c.id}
                className="entra"
                style={{ "--atraso": `${80 + i * 40}ms` } as React.CSSProperties}
              >
                <Link
                  href={`/painel/campanha/${c.id}`}
                  className="flex h-full flex-col gap-4 rounded-lg border border-line bg-surface p-4
                    shadow-card transition-[border-color,box-shadow] duration-base ease-soft
                    hover:border-line-strong hover:shadow-lift"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <h2 className="truncate text-h3">{c.nome}</h2>
                      <p data-nums className="text-caption text-muted">
                        {c.grupos} {c.grupos === 1 ? c.label_grupo : c.label_grupo_plural} ·{" "}
                        {c.pedidos} {c.pedidos === 1 ? "pedido" : "pedidos"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-caption font-semibold
                        ${marca.classe}`}
                    >
                      {marca.texto}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-caption">
                      <span className="text-muted">Pedidos quitados</span>
                      <span data-nums className="font-semibold text-ink">
                        {c.pedidos_pagos} de {c.pedidos} ·{" "}
                        {pct(c.pedidos_pagos, c.pedidos)}%
                      </span>
                    </div>
                    <Barra parte={c.pedidos_pagos} total={c.pedidos} />
                  </div>

                  <dl className="mt-auto grid grid-cols-3 gap-x-3 border-t border-line pt-3">
                    <div className="flex flex-col">
                      <dt className="label text-muted">Recebido</dt>
                      <dd className="text-body-sm">
                        <Valor centavos={c.recebido_centavos} tom="forte" />
                      </dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="label text-muted">A receber</dt>
                      <dd className="text-body-sm">
                        <Valor centavos={c.a_receber_centavos} />
                      </dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="label text-muted">Pedidos até</dt>
                      <dd data-nums className="text-body-sm text-ink-2">
                        {data(c.prazo_pedidos) ?? "sem data"}
                      </dd>
                    </div>
                  </dl>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
