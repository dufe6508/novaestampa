import Link from "next/link";
import { notFound } from "next/navigation";
import {
  buscarCliente,
  data,
  listarCampanhas,
  pct,
  type CampanhaResumo,
} from "@/lib/painel";
import { excluirCampanha } from "@/app/painel/acoes";
import { Barra, Kpi, Kpis, Topo, Valor } from "@/components/painel";
import { Lapis, Lixeira, Mais, Sacola } from "@/components/icones";
import { SeloCampanha } from "@/components/selo";
import { Vazio } from "@/components/campos";
import { CampanhaGaveta } from "@/components/campanha-gaveta";
import { Confirmar } from "@/components/confirmar";
import { ItemMenu, MenuAcoes } from "@/components/menu-acoes";
import { reais } from "@/lib/formato";

/**
 * E2 · Cliente. A lista de campanhas dele.
 *
 * Tela de passagem: quem chega aqui está indo para uma campanha. Por isso ela
 * é curta e cada campanha mostra só o que decide qual abrir, quitação, quanto
 * falta receber e se o prazo está perto.
 *
 * O cartão da campanha segue a mesma anatomia do cartão de cliente na home: o
 * nome é o link esticado, e lápis e menu ficam acima dessa camada. Link dentro
 * de link é HTML inválido.
 */

