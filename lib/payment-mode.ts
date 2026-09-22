// Online charges remain disabled until a real provider and legal flow are approved.
export function onlinePaymentsEnabled() {
  return false;
}

export function onlinePaymentsDisabledResponse() {
  return Response.json({ error: 'online_payments_disabled', message: 'Онлайн-платежи пока недоступны.' }, { status: 503 });
}
