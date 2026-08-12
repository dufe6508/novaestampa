export const FUSO_NEGOCIO = "America/Sao_Paulo";

const formatadorDataNegocio = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_NEGOCIO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dataCivilEmUtc(data: Date) {
  const partes = formatadorDataNegocio.formatToParts(data);
  const numero = (tipo: Intl.DateTimeFormatPartTypes) =>
    Number(partes.find((parte) => parte.type === tipo)?.value);

  return Date.UTC(numero("year"), numero("month") - 1, numero("day"));
}

/** Hoje em `YYYY-MM-DD`, no fuso do negócio. É a régua de todo corte de dia. */
export function hojeNoFuso(agora = new Date()) {
  return formatadorDataNegocio.format(agora);
}

/**
 * Aritmética de dia civil em `YYYY-MM-DD`.
 *
 * Passa pelo meio-dia UTC de propósito: somar em cima da meia-noite erraria o
 * dia em qualquer fuso negativo, e Brasília é um deles.
 */
export function somarDias(dia: string, n: number) {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function diasEntre(de: string, ate: string) {
  return Math.round(
    (Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000,
  );
}

/**
 * A segunda-feira da semana de um dia. Semana começa na segunda porque é assim
 * que a cobrança e a oficina falam ("essa semana"), não no domingo do calendário.
 */
export function segundaDe(dia: string) {
  const d = new Date(`${dia}T12:00:00Z`);
  return somarDias(dia, -((d.getUTCDay() + 6) % 7));
}

/**
 * Dias civis entre hoje, no fuso de Brasília, e uma data `YYYY-MM-DD`.
 * Zero significa que o prazo continua válido durante todo o dia informado.
 */
export function diasAteNoFuso(
  data: string | null | undefined,
  agora = new Date(),
) {
  if (!data) return null;

  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (!partes) return null;

  const [, ano, mes, dia] = partes.map(Number);
  const alvo = Date.UTC(ano, mes - 1, dia);

  return Math.round((alvo - dataCivilEmUtc(agora)) / 86_400_000);
}
