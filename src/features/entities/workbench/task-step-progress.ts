export function taskStepProgress(
  steps: { archived_at: string | null; completed_at: string | null }[],
) {
  const active = steps.filter((step) => !step.archived_at);
  const completed = active.filter((step) => step.completed_at).length;
  return {
    total: active.length,
    completed,
    percent: active.length
      ? Math.round((completed / active.length) * 100)
      : null,
  };
}
