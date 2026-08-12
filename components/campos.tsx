"use client";

import Link from "next/link";
import {
  PADRAO_CODIGO,
  PADRAO_TELEFONE,
  PREFIXO_BABY_LOOK,
  capitalizarDigitando,
  mascaraCodigo,
  mascaraDinheiro,
  mascaraTelefone,
} from "@/lib/formato";

/**
 * Peças de formulário e de estado, compartilhadas pelas telas do aluno.
 *
 * Existe para que altura, raio, foco e transição sejam decididos uma vez.
 * Se um valor aparece três vezes, vira componente ou token.
 *
 * `use client` no arquivo inteiro por causa da validação de tamanho, que
 * precisa de evento. As outras peças são só apresentação, então o custo é o
 * bundle, não comportamento.
 */

const BASE_BOTAO =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-body-sm " +
  "font-semibold transition-[opacity,background-color,color,transform] duration-fast ease-soft " +
  "active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-30 " +
  "disabled:active:scale-100 motion-reduce:active:scale-100";

const TONS = {
  primario: "bg-ink text-white hover:opacity-90 active:opacity-80 disabled:hover:opacity-30",
  secundario:
    "border border-line-strong bg-surface text-ink hover:bg-surface-2 active:bg-surface-2",
  // Com borda, e não texto solto. Sem ela o botão só existia no instante do
  // hover: "Sair da conta" e "Sair mesmo assim" liam como legenda, e a pessoa
  // que procurava a ação concluía que ela tinha sumido da tela. A borda é a
  // `line` fraca, então ele continua sendo o degrau mais baixo dos três, agora
  // visível parado.
  fantasma:
    "border border-line text-ink-2 hover:border-line-strong hover:bg-surface-2 hover:text-ink",
} as const;

type Tom = keyof typeof TONS;

export function Botao({
  tom = "primario",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tom?: Tom }) {
  return <button {...props} className={`${BASE_BOTAO} ${TONS[tom]} ${className}`} />;
}

export function BotaoLink({
  tom = "primario",
  className = "",
  ...props
}: React.ComponentProps<typeof Link> & { tom?: Tom }) {
  return <Link {...props} className={`${BASE_BOTAO} ${TONS[tom]} ${className}`} />;
}

const BASE_CAMPO =
  "h-11 w-full rounded-lg border bg-surface px-3.5 text-body text-ink outline-none " +
  "transition-[border-color,box-shadow] duration-base ease-soft placeholder:text-faint";

const CAMPO_OK =
  "border-line focus:border-brand-deep focus:shadow-[0_0_0_3px_rgb(15_168_188_/_0.16)]";

/**
 * Aviso de validação, em português e escrito por nós.
 *
 * O navegador tem mensagem própria para campo vazio, e-mail sem `@` e formato
 * fora do padrão, mas ela sai no idioma do aparelho, normalmente em inglês, e
 * fala como especificação ("Please match the requested format"). Aqui a
 * mensagem diz o que fazer.
 *
 * `setCustomValidity` precisa ser limpa a cada digitada, senão o campo fica
 * inválido para sempre, mesmo depois de corrigido.
 */
function avisoDe(el: HTMLInputElement, aviso?: string) {
  const v = el.validity;
  if (v.valueMissing) return "Preencha este campo.";
  if (v.typeMismatch && el.type === "email") return "Digite um e-mail válido, com @.";
  if (v.tooShort) return `Digite pelo menos ${el.minLength} caracteres.`;
  return aviso ?? "Confira este campo.";
}

function avisar(aviso?: string) {
  return {
    onInvalid: (e: React.InvalidEvent<HTMLInputElement>) =>
      e.currentTarget.setCustomValidity(avisoDe(e.currentTarget, aviso)),
    onInput: (e: React.FormEvent<HTMLInputElement>) =>
      e.currentTarget.setCustomValidity(""),
  };
}

/**
 * `input` cru com o mesmo aviso, para as telas que trazem estilo próprio e não
 * usam o `Campo`. Componente, e não um punhado de props, porque o handler não
 * atravessa a fronteira de Server Component.
 */
