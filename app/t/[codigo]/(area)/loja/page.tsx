import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarTurma, dia, diasAte, listarProdutos } from "@/lib/aluno";
import { imagemUrl, reais } from "@/lib/supabase";
import { Alerta, Vazio } from "@/components/campos";
import { Estampa } from "@/components/estampa";
import { Sacola, Seta } from "@/components/icones";

/**
 * Vitrine · A3.
 *
 * Tem que parecer loja, não formulário: foto grande, preço com peso, e o texto
 * de sistema (prazo) só ganha destaque quando vira urgência de verdade.
 */

export default async function Loja({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const turma = await buscarTurma(codigo);
  if (!turma) notFound();

  const produtos = await listarProdutos(turma.campanha_id);
  const restam = diasAte(turma.prazo_pedidos);
  const fechada = turma.campanha_status !== "aberta" || (restam !== null && restam < 0);
  const urgente = !fechada && restam !== null && restam <= 7;

  return (
    <div className="flex flex-col gap-7">
      {/* Cliente, turma e prazo vivem no cabeçalho e no trilho, não repetidos
          aqui: é contexto de tela inteira, não título de página. */}
      <header className="flex flex-col gap-1.5">
        <h1>Uniformes da {turma.campanha_nome}</h1>
        <p className="text-body-sm text-muted">
          {produtos.length === 0
            ? "Catálogo ainda não publicado."
            : produtos.length === 1
              ? "1 produto disponível, com nome bordado."
              : `${produtos.length} produtos disponíveis, todos com nome bordado.`}
        </p>
      </header>

      {fechada && (
        <Alerta>
          Esta campanha não está mais aceitando pedidos. Se você já pediu, seus pedidos
          continuam em Pedidos e Carteira.
        </Alerta>
      )}

      {urgente && (
        <Alerta tom="atencao">
          {restam === 0
            ? "Hoje é o último dia para pedir."
            : `Faltam ${restam} ${restam === 1 ? "dia" : "dias"} para o prazo de pedidos, ${dia(
                turma.prazo_pedidos,
              )}.`}
        </Alerta>
      )}

      {produtos.length === 0 ? (
        <Vazio
          icone={<Sacola className="h-10 w-10" />}
          titulo="Nada por aqui ainda"
          texto="Os produtos desta campanha ainda não foram publicados. Volte em alguns dias."
        />
      ) : (
        // Duas colunas já no celular. Card de largura inteira com foto 4:5 vira
        // meia tela por produto, e ver a segunda opção exige rolar.
        <ul className="grid grid-cols-2 gap-3 sm:gap-5">
          {produtos.map((p, i) => (
            <li key={p.id} className="entra" style={{ "--atraso": `${i * 60}ms` } as React.CSSProperties}>
              <Link
                href={`/t/${turma.codigo}/loja/${p.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-line
                  bg-surface transition-[box-shadow,transform,border-color] duration-base ease-soft
                  hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift
                  active:scale-[0.99] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
              >
                {/* 4:5 é a proporção das fotos do produto (3:4 e 4:5), então
                    `cover` preenche o card inteiro cortando só a margem branca
                    da foto, não a peça. */}
                <div className="aspect-[4/5] overflow-hidden bg-surface-2">
                  {p.imagens?.[0] ? (
                    <img
                      src={imagemUrl(p.imagens[0])}
                      alt={p.nome}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-slow
                        ease-soft group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
                    />
                  ) : (
                    // Produto sem foto ainda: a ilustração da peça no lugar de um ícone
                    // genérico. É a mesma do preview da estampa, então o vazio continua
                    // parecendo o produto, não um erro de carregamento.
                    <div className="flex h-full items-center justify-center p-8">
                      <Estampa nome="" className="h-full w-auto opacity-60" />
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-3 sm:p-4">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-body-sm font-semibold leading-snug sm:text-h3">
                      {p.nome}
                    </h2>
                    <p className="text-caption text-muted">
                      {p.tipo === "kit" ? "Kit, mais de uma peça" : "Com nome bordado"}
                    </p>
                  </div>

                  <div className="mt-auto flex items-end justify-between gap-2">
                    <div className="flex min-w-0 flex-col">
                      <span
                        data-nums
                        className="text-h3 font-semibold leading-none tracking-tight sm:text-num"
                      >
                        {reais(p.preco_centavos)}
                      </span>
                      {turma.percentual_entrada < 100 && (
                        <span data-nums className="mt-1 truncate text-caption text-muted">
                          {reais(
                            Math.round((p.preco_centavos * turma.percentual_entrada) / 100),
                          )}{" "}
                          agora
                        </span>
                      )}
                    </div>
                    <Seta
                      className="mb-0.5 hidden h-5 w-5 shrink-0 text-faint transition-[transform,color]
                        duration-base ease-soft group-hover:translate-x-0.5 group-hover:text-ink
                        sm:block"
                    />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
