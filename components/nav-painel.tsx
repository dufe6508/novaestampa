"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Arquivar, Camiseta, Empresa, Engrenagem, Grafico } from "./icones";

/**
 * Navegação da área da empresa. A mesma lista serve o trilho do desktop e o
 * menu do celular.
 *
 * É a única ilha de cliente do layout, e existe por um motivo só: marcar onde a
 * pessoa está. Sem isso o trilho vira uma lista de links iguais e ninguém sabe
 * qual tela está aberta. O resto do layout continua sendo servidor.
 *
 * O que está aqui e o que não está:
 *
 * · **Clientes** é a home, e continua sendo o caminho para campanha e turma.
 *   Campanha e turma não viram item de menu: elas pertencem a um cliente, e
 *   listá-las soltas aqui desfaria a hierarquia que a §4.2 desenhou.
 * · **Financeiro** é a tela grande do relatório, ainda em planejamento. A aba
 *   existe antes da tela de propósito: é o lugar dela no mapa.
 * · **Produtos** é leitura entre campanhas. O cadastro continua dentro da
 *   campanha, porque é lá que o produto existe (§3.2.1).
 * · **Arquivados** junta o que saiu de circulação sem ser apagado: cliente
 *   arquivado e campanha encerrada.
 * · **Configurações** fica embaixo, separada por uma linha. Não é operação,
 *   é a manutenção do sistema, e quem entra aqui todo dia nunca clica nela.
 */

const ITENS = [
  { href: "/painel", texto: "Clientes", Icone: Empresa, exato: true },
  { href: "/painel/financeiro", texto: "Financeiro", Icone: Grafico },
  { href: "/painel/produtos", texto: "Produtos", Icone: Camiseta },
  { href: "/painel/arquivados", texto: "Arquivados", Icone: Arquivar },
];

const CONFIG = { href: "/painel/config", texto: "Configurações", Icone: Engrenagem };

type Item = { href: string; texto: string; Icone: (p: { className?: string }) => React.ReactElement; exato?: boolean };

function Linha({ item, atual }: { item: Item; atual: string }) {
  // `/painel` é prefixo de todas as outras rotas, então a home compara exato.
  // Sem isso o trilho acenderia Clientes em qualquer tela do painel.
  const ativo = item.exato ? atual === item.href : atual.startsWith(item.href);

  return (
    <li>
      <Link
        href={item.href}
        aria-current={ativo ? "page" : undefined}
        className={`group flex items-center gap-3 rounded-md px-3 py-2 text-body-sm
          transition-colors duration-fast ease-soft
          ${
            ativo
              ? "bg-surface-2 font-semibold text-ink"
              : "font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
          }`}
      >
        <item.Icone
          className={`h-[18px] w-[18px] ${ativo ? "text-ink" : "text-muted group-hover:text-ink-2"}`}
        />
        {item.texto}
      </Link>
    </li>
  );
}

export function NavPainel() {
  const atual = usePathname();

  return (
    <nav aria-label="Navegação da gestão">
      <ul className="flex flex-col gap-0.5">
        {ITENS.map((item) => (
          <Linha key={item.href} item={item} atual={atual} />
        ))}
      </ul>
      <ul className="mt-2 flex flex-col gap-0.5 border-t border-line pt-2">
        <Linha item={CONFIG} atual={atual} />
      </ul>
    </nav>
  );
}
