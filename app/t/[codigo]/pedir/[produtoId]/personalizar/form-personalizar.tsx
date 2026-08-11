"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alerta, Botao, Campo, Tamanhos } from "@/components/campos";
import { Estampa } from "@/components/estampa";
import { capitalizarNome, tamanhoLegivel } from "@/lib/formato";

/**
 * Tamanho e nome do bordado.
 *
 * O nome é digitado duas vezes, como senha. É a defesa contra o erro mais
 * barato de evitar e mais caro de descobrir: a peça já bordada com o nome
 * errado. Colar é bloqueado no segundo campo, senão a conferência não confere
 * nada.
 *
 * Normalização: `trim`, colapso de espaço duplo e inicial maiúscula. Nada de
 * caixa alta automática, a peça real sai "Fernandes", não "FERNANDES", e
 * forçar maiúscula entregaria peça diferente da que o aluno viu na tela. Subir
 * só a inicial arruma "fernandes" digitado no celular sem esse efeito, e o
 * preview mostra o resultado enquanto ele digita.
 */

type Peca = { produtoId: string; nome: string; tamanhos: string[] };
type Prefill = { tamanho?: string; nome: string };

const limpar = capitalizarNome;

export function FormPersonalizar({
  codigo,
  produtoId,
  maxCaracteres,
  exigeNome = true,
  pecas,
  prefill,
  foco,
}: {
  codigo: string;
  produtoId: string;
  maxCaracteres: number;
  /** Falso é o moletom: a peça sai sem bordado e a tela vira só tamanho. */
  exigeNome?: boolean;
  pecas: Peca[];
  prefill: Prefill[];
  foco?: "nome" | "tamanho";
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);

  const [nome, setNome] = useState(prefill[0]?.nome ?? "");
  // Voltando para conferir, o nome já foi digitado duas vezes uma vez.
  const [confirma, setConfirma] = useState(prefill[0]?.nome ?? "");
  const [extras, setExtras] = useState<Record<number, string>>({});
  const [tamanhos, setTamanhos] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      prefill.flatMap((p, i) => (p.tamanho ? [[i, p.tamanho] as const] : [])),
    ),
  );
  const [erro, setErro] = useState<string | null>(null);
  const [indo, setIndo] = useState(false);

  useEffect(() => {
    if (foco === "nome") document.getElementById("nome")?.focus();
  }, [foco]);

  const nomes = useMemo(
    () => pecas.map((_, i) => limpar(extras[i] ?? nome)),
    [pecas, extras, nome],
  );

  const preenchido = !exigeNome || limpar(nome).length > 0;
  const confere = !exigeNome || limpar(nome) === limpar(confirma);
  const completo = pecas.every((_, i) => tamanhos[i]);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const dados = new FormData(e.currentTarget);
    const escolhidos = pecas.map((_, i) => String(dados.get(`t${i}`) ?? ""));

    if (escolhidos.some((t) => !t)) return setErro("Escolha um tamanho para continuar.");
    if (!preenchido) return setErro("Digite o nome que vai na peça.");
    if (!confere) return setErro("Os dois nomes estão diferentes. Confira a digitação.");
    if (exigeNome && nomes.some((n) => n.length === 0))
      return setErro("Uma das peças ficou sem nome.");

    setErro(null);
    setIndo(true);

    const q = new URLSearchParams();
    pecas.forEach((_, i) => {
      q.append("t", escolhidos[i]);
      q.append("n", nomes[i]);
    });
    router.push(`/t/${codigo}/pedir/${produtoId}/revisao?${q}`);
  }

  return (
    <form
      ref={form}
      onSubmit={enviar}
      onChange={(e) => {
        // Espelha o tamanho escolhido para o preview, sem controlar cada rádio.
        const alvo = e.target as unknown as HTMLInputElement;
        if (alvo.type === "radio" && alvo.name.startsWith("t")) {
          setTamanhos((v) => ({ ...v, [Number(alvo.name.slice(1))]: alvo.value }));
        }
      }}
      className="flex flex-col gap-6"
    >
      {pecas.map((p, i) => (
        <div key={`${p.produtoId}-${i}`} className="flex flex-col gap-2">
          {pecas.length > 1 && (
            <p className="text-body-sm font-semibold text-ink">{p.nome}</p>
          )}
          <Tamanhos nome={`t${i}`} opcoes={p.tamanhos} padrao={prefill[i]?.tamanho} />
        </div>
      ))}

      {/* Peça sem bordado pula os dois campos e o preview: eles existem só para
          conferir letra, e não há letra nenhuma para conferir. */}
      {exigeNome && (
      <div className="flex flex-col gap-4 border-t border-line pt-6">
        <Campo
          id="nome"
          etiqueta="Nome da estampa"
          value={nome}
          onChange={(e) => setNome(e.target.value.slice(0, maxCaracteres))}
          placeholder="Nome que vai bordado"
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          ajuda="Escreva exatamente como quer que fique bordado."
        />

        <Campo
          id="confirma"
          etiqueta="Digite o nome outra vez"
          value={confirma}
          onChange={(e) => setConfirma(e.target.value.slice(0, maxCaracteres))}
          onPaste={(e) => e.preventDefault()}
          placeholder="Digite o mesmo nome"
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          erro={confirma.length > 0 && !confere ? "Os dois nomes estão diferentes." : undefined}
        />
      </div>
      )}

      {exigeNome && (
      <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
        <p className="label text-muted">Como vai ficar</p>

        <div className={pecas.length > 1 ? "grid grid-cols-2 gap-4" : ""}>
          {pecas.map((p, i) => (
            <div key={`${p.produtoId}-${i}`} className="flex flex-col items-center gap-2">
              <Estampa nome={nomes[i]} className="w-full max-w-[180px]" />
              <p className="text-caption text-muted">
                {pecas.length > 1 && `${p.nome} · `}
                {tamanhos[i] ? `Tamanho ${tamanhoLegivel(tamanhos[i])}` : "Escolha o tamanho"}
              </p>

              {pecas.length > 1 &&
                (extras[i] === undefined ? (
                  <button
                    type="button"
                    onClick={() => setExtras((v) => ({ ...v, [i]: "" }))}
                    className="text-caption font-semibold text-ink-2 underline underline-offset-2
                      transition-colors duration-fast ease-soft hover:text-ink"
                  >
                    Usar outro nome nesta peça
                  </button>
                ) : (
                  <input
                    value={extras[i] ?? ""}
                    onChange={(e) =>
                      setExtras((v) => ({ ...v, [i]: e.target.value.slice(0, maxCaracteres) }))
                    }
                    placeholder="Nome só desta peça"
                    className="h-9 w-full rounded-md border border-line bg-surface px-2.5
                      text-center text-body-sm outline-none
                      transition-[border-color] duration-base ease-soft focus:border-brand-deep"
                  />
                ))}
            </div>
          ))}
        </div>
      </section>
      )}

      {erro && <Alerta tom="erro">{erro}</Alerta>}

      <Botao type="submit" disabled={indo || !preenchido || !confere || !completo}>
        {indo ? "Abrindo…" : "Revisar pedido"}
      </Botao>
    </form>
  );
}