export function Entrada({
  aviso,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { aviso?: string }) {
  return <input {...props} {...avisar(aviso)} />;
}

export function Campo({
  etiqueta,
  ajuda,
  erro,
  aviso,
  className = "",
  id,
  onInput,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string;
  ajuda?: string;
  erro?: string | null;
  /** Texto do aviso quando o valor não bate com `pattern`. */
  aviso?: string;
  /** React 19: `ref` é prop comum, e o spread abaixo já a entrega ao input. */
  ref?: React.Ref<HTMLInputElement>;
}) {
  const idAjuda = ajuda || erro ? `${id}-ajuda` : undefined;
  const validacao = avisar(aviso);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-caption font-semibold text-ink-2">
        {etiqueta}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={idAjuda}
        className={`${BASE_CAMPO} ${erro ? "border-danger" : CAMPO_OK} ${className}`}
        {...props}
        onInvalid={validacao.onInvalid}
        onInput={(e) => {
          validacao.onInput(e);
          onInput?.(e);
        }}
      />
      {(ajuda || erro) && (
        <p
          id={idAjuda}
          role={erro ? "alert" : undefined}
          className={`text-caption leading-snug ${erro ? "text-danger" : "text-muted"}`}
        >
          {erro || ajuda}
        </p>
      )}
    </div>
  );
}

/**
 * Telefone, com máscara enquanto digita.
 *
 * Existe porque o campo aparece no login e na conta, e antes aceitava
 * "31999848388ddssfd2d". A máscara descarta o que não é dígito na hora, então
 * o formato errado nem chega a ser digitado, e o `pattern` só fecha a porta
 * para quem cola texto ou desliga o script.
 *
 * ponytail: reescreve o valor no próprio input, sem estado controlado. O
 * cursor pula para o fim quando se edita o meio do número; troca por
 * componente controlado se isso incomodar na prática.
 */
export function CampoTelefone(props: React.ComponentProps<typeof Campo>) {
  return (
    <Campo
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="(00) 000000000"
      pattern={PADRAO_TELEFONE}
      aviso="Digite o DDD e o número, como em (31) 999848388."
      {...props}
      onInput={(e) => {
        e.currentTarget.value = mascaraTelefone(e.currentTarget.value);
      }}
    />
  );
}

/**
 * Nome próprio, com a inicial subindo enquanto digita.
 *
 * "joão fernandes" vira "João Fernandes" na hora, sem esperar o envio. Quem
 * digita no celular não capitaliza, e ver o nome certo aparecendo é o que faz a
 * pessoa conferir antes de mandar, ainda mais quando ele vai bordado na peça.
 *
 * Sobe só a inicial de cada palavra. O resto das letras fica como veio, então
 * "MacHado" continua inteiro.
 *
 * ponytail: reescreve o valor no próprio input, mesma abordagem do telefone. O
 * cursor pula para o fim ao editar o meio do texto; vira componente controlado
 * se isso incomodar de verdade.
 */
export function CampoNome(props: React.ComponentProps<typeof Campo>) {
  return (
    <Campo
      autoCapitalize="words"
      autoComplete="name"
      {...props}
      onInput={(e) => {
        const campo = e.currentTarget;
        const novo = capitalizarDigitando(campo.value);
        if (novo !== campo.value) campo.value = novo;
      }}
    />
  );
}

/**
 * Escolha de tamanho. Rádio de verdade, para funcionar no teclado e sem JS.
 *
 * Duas coisas resolvidas aqui:
 *
 * · A grade vem numa lista só do banco, e os tamanhos prefixados com `BL` são
 *   baby look. Separar em dois blocos rotulados evita explicar sigla na tela.
 * · A mensagem de campo obrigatório do navegador sai em inglês ("Please select
 *   one of these options"). `setCustomValidity` troca por português. Precisa
 *   ser limpa no change, senão o campo fica inválido para sempre.
 */

export function Tamanhos({
  nome,
  opcoes,
  padrao,
}: {
  nome: string;
  opcoes: string[];
  padrao?: string;
}) {
  const tradicionais = opcoes.filter((t) => !t.startsWith(PREFIXO_BABY_LOOK));
  const babyLook = opcoes.filter((t) => t.startsWith(PREFIXO_BABY_LOOK));

  const exigir = (e: React.InvalidEvent<HTMLInputElement>) =>
    e.currentTarget.setCustomValidity("Escolha um tamanho para continuar.");
  const limpar = (e: React.ChangeEvent<HTMLInputElement>) =>
    e.currentTarget.setCustomValidity("");

  const botao = (t: string) => (
    <label
      key={t}
      className="cursor-pointer rounded-md has-[:focus-visible]:outline
        has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2
        has-[:focus-visible]:outline-brand-deep"
    >
      <input
        type="radio"
        name={nome}
        value={t}
        defaultChecked={padrao === t}
        required
        onInvalid={exigir}
        onChange={limpar}
        className="peer sr-only"
      />
      <span
        className="flex h-11 min-w-[3rem] items-center justify-center whitespace-nowrap rounded-md
          border border-line-strong bg-surface px-3 text-body-sm font-semibold text-ink-2
          transition-[color,background-color,border-color,transform] duration-fast ease-soft
          hover:border-ink hover:text-ink active:scale-[0.97]
          peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white"
      >
        {t.startsWith(PREFIXO_BABY_LOOK) ? t.slice(PREFIXO_BABY_LOOK.length) : t}
      </span>
    </label>
  );

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="sr-only">Tamanho</legend>

      <div className="flex flex-col gap-2">
        <p className="text-caption font-semibold text-ink-2">
          {babyLook.length > 0 ? "Tamanho · modelagem tradicional" : "Tamanho"}
        </p>
        <div className="flex flex-wrap gap-2">{tradicionais.map(botao)}</div>
      </div>

      {babyLook.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-caption font-semibold text-ink-2">Tamanho · baby look</p>
          <div className="flex flex-wrap gap-2">{babyLook.map(botao)}</div>
        </div>
      )}
    </fieldset>
  );
}

