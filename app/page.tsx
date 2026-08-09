import { redirect } from "next/navigation";

// A raiz é a porta do aluno. /painel existe, mas não é linkado de lugar nenhum.
export default function Home() {
  redirect("/entrar");
}
