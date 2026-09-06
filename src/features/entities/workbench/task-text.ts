// The existing Task capture contract stores Next Action as a labelled suffix.
// Keep that representation; handle a task that has no separate context as well.
export function taskTextFields(description: string | null) {
  const text = description ?? "";
  const marker = "Nächste Aktion: ";
  const boundary = text.lastIndexOf(`\n\n${marker}`);
  if (boundary >= 0)
    return {
      description: text.slice(0, boundary),
      nextAction: text.slice(boundary + 2 + marker.length),
    };
  if (text.startsWith(marker))
    return { description: "", nextAction: text.slice(marker.length) };
  return { description: text, nextAction: "" };
}
