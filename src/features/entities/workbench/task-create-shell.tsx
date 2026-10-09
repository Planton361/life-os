import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./task-create-shell.module.css";

// Only the canonical new-Task page opts in; other entity shells stay unchanged.
export function TaskCreateShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      data-entity-workbench="task"
      data-task-create-variant="B8"
      className={styles.canvas}
    >
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <Link href="/portfolio">Portfolio</Link>
        <span>/</span>
        <Link href="/portfolio?type=tasks">Tasks</Link>
      </nav>
      <header className={styles.header}>
        <p className={styles.entity}>Task</p>
        <h1>{title}</h1>
        <p className={styles.description}>
          Titel zuerst. Weitere Angaben kannst du nach dem Erfassen ergänzen.
        </p>
      </header>
      {children}
    </div>
  );
}
