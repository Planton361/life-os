"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { linkTaskSkillAction } from "@/features/real-data/actions/task.actions";
import { actionClass } from "./forms";

export function SkillTaskRecovery({
  taskId,
  skill,
  linked,
  taskArchived,
}: {
  taskId: string;
  skill: { id: string; name: string };
  linked: boolean;
  taskArchived: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <section
      aria-label="Skill-Verbindung"
      className="grid min-w-0 gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-1)] p-4"
    >
      <p className="break-words text-sm">Für Skill: {skill.name}</p>
      <p role="status">
        {linked
          ? "Aufgabe erstellt und mit Skill verbunden."
          : "Aufgabe erstellt. Verbindung zum Skill nicht hergestellt."}
      </p>
      {!linked && (
        <button
          type="button"
          className={`w-fit ${actionClass}`}
          disabled={pending || taskArchived}
          onClick={() =>
            start(async () => {
              const form = new FormData();
              form.set("taskId", taskId);
              form.set("skillId", skill.id);
              try {
                const result = await linkTaskSkillAction(form);
                if (result.status === "success") {
                  setError("");
                  router.refresh();
                } else setError(result.message);
              } catch {
                setError(
                  "Verbindungsergebnis unklar. Lade erneut, um die gespeicherte Verbindung zu prüfen.",
                );
              }
            })
          }
        >
          {pending ? "Verbinden …" : "Verbindung erneut versuchen"}
        </button>
      )}
      {taskArchived && !linked && (
        <p>Archivierte Aufgaben können nicht neu verbunden werden.</p>
      )}
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
      <Link
        className="w-fit text-sm text-[var(--accent-cyan)] underline"
        href={`/skills/${skill.id}`}
      >
        Zum Skill
      </Link>
    </section>
  );
}