function CartaoCampanha({
  campanha,
  atraso,
  editar,
  excluir,
}: {
  campanha: CampanhaResumo;
  atraso: number;
  editar: string;
  excluir: string;
}) {
  return (
    <li
      className="entra group relative flex flex-col gap-4 rounded-lg border border-line
        bg-surface p-4 transition-colors duration-base ease-soft focus-within:border-ink-2
        hover:border-ink-2 has-[details[open]]:z-30"
      style={{ "--atraso": `${atraso}ms` } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="truncate text-h3">
            <Link
              href={`/painel/campanha/${campanha.id}`}
              className="rounded-sm after:absolute after:inset-0 after:content-['']
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                focus-visible:outline-brand-deep"
            >
              {campanha.nome}
            </Link>
          </h2>
          <p data-nums className="text-caption text-muted">
            {campanha.grupos}{" "}
            {campanha.grupos === 1 ? campanha.label_grupo : campanha.label_grupo_plural} ·{" "}
            {campanha.pedidos} {campanha.pedidos === 1 ? "Pedido" : "Pedidos"}
          </p>
        </div>

        <div className="relative z-10 -mr-1.5 -mt-1.5 flex shrink-0 items-center gap-1">
          <SeloCampanha status={campanha.status} />

          <Link
            href={editar}
            scroll={false}
            aria-label={`Editar ${campanha.nome}`}
            className="flex size-9 items-center justify-center rounded-md border
              border-line-strong bg-surface text-ink-2 transition-colors duration-fast ease-soft
              hover:border-ink hover:bg-surface-2 hover:text-ink focus-visible:outline
              focus-visible:outline-2 focus-visible:outline-offset-2
              focus-visible:outline-brand-deep"
          >
            <Lapis className="h-4 w-4" />
          </Link>

          <MenuAcoes rotulo={`Mais ações de ${campanha.nome}`}>
            <ItemMenu href={editar} icone={<Lapis className="h-4 w-4" />}>
              Editar campanha
            </ItemMenu>
            <ItemMenu href={excluir} icone={<Lixeira className="h-4 w-4" />} tom="perigo">
              Excluir campanha
            </ItemMenu>
          </MenuAcoes>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3 text-caption">
          <span className="text-muted">Pedidos quitados</span>
          <span data-nums className="font-semibold text-ink">
            {campanha.pedidos_pagos} de {campanha.pedidos} ·{" "}
            {pct(campanha.pedidos_pagos, campanha.pedidos)}%
          </span>
        </div>
        <Barra parte={campanha.pedidos_pagos} total={campanha.pedidos} />
      </div>

      <dl className="mt-auto grid grid-cols-3 gap-x-3 border-t border-line pt-3">
        <div className="flex flex-col">
          <dt className="label text-muted">Recebido</dt>
          <dd className="text-body-sm">
            <Valor centavos={campanha.recebido_centavos} tom="forte" />
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="label text-muted">A receber</dt>
          <dd className="text-body-sm">
            <Valor centavos={campanha.a_receber_centavos} />
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="label text-muted">Pedidos até</dt>
          <dd data-nums className="text-body-sm text-ink-2">
            {data(campanha.prazo_pedidos) ?? "Sem data"}
          </dd>
        </div>
      </dl>
    </li>
  );
}

export default async function Cliente({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nova?: string; editar?: string; excluir?: string }>;
}) {
  const { id } = await params;
  const { nova, editar, excluir } = await searchParams;

  const cliente = await buscarCliente(id);
  if (!cliente) notFound();

  const campanhas = await listarCampanhas(id);
  const alvo = editar || excluir;
  const emFoco = alvo ? campanhas.find((c) => c.id === alvo) : undefined;

  const base = `/painel/cliente/${id}`;

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
        acoes={
          <Link
            href={`${base}?nova=1`}
            scroll={false}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-ink px-3.5
              text-body-sm font-semibold text-white transition-[opacity,transform] duration-fast
              ease-soft hover:opacity-90 active:scale-[0.985] motion-reduce:active:scale-100"
          >
            <Mais className="h-4 w-4" />
            Nova campanha
          </Link>
        }
      />

      <div className="entra" style={{ "--atraso": "40ms" } as React.CSSProperties}>
        <Kpis>
          <Kpi rotulo="Vendido" valor={reais(cliente.vendido_centavos)} />
          <Kpi
            rotulo="Recebido"
            valor={reais(cliente.recebido_centavos)}
            nota={`${pct(cliente.recebido_centavos, cliente.vendido_centavos)}% Do vendido`}
          />
          <Kpi rotulo="A receber" valor={reais(cliente.a_receber_centavos)} />
          <Kpi
            rotulo="Em atraso"
            valor={reais(cliente.atrasado_centavos)}
            tom={cliente.atrasado_centavos > 0 ? "alerta" : "normal"}
            nota={cliente.atrasado_centavos > 0 ? "Venceu e não foi pago" : "Nada vencido"}
          />
        </Kpis>
      </div>

      {campanhas.length === 0 ? (
        <Vazio
          icone={<Sacola className="h-8 w-8" />}
          titulo="Nenhuma campanha ainda"
          texto="A campanha é onde tudo acontece: produtos, preços, prazos e turmas."
          acao={
            <Link
              href={`${base}?nova=1`}
              scroll={false}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-3.5 text-body-sm
                font-semibold text-white transition-opacity duration-fast ease-soft
                hover:opacity-90"
            >
              <Mais className="h-4 w-4" />
              Criar campanha
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {campanhas.map((c, i) => (
            <CartaoCampanha
              key={c.id}
              campanha={c}
              atraso={80 + i * 40}
              editar={`${base}?editar=${c.id}`}
              excluir={`${base}?excluir=${c.id}`}
            />
          ))}
        </ul>
      )}

      {nova && !alvo && <CampanhaGaveta clienteId={id} fechar={base} />}
      {editar && emFoco && <CampanhaGaveta campanha={emFoco} fechar={base} />}

      {excluir && emFoco && (
        <Confirmar
          titulo="Excluir campanha"
          subtitulo={emFoco.nome}
          consequencia={
            <>
              Apaga a campanha, as {emFoco.label_grupo_plural.toLowerCase()} e os produtos
              dela. Não tem como desfazer. Campanha com pedido não pode ser excluída.
            </>
          }
          acao={excluirCampanha}
          botao="Excluir para sempre"
          pendenteTexto="Excluindo…"
          ocultos={{ campanha_id: emFoco.id, voltar: base }}
          fechar={base}
        />
      )}
    </>
  );
}
