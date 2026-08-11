"use client";

import { useRef, useState } from "react";
import { imagemUrl } from "@/lib/supabase";
import { Mais, X } from "./icones";

/**
 * Galeria do produto, no cadastro. Comprime no aparelho antes de subir.
 *
 * A compressão é o ponto todo. Quem cadastra produto sobe do celular, no 4G da
 * escola, e sete fotos de 3 MB fazem a pessoa desistir. Redimensionar para
 * 1600 px e converter para webp levou as fotos da polo de 13,8 MB para 0,68 MB
 * sem perda visível, e só então elas sobem.
 *
 * A primeira foto é a capa: é ela que aparece na vitrine e no cartão do pedido.
 * Trocar a capa é mover a foto para o começo da lista, com um botão, e não
 * arrastando: arrastar exigiria biblioteca e funciona mal no celular, que é
 * exatamente o aparelho de quem cadastra.
 *
 * O que o formulário envia é um campo escondido com a lista de caminhos. As
 * fotos já estão no bucket quando isso acontece, então salvar é gravar texto.
 */

const LARGURA = 1600;

/** Redimensiona e converte para webp. Devolve o arquivo original se não der. */
async function comprimir(arquivo: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, LARGURA / bitmap.width);
    const largura = Math.round(bitmap.width * escala);
    const altura = Math.round(bitmap.height * escala);

    const tela = document.createElement("canvas");
    tela.width = largura;
    tela.height = altura;
    tela.getContext("2d")?.drawImage(bitmap, 0, 0, largura, altura);
    bitmap.close();

    const blob = await new Promise<Blob | null>((ok) =>
      tela.toBlob(ok, "image/webp", 0.8),
    );
    if (!blob) return arquivo;

    return new File([blob], "foto.webp", { type: "image/webp" });
  } catch {
    // HEIC do iPhone e formato exótico caem aqui. O servidor recusa o que não
    // for imagem, então o pior caso é uma mensagem, não um arquivo estranho.
    return arquivo;
  }
}

export function FotosProduto({
  campanhaId,
  iniciais,
}: {
  campanhaId: string;
  iniciais: string[];
}) {
  const [fotos, setFotos] = useState<string[]>(iniciais);
  const [subindo, setSubindo] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const escolher = useRef<HTMLInputElement>(null);

  async function receber(lista: FileList | null) {
    if (!lista?.length) return;
    setErro(null);
    setSubindo((n) => n + lista.length);

    for (const arquivo of Array.from(lista)) {
      try {
        const dados = new FormData();
        dados.set("campanha_id", campanhaId);
        dados.set("arquivo", await comprimir(arquivo));

        const resposta = await fetch("/painel/foto", { method: "POST", body: dados });
        const corpo = await resposta.json();

        if (!resposta.ok) setErro(corpo.erro ?? "Não consegui subir a foto.");
        else setFotos((atuais) => [...atuais, corpo.caminho]);
      } catch {
        setErro("A foto não subiu. Confira a conexão e tente de novo.");
      } finally {
        setSubindo((n) => n - 1);
      }
    }

    if (escolher.current) escolher.current.value = "";
  }

  const virarCapa = (caminho: string) =>
    setFotos((atuais) => [caminho, ...atuais.filter((c) => c !== caminho)]);

  const remover = (caminho: string) =>
    setFotos((atuais) => atuais.filter((c) => c !== caminho));

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="imagens" value={JSON.stringify(fotos)} />

      <p className="text-caption font-semibold text-ink-2">Fotos</p>

      <ul className="grid grid-cols-3 gap-2">
        {fotos.map((caminho, i) => (
          <li
            key={caminho}
            className="group relative aspect-[4/5] overflow-hidden rounded-lg border
              border-line bg-surface-2"
          >
            <img
              src={imagemUrl(caminho)}
              alt=""
              className="h-full w-full object-cover"
            />

            {i === 0 ? (
              <span
                className="absolute left-1 top-1 rounded bg-ink px-1.5 py-0.5 text-caption
                  font-semibold text-white"
              >
                Capa
              </span>
            ) : (
              <button
                type="button"
                onClick={() => virarCapa(caminho)}
                className="absolute inset-x-1 bottom-1 rounded bg-surface/90 py-1 text-caption
                  font-semibold text-ink opacity-0 transition-opacity duration-fast ease-soft
                  focus-visible:opacity-100 group-hover:opacity-100"
              >
                Usar como capa
              </button>
            )}

            <button
              type="button"
              onClick={() => remover(caminho)}
              aria-label="Remover esta foto"
              className="absolute right-1 top-1 flex size-6 items-center justify-center rounded
                bg-surface/90 text-ink-2 transition-colors duration-fast ease-soft
                hover:bg-surface hover:text-danger"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}

        {Array.from({ length: subindo }, (_, i) => (
          <li
            key={`subindo-${i}`}
            className="flex aspect-[4/5] animate-pulse items-center justify-center rounded-lg
              border border-dashed border-line-strong bg-surface-2 text-caption text-muted"
          >
            Subindo…
          </li>
        ))}

        <li>
          <button
            type="button"
            onClick={() => escolher.current?.click()}
            className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-1
              rounded-lg border border-dashed border-line-strong bg-surface text-caption
              font-semibold text-ink-2 transition-colors duration-fast ease-soft
              hover:border-ink hover:text-ink focus-visible:outline focus-visible:outline-2
              focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
          >
            <Mais className="h-5 w-5" />
            Adicionar
          </button>
        </li>
      </ul>

      <input
        ref={escolher}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => receber(e.target.files)}
        className="sr-only"
      />

      {erro && (
        <p role="alert" className="text-caption text-danger">
          {erro}
        </p>
      )}
    </div>
  );
}
