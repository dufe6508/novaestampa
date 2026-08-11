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
