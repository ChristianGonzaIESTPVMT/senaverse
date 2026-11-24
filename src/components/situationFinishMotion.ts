type FinishTicket = { situationId: string; token: string; from: number; to: number };

let pending: FinishTicket | undefined;

export function rememberSituationFinish(situationId: string, from: number) {
  const token = crypto.randomUUID();
  pending = { situationId, token, from, to: Date.now() };
  return token;
}

export function getSituationFinish(situationId: string, token: unknown) {
  return pending?.situationId === situationId && pending.token === token ? pending : undefined;
}

export function forgetSituationFinish(ticket: FinishTicket) {
  if (pending === ticket) pending = undefined;
}