/**
 * Preço, com a máscara de dinheiro enquanto digita.
 *
 * "15990" vira "R$ 159,90" na hora. Quem cadastra produto faz isso no celular,
 * com o teclado numérico, e sem a máscara precisaria achar a vírgula e decidir
 * entre ponto e vírgula, que é onde nasce o produto cadastrado por dez vezes o
 * preço. O servidor lê só os dígitos, então o valor chega igual com ou sem
 * JavaScript.
 *
 * ponytail: reescreve o valor no próprio input, mesma abordagem do telefone e
 * do nome. O cursor vai para o fim, que aqui é o certo: dinheiro se digita da
 * direita para a esquerda.
 */
export function CampoPreco(props: React.ComponentProps<typeof Campo>) {
  return (
    <Campo
      inputMode="numeric"
      autoComplete="off"
      placeholder="R$ 0,00"
      className="text-num font-semibold tabular-nums"
      {...props}
      onInput={(e) => {
        e.currentTarget.value = mascaraDinheiro(e.currentTarget.value);
      }}
    />
  );
}

/**
 * Código de acesso da turma, com a máscara do alfabeto enquanto digita.
 *
 * Sobe a caixa e descarta o que o banco recusaria, então "cb 3a" vira "CB3A" e
 * o `O` digitado no lugar do zero some na hora em vez de virar erro no envio. É
 * a mesma abordagem do telefone e do preço: o formato errado nem chega a ser
 * digitado, e o `pattern` fecha a porta para quem cola texto ou desliga o JS.
 *
 * Monoespaçado e com as letras afastadas porque este código é lido em voz alta
 * e copiado do quadro: é onde a diferença entre caracteres precisa aparecer.
 */
export function CampoCodigo(props: React.ComponentProps<typeof Campo>) {
  return (
    <Campo
      autoComplete="off"
      autoCapitalize="characters"
      spellCheck={false}
      minLength={4}
      maxLength={10}
      pattern={PADRAO_CODIGO}
      aviso="De 4 a 10 caracteres. Não use O, 0, I, 1 nem L."
      className="font-mono uppercase tracking-[0.18em]"
      {...props}
      onInput={(e) => {
        e.currentTarget.value = mascaraCodigo(e.currentTarget.value);
        // Encadeia em vez de sobrescrever: quem usa este campo precisa saber
        // que a pessoa digitou nele, para parar de sugerir por cima.
        props.onInput?.(e);
      }}
    />
  );
}

/**
 * Data. `input type="date"` é o calendário do próprio sistema: no celular abre
 * o seletor nativo, funciona sem JavaScript e já vem traduzido. Nenhuma
 * biblioteca de calendário faz melhor, e todas pesam mais.
 */
export function CampoData(props: React.ComponentProps<typeof Campo>) {
  return (
    <Campo
      type="date"
      {...props}
      className={`[&::-webkit-calendar-picker-indicator]:cursor-pointer ${props.className ?? ""}`}
    />
  );
}

/**
 * Escolha única em pílula. Rádio de verdade, nunca `select`.
 *
 * O `select` do navegador abre uma lista desenhada pelo sistema operacional e
 * ignora o resto da interface. Enquanto couberem numa linha ou duas, as opções
 * ficam à mostra, e escolher é um toque em vez de dois.
 *
 * Nasceu duplicado no tipo do cliente e no rótulo do grupo. Virou um só quando
 * o cadastro de produto precisou dele pela quarta vez.
 */
