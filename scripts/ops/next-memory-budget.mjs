// Next 16.2.2 otherwise gives EACH dev server 50% of total system RAM.
// Use Node's supported heap flag, preserving an explicit operator override.
export function developmentEnv(env = process.env) {
  const options = env.NODE_OPTIONS ?? "";
  if (/--max[-_]old[-_]space[-_]size(?:=|\s)/.test(options)) return { ...env };
  return {
    ...env,
    NODE_OPTIONS: `${options} --max-old-space-size=4096`.trim(),
  };
}
