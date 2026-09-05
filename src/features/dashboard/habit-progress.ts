/** Visual projection only; increments and targets remain canonical Habit values. */
export function habitProgressPercent(current: number, target: number | null) {
  if (
    target === null ||
    target <= 0 ||
    !Number.isFinite(target) ||
    !Number.isFinite(current)
  )
    return 0;
  return Math.max(0, Math.min(100, (current / target) * 100));
}

export function formatHabitNumber(value: number) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 6,
    useGrouping: false,
  }).format(value);
}

export function habitSteps(
  current: number,
  target: number | null,
  increment: number,
) {
  if (target === null || target <= 0 || increment <= 0)
    return { total: 0, completed: 0, dots: 0, filled: 0, reached: false };
  const total = Math.ceil(Number((target / increment).toFixed(8)));
  const reached = current >= target;
  const completed = reached
    ? total
    : Math.max(0, Math.floor(Number((current / increment).toFixed(8))));
  const dots = Math.min(total, 24);
  return {
    total,
    completed,
    dots,
    filled: reached ? dots : Math.floor((completed / total) * dots),
    reached,
  };
}
