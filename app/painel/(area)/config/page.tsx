import Link from "next/link";
import { Carteira, Engrenagem, Info, Usuario } from "@/components/icones";
import { Topo } from "@/components/painel";

function Marcador({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex shrink-0 rounded-sm bg-surface-2 px-1.5 py-0.5 text-[11.5px]
        font-semibold leading-[1.4] text-ink-2"
    >
      {children}
    </span>
  );
}

function Linha({
  titulo,
  texto,
  valor,
}: {
  titulo: string;
  texto: string;
  valor: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-5">
      <div className="min-w-0 flex-1">
        <h3 className="text-body-sm font-semibold text-ink">{titulo}</h3>
        <p className="mt-0.5 text-caption text-muted">{texto}</p>
      </div>
      <div className="shrink-0 text-body-sm font-medium text-ink-2">{valor}</div>
    </li>
  );
}

function Secao({
  titulo,
  icone,
  children,
  atraso,
}: {
  titulo: string;
  icone: React.ReactNode;
  children: React.ReactNode;
  atraso: number;
}) {
  return (
    <section
      className="entra overflow-hidden rounded-lg border border-line bg-surface shadow-card"
      style={{ "--atraso": `${atraso}ms` } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="text-muted">{icone}</span>
        <h2 className="text-h3">{titulo}</h2>
      </div>
      <ul className="divide-y divide-line">{children}</ul>
    </section>
  );
}

export default function Configuracoes() {
  return (
    <>
      <Topo
        titulo="Configurações"
        subtitulo="Regras gerais da empresa e controle de acesso ao painel."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Secao titulo="Acesso à empresa" icone={<Usuario className="h-5 w-5" />} atraso={40}>
          <Linha
            titulo="Código da empresa"
            texto="Usado para liberar uma conta nova na área administrativa."
            valor={<Marcador>Troca de código em breve</Marcador>}
          />
          <Linha
            titulo="Contas com acesso"
            texto="O sistema já registra quem entrou. A lista e a revogação vêm na próxima etapa."
            valor={<Marcador>Em planejamento</Marcador>}
          />
        </Secao>

        <Secao titulo="Cobrança" icone={<Carteira className="h-5 w-5" />} atraso={80}>
          <Linha
            titulo="Entrada padrão"
            texto="Percentual inicial usado nas novas campanhas. Cada campanha pode definir o próprio valor."
            valor={<span data-nums>50%</span>}
          />
          <Linha
            titulo="Quitação"
            texto="O aluno pode pagar a entrada ou quitar o pedido inteiro."
            valor="Entrada ou total"
          />
        </Secao>

        <Secao titulo="Operação" icone={<Engrenagem className="h-5 w-5" />} atraso={120}>
          <Linha
            titulo="Produtos"
            texto="O produto pertence à campanha. Preço e grade continuam sendo definidos dentro dela."
            valor={
              <Link href="/painel/produtos" className="rounded-sm font-semibold underline">
                Ver produtos
              </Link>
            }
          />
          <Linha
            titulo="Itens arquivados"
            texto="Clientes saem da rotina sem apagar campanhas, pedidos ou pagamentos."
            valor={
              <Link href="/painel/arquivados" className="rounded-sm font-semibold underline">
                Ver arquivados
              </Link>
            }
          />
        </Secao>

        <Secao titulo="Sobre esta área" icone={<Info className="h-5 w-5" />} atraso={160}>
          <Linha
            titulo="Configurações seguras"
            texto="Só entram aqui controles que valem para toda a Nova Estampa. Regras de uma campanha ficam na própria campanha."
            valor={<Marcador>Estrutura inicial</Marcador>}
          />
          <Linha
            titulo="Relatório financeiro"
            texto="A tela foi reservada no menu e será planejada separadamente."
            valor={
              <Link href="/painel/financeiro" className="rounded-sm font-semibold underline">
                Abrir espaço
              </Link>
            }
          />
        </Secao>
      </div>
    </>
  );
}
