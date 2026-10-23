export const today = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
export const thresholds = [0, 100, 250, 450, 700, 1000];
export function level(xp: number) {
  return thresholds.filter((n) => xp >= n).length || 1;
}
export function progress(
  tasks: { weight: number }[],
  completed: Set<number | string>,
  ids: (number | string)[],
) {
  const total = tasks.reduce((s, t) => s + Number(t.weight), 0);
  return total === 0
    ? 0
    : Math.round(
        (tasks.reduce(
          (s, t, i) => s + (completed.has(ids[i]) ? Number(t.weight) : 0),
          0,
        ) /
          total) *
          100,
      );
}
export function balance(transactions: { amount: number }[]) {
  return transactions.reduce((s, t) => s + t.amount, 0);
}
export function qualified(
  percent: number,
  light = false,
  threshold = 70,
  lightThreshold = 50,
) {
  return percent >= (light ? lightThreshold : threshold);
}
export function overdue(
  due: string | null,
  completed: boolean,
  now = new Date(),
) {
  return !!due && !completed && new Date(due) < now;
}
export function streak(
  days: { date: string; qualified: boolean }[],
  now = today(),
) {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0,
    run = 0,
    prev = "";
  for (const d of sorted) {
    const next = prev ? new Date(prev + "T12:00:00Z") : null;
    next?.setUTCDate(next.getUTCDate() + 1);
    run = d.qualified
      ? next?.toISOString().slice(0, 10) === d.date
        ? run + 1
        : 1
      : 0;
    longest = Math.max(longest, run);
    prev = d.date;
  }
  const yesterday = new Date(now + "T12:00:00Z");
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const last = sorted.at(-1);
  return {
    current:
      last &&
      (last.date === now || last.date === yesterday.toISOString().slice(0, 10))
        ? run
        : 0,
    longest,
  };
}
export const labels: Record<string, string> = {
  HOMEWORK: "Ödev",
  STUDY: "Çalışma",
  HABIT: "Alışkanlık",
  PLANNED: "Planlandı",
  IN_PROGRESS: "Devam ediyor",
  COMPLETED: "Tamamlandı",
  PENDING: "Bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  CANCELLED: "İptal edildi",
  RUNNING: "Çalışıyor",
  PAUSED: "Duraklatıldı",
};
