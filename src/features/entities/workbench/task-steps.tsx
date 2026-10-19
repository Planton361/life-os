import type { WorkbenchData } from "@/features/real-data/runtime/entity-workbench-read";
import { fieldClass, OperationForm } from "./forms";
import { ManagementDialog } from "./management-disclosure";
import { TaskObjectMenu } from "./task-object-menu";
import styles from "./task-read-view.module.css";

export function TaskSteps({ id, data }: { id: string; data: WorkbenchData }) {
  const task = data.tasks.find((item) => item.id === id)!;
  const steps = data.steps.filter(
    (step) => step.task_id === id && !step.archived_at,
  );
  const project = data.projects.find((item) => item.id === task.project_id);
  const archived = Boolean(
    task.archived_at || project?.archived_at || project?.status === "archived",
  );
  return (
    <section aria-labelledby="task-steps-heading">
      <div className={styles.blockTop}>
        <h3 id="task-steps-heading">Arbeitsschritte</h3>
        {!archived && (
          <ManagementDialog
            label="Arbeitsschritt anlegen"
            triggerText="+ Schritt"
            triggerClassName={styles.quietSmall}
            resetOnClose
            closeText="Abbrechen"
          >
            <OperationForm
              operation="step.create"
              label="Schritt hinzufügen"
              closeOnSuccess
            >
              <input type="hidden" name="taskId" value={id} />
              <input
                type="hidden"
                name="position"
                value={(steps.at(-1)?.position ?? -1) + 1}
              />
              <label>
                Neuer Arbeitsschritt
                <input
                  name="title"
                  className={fieldClass}
                  required
                  maxLength={500}
                />
              </label>
            </OperationForm>
          </ManagementDialog>
        )}
      </div>
      {!steps.length && (
        <p className={`${styles.prose} ${styles.emptySteps}`}>
          Noch keine Schritte. Das Anlegen ist optional.
        </p>
      )}
      <ol>
        {steps.map((step) => (
          <li key={step.id} data-task-step={step.id} className={styles.stepRow}>
            <OperationForm
              operation="step.update"
              label={`${step.completed_at ? "Schritt wieder öffnen" : "Schritt erledigen"}: ${step.title}`}
              checkboxChecked={Boolean(step.completed_at)}
              checkboxId={`task-step-${step.id}`}
              disabled={archived}
              submitClassName={styles.checkbox}
            >
              <input type="hidden" name="taskId" value={id} />
              <input type="hidden" name="stepId" value={step.id} />
              <input type="hidden" name="title" value={step.title} />
              <input type="hidden" name="position" value={step.position} />
              <input
                type="hidden"
                name="completed"
                value={step.completed_at ? "" : "on"}
              />
            </OperationForm>
            <label
              htmlFor={`task-step-${step.id}`}
              className={step.completed_at ? styles.stepDone : styles.stepTitle}
            >
              {step.title}
            </label>
            {!archived && (
              <TaskObjectMenu label={`Arbeitsschritt verwalten: ${step.title}`}>
                <ManagementDialog
                  label={`Arbeitsschritt verwalten: ${step.title}`}
                  triggerText="Schritt bearbeiten"
                  triggerClassName={styles.quietSmall}
                  resetOnClose
                  closeText="Abbrechen"
                >
                  <OperationForm
                    operation="step.update"
                    label="Schritt speichern"
                    closeOnSuccess
                  >
                    <input type="hidden" name="taskId" value={id} />
                    <input type="hidden" name="stepId" value={step.id} />
                    <label>
                      Schritt
                      <input
                        name="title"
                        className={fieldClass}
                        defaultValue={step.title}
                        required
                        maxLength={500}
                      />
                    </label>
                    <label>
                      Reihenfolge
                      <input
                        type="number"
                        name="position"
                        min="0"
                        className={fieldClass}
                        defaultValue={step.position}
                      />
                    </label>
                    <label className="flex gap-2">
                      <input
                        type="checkbox"
                        name="completed"
                        defaultChecked={Boolean(step.completed_at)}
                      />
                      Erledigt
                    </label>
                  </OperationForm>
                </ManagementDialog>
                <OperationForm
                  operation="step.archive"
                  label="Schritt entfernen"
                  closeOnSuccess
                  confirmMessage={`„${step.title}“ aus dieser Task entfernen? Die Task wird dadurch nicht abgeschlossen.`}
                >
                  <input type="hidden" name="taskId" value={id} />
                  <input type="hidden" name="stepId" value={step.id} />
                </OperationForm>
              </TaskObjectMenu>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