export function Opcoes({
  nome,
  legenda,
  opcoes,
  atual,
  ajuda,
}: {
  nome: string;
  legenda: string;
  opcoes: { valor: string; texto: string }[];
  atual: string;
  ajuda?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-caption font-semibold text-ink-2">{legenda}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <label
            key={o.valor}
            className="cursor-pointer rounded-lg has-[:focus-visible]:outline
              has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2
              has-[:focus-visible]:outline-brand-deep"
          >
            <input
              type="radio"
              name={nome}
              value={o.valor}
              defaultChecked={atual === o.valor}
              className="peer sr-only"
            />
            <span
              className="flex h-10 items-center justify-center whitespace-nowrap rounded-lg border
                border-line-strong bg-surface px-3 text-body-sm font-semibold text-ink-2
                transition-[color,background-color,border-color,transform] duration-fast ease-soft
                hover:border-ink hover:text-ink active:scale-[0.97] peer-checked:border-ink
                peer-checked:bg-ink peer-checked:text-white motion-reduce:active:scale-100"
            >
              {o.texto}
            </span>
          </label>
        ))}
      </div>
      {ajuda && <p className="text-caption leading-snug text-muted">{ajuda}</p>}
    </fieldset>
  );
}

/**
 * Escolha múltipla em pílula, mesma casca do `Opcoes`. É a grade de tamanhos do
 * produto: a mesma forma que o aluno vai ver para escolher, montada aqui.
 */
export function Marcadores({
  nome,
  legenda,
  opcoes,
  marcados,
}: {
  nome: string;
  legenda: string;
  opcoes: { valor: string; texto: string }[];
  marcados: string[];
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-caption font-semibold text-ink-2">{legenda}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <label
            key={o.valor}
            className="cursor-pointer rounded-lg has-[:focus-visible]:outline
              has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2
              has-[:focus-visible]:outline-brand-deep"
          >
            <input
              type="checkbox"
              name={nome}
              value={o.valor}
              defaultChecked={marcados.includes(o.valor)}
              className="peer sr-only"
            />
            <span
              className="flex h-10 min-w-11 items-center justify-center whitespace-nowrap rounded-lg
                border border-line-strong bg-surface px-3 text-body-sm font-semibold text-ink-2
                transition-[color,background-color,border-color,transform] duration-fast ease-soft
                hover:border-ink hover:text-ink active:scale-[0.97] peer-checked:border-ink
                peer-checked:bg-ink peer-checked:text-white motion-reduce:active:scale-100"
            >
              {o.texto}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Alerta({
  tom = "atencao",
  children,
}: {
  tom?: "atencao" | "erro" | "ok";
  children: React.ReactNode;
}) {
  const cor = {
    atencao: "bg-warning-soft text-warning",
    erro: "bg-danger-soft text-danger",
    ok: "bg-success-soft text-success",
  }[tom];

  return (
    <p
      role={tom === "erro" ? "alert" : undefined}
      className={`rounded-lg px-3.5 py-3 text-caption leading-relaxed ${cor}`}
    >
      {children}
    </p>
  );
}

/** Campo de texto longo. Mesma casca do `Campo`, com altura para respirar. */
export function Area({
  etiqueta,
  ajuda,
  className = "",
  id,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  etiqueta: string;
  ajuda?: string;
}) {
  const idAjuda = ajuda ? `${id}-ajuda` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-caption font-semibold text-ink-2">
        {etiqueta}
      </label>
      <textarea
        id={id}
        rows={3}
        aria-describedby={idAjuda}
        className={`w-full rounded-lg border bg-surface px-3.5 py-2.5 text-body text-ink
          outline-none transition-[border-color,box-shadow] duration-base ease-soft
          placeholder:text-faint ${CAMPO_OK} ${className}`}
        {...props}
      />
      {ajuda && (
        <p id={idAjuda} className="text-caption leading-snug text-muted">
          {ajuda}
        </p>
      )}
    </div>
  );
}

/** Estado vazio desenhado. Tela em branco não conta como estado. */
export function Vazio({
  icone,
  titulo,
  texto,
  acao,
}: {
  icone: React.ReactNode;
  titulo: string;
  texto: string;
  acao?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong
        bg-surface px-6 py-12 text-center"
    >
      <span className="text-faint">{icone}</span>
      <div className="flex flex-col gap-1">
        <h2 className="text-h3">{titulo}</h2>
        <p className="mx-auto max-w-xs text-body-sm text-muted">{texto}</p>
      </div>
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  );
}

/** Linha de dinheiro. Números tabulares alinham em coluna, sem dançar. */
export function Linha({
  rotulo,
  valor,
  forte,
}: {
  rotulo: React.ReactNode;
  valor: React.ReactNode;
  forte?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-body-sm">
      <span className={forte ? "font-semibold text-ink" : "text-muted"}>{rotulo}</span>
      <span data-nums className={forte ? "font-semibold text-ink" : "text-ink-2"}>
        {valor}
      </span>
    </div>
  );
}
