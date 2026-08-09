import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { atualizarTelefone, buscarPerfil, buscarTurma, meusPedidos } from "@/lib/aluno";
import { fecharSessao, sessao } from "@/lib/sessao";
import { Campo } from "@/components/campos";
import { FormAcao } from "@/components/form-acao";
import { TrocarTurma } from "./trocar-turma";

/**
 * Conta.
 *
 * Quase vazia, e isso é bom. O cuidado está em não deixar o aluno mexer aqui
 * achando que está mexendo na peça.
 */

export default async function Conta({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;

  const turma = await buscarTurma(codigo);
  if (!turma) notFound();

  const aluno = await sessao();
  if (!aluno) redirect(`/t/${turma.codigo}/entrar`);

  const perfil = await buscarPerfil(aluno.id);
  if (!perfil) {
    // Perfil sumiu do banco com o cookie ainda de pé. Limpa e recomeça.
    await fecharSessao();
    redirect(`/t/${turma.codigo}/entrar`);
  }

  const pedidos = await meusPedidos(aluno.id, turma.codigo);

  async function salvarTelefone(_estado: string | null, dados: FormData) {
    "use server";

    const r = await atualizarTelefone(aluno!.id, String(dados.get("telefone") ?? ""));
    if (r.erro) return r.erro;

    revalidatePath(`/t/${turma!.codigo}/conta`);
  }

  async function sair(_estado: string | null, _dados: FormData) {
    "use server";
    await fecharSessao();
    return redirect("/entrar");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1>Minha conta</h1>
        <p className="text-body-sm text-muted">{perfil.email}</p>
      </header>

      <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-card">
        <div className="flex flex-col gap-1">
          <p className="label text-muted">Nome</p>
          <p className="text-body font-semibold">{perfil.nome}</p>
          {/* O nome bordado é o do pedido, não o da conta. Se esta tela deixasse
              editar, o aluno trocaria aqui achando que corrigiu a peça. */}
          <p className="text-caption leading-relaxed text-muted">
            Para mudar o nome que vai bordado, edite o pedido na aba Pedidos. O nome da conta
            não muda a peça.
          </p>
        </div>

        <div className="border-t border-line pt-4">
          <FormAcao
            acao={salvarTelefone}
            texto="Salvar telefone"
            pendenteTexto="Salvando…"
            tom="secundario"
          >
            <Campo
              id="telefone"
              name="telefone"
              type="tel"
              etiqueta="Telefone"
              defaultValue={perfil.telefone ?? ""}
              placeholder="(31) 90000-0000"
              autoComplete="tel"
              inputMode="tel"
              ajuda="Serve para falarem com você sobre a entrega. Pedidos já feitos guardam o telefone que estava lá na hora, e continuam como estão."
            />
          </FormAcao>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-card">
        <div className="flex flex-col gap-1">
          <p className="label text-muted">{turma.label_grupo} atual</p>
          <p className="text-body font-semibold">
            {turma.grupo_nome} · {turma.campanha_nome}
          </p>
          <p className="text-caption text-muted">
            {turma.cliente_nome}
            {turma.cliente_cidade ? ` · ${turma.cliente_cidade}` : ""}
          </p>
        </div>

        <div className="border-t border-line pt-4">
          <TrocarTurma
            label={turma.label_grupo.toLowerCase()}
            grupo={turma.grupo_nome}
            quantos={pedidos.length}
          />
        </div>
      </section>

      <FormAcao acao={sair} texto="Sair da conta" pendenteTexto="Saindo…" tom="fantasma" />
    </div>
  );
}
