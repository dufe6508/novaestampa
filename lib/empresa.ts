import { cache } from "react";
import { notFound } from "next/navigation";
import { db, mensagem } from "./supabase";
import { sessao } from "./sessao";

/**
 * Quem pode entrar na área da empresa.
 *
 * Três níveis, e a diferença entre eles é o escopo do que enxergam:
 *
 * · Empresa, tudo. Todos os clientes, todas as campanhas, todas as turmas.
 * · Representante, a turma pela qual entrou, e só ela. Entra por
 *   `/t/[codigo]/gestao`, que não passa por aqui.
 * · Aluno, nada disso.
 *
 * O acesso gruda na conta, não no código: `perfil.tipo` vira 'empresa' e fica.
 * Trocar o código depois invalida só para quem ainda não entrou, senão
 * rotacionar expulsaria a própria dona e ninguém rotacionaria nunca
 * (CLAUDE.md §3.3).
 */

export type PerfilEmpresa = { id: string; nome: string };

export const perfilEmpresa = cache(async (): Promise<PerfilEmpresa | null> => {
  const s = await sessao();
  if (!s?.id) return null;

  const { data } = await db()
    .from("perfil")
    .select("id,nome,tipo")
    .eq("id", s.id)
    .maybeSingle<{ id: string; nome: string; tipo: string }>();

  return data?.tipo === "empresa" ? { id: data.id, nome: data.nome } : null;
});

/**
 * Porta fechada de verdade: quem não é empresa recebe 404, não uma tela de
 * "sem permissão".
 *
 * A diferença importa. Tela de negativa confirma que o endereço existe e
 * convida a insistir; 404 não conta nada. A porta para virar empresa é
 * `/painel/entrar`, que precisa ser conhecida de antemão, além do código.
 */
export async function exigirEmpresa(): Promise<PerfilEmpresa> {
  const perfil = await perfilEmpresa();
  if (!perfil) notFound();
  return perfil;
}

/**
 * Troca o código pelo acesso permanente.
 *
 * A validação inteira é do banco: `conceder_acesso_empresa` compara o hash do
 * código, normaliza caixa e espaço, marca `perfil.tipo = 'empresa'` e registra
 * quem entrou em `acesso_empresa`. O código nunca chega aqui em texto puro
 * comparável, e o servidor não guarda cópia dele.
 */
export async function concederAcesso(perfilId: string, codigo: string) {
  const { data, error } = await db().rpc("conceder_acesso_empresa", {
    p_perfil_id: perfilId,
    p_codigo: codigo,
  });

  if (error) return { erro: mensagem(error) };
  if (data !== true) return { erro: "Código incorreto." };
  return {};
}
