"use client";

import {
  useCallback,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { contentStateDataAttributes } from "@/features/content-state";
import { cn } from "@/lib/cn";
import type {
  WorkActivity,
  WorkActivityType,
  WorkArchitectureItem,
  WorkFollowUp,
  WorkLogEntry,
  WorkLogStatus,
  WorkLogViewModel,
  WorkTask,
  WorkTaskStatus,
  WorkWikiEntry,
} from "./types";
import {
  DialogShell,
  EmptyState,
  FieldLabel,
  Metric,
  Panel,
  Pill,
  Toast,
  type ToastState,
  createId,
  empty,
  formatDate,
  inputClass,
  matchesSearch,
  mutedAccent,
  normalize,
  optionLabel,
  primaryButtonClass,
  quietButtonClass,
  referenceAccent,
  riskAccent,
  secondaryButtonClass,
  splitLines,
  textareaClass,
  today,
  warningAccent,
  workAccent,
} from "./components/work-page-primitives";

type WorkLogSegment = "all" | "tasks" | "activities" | "follow-ups" | "review";
type DialogKind = "log" | "activity" | "task" | "follow-up" | null;

type WorkLogSectionProps = {
  [key: `data-${string}`]: string | undefined;
};

type InspectorState =
  | { type: "task"; id: string }
  | { type: "activity"; id: string }
  | { type: "log"; id: string }
  | null;

type WorkLogDraft = {
  title: string;
  date: string;
  status: WorkLogStatus;
  taskIds: string[];
  activityIds: string[];
  summary: string;
  accomplished: string;
  howItWasDone: string;
  blockers: string;
  followUps: string;
  linkedWikiEntryIds: string[];
  linkedArchitectureItemIds: string[];
};

type ActivityDraft = {
  title: string;
  type: WorkActivityType;
  taskId: string;
  date: string;
  durationLabel: string;
  summary: string;
  result: string;
  howItWasDone: string;
  evidence: string;
  blockers: string;
  followUps: string;
  linkedWikiEntryIds: string[];
  linkedArchitectureItemIds: string[];
};

type TaskDraft = {
  title: string;
  status: WorkTaskStatus;
  priority: WorkTask["priority"];
  context: string;
  nextAction: string;
  linkedWikiEntryIds: string[];
};

type FollowUpDraft = {
  title: string;
  source: WorkFollowUp["source"];
  priority: WorkFollowUp["priority"];
  status: WorkFollowUp["status"];
  nextAction: string;
  linkedLogEntryId: string;
  linkedActivityId: string;
  linkedWikiEntryId: string;
};

const segments: readonly { label: string; value: WorkLogSegment }[] = [
  { label: "All", value: "all" },
  { label: "Tasks", value: "tasks" },
  { label: "Activities", value: "activities" },
  { label: "Follow-ups", value: "follow-ups" },
  { label: "Review", value: "review" },
];

const taskStatuses: readonly WorkTaskStatus[] = [
  "open",
  "in_progress",
  "blocked",
  "done",
  "archived",
];

const logStatuses: readonly WorkLogStatus[] = [
  "draft",
  "logged",
  "review_needed",
  "follow_up_open",
  "closed",
];

const activityTypes: readonly WorkActivityType[] = [
  "analysis",
  "implementation",
  "testing",
  "documentation",
  "meeting_followup",
  "debugging",
  "research",
  "review",
];

const taskStatusMeta: Record<WorkTaskStatus, { label: string; accent: string }> = {
  open: { label: "Open", accent: warningAccent },
  in_progress: { label: "In progress", accent: workAccent },
  blocked: { label: "Blocked", accent: riskAccent },
  done: { label: "Done", accent: workAccent },
  archived: { label: "Archived", accent: mutedAccent },
};

const logStatusMeta: Record<WorkLogStatus, { label: string; accent: string }> = {
  draft: { label: "Draft", accent: mutedAccent },
  logged: { label: "Logged", accent: workAccent },
  review_needed: { label: "Review needed", accent: warningAccent },
  follow_up_open: { label: "Follow-up open", accent: warningAccent },
  closed: { label: "Closed", accent: workAccent },
};

const followUpStatusMeta: Record<
  WorkFollowUp["status"],
  { label: string; accent: string }
> = {
  open: { label: "Open", accent: warningAccent },
  waiting: { label: "Waiting", accent: referenceAccent },
  done: { label: "Done", accent: workAccent },
  blocked: { label: "Blocked", accent: riskAccent },
};

const priorityMeta: Record<WorkTask["priority"], { label: string; accent: string }> = {
  low: { label: "Low", accent: mutedAccent },
  medium: { label: "Medium", accent: referenceAccent },
  high: { label: "High", accent: warningAccent },
};

const sourceLabels: Record<WorkFollowUp["source"], string> = {
  work_log: "Work log",
  activity: "Activity",
  meeting: "Meeting",
  wiki: "Wiki",
  manual: "Manual",
};

function selectedValues(event: ChangeEvent<HTMLSelectElement>) {
  return Array.from(event.target.selectedOptions, (option) => option.value);
}

function findTask(tasks: readonly WorkTask[], id?: string) {
  return tasks.find((task) => task.id === id) ?? null;
}

function findActivity(activities: readonly WorkActivity[], id?: string) {
  return activities.find((activity) => activity.id === id) ?? null;
}

function findLog(logs: readonly WorkLogEntry[], id?: string) {
  return logs.find((entry) => entry.id === id) ?? null;
}

function findWiki(wikiEntries: readonly WorkWikiEntry[], id?: string) {
  return wikiEntries.find((entry) => entry.id === id) ?? null;
}

function findArchitecture(
  architectureItems: readonly WorkArchitectureItem[],
  id?: string,
) {
  return architectureItems.find((item) => item.id === id) ?? null;
}

function initialLogDraft(viewModel: WorkLogViewModel): WorkLogDraft {
  return {
    title: "",
    date: today(),
    status: "logged",
    taskIds: viewModel.tasks[0] ? [viewModel.tasks[0].id] : [],
    activityIds: viewModel.activities[0] ? [viewModel.activities[0].id] : [],
    summary: "",
    accomplished: "",
    howItWasDone: "",
    blockers: "",
    followUps: "",
    linkedWikiEntryIds: viewModel.wikiEntries[0] ? [viewModel.wikiEntries[0].id] : [],
    linkedArchitectureItemIds: viewModel.architectureItems[0]
      ? [viewModel.architectureItems[0].id]
      : [],
  };
}

function initialActivityDraft(
  viewModel: WorkLogViewModel,
  taskId = viewModel.tasks[0]?.id ?? "",
): ActivityDraft {
  return {
    title: "",
    type: "analysis",
    taskId,
    date: today(),
    durationLabel: "",
    summary: "",
    result: "",
    howItWasDone: "",
    evidence: "",
    blockers: "",
    followUps: "",
    linkedWikiEntryIds: viewModel.wikiEntries[0] ? [viewModel.wikiEntries[0].id] : [],
    linkedArchitectureItemIds: viewModel.architectureItems[0]
      ? [viewModel.architectureItems[0].id]
      : [],
  };
}

function initialTaskDraft(viewModel: WorkLogViewModel): TaskDraft {
  return {
    title: "",
    status: "open",
    priority: "medium",
    context: "",
    nextAction: "",
    linkedWikiEntryIds: viewModel.wikiEntries[0] ? [viewModel.wikiEntries[0].id] : [],
  };
}

function initialFollowUpDraft(
  viewModel: WorkLogViewModel,
  context: { logId?: string; activityId?: string; wikiId?: string } = {},
): FollowUpDraft {
  return {
    title: "",
    source: context.activityId ? "activity" : context.wikiId ? "wiki" : "work_log",
    priority: "medium",
    status: "open",
    nextAction: "",
    linkedLogEntryId: context.logId ?? viewModel.logs[0]?.id ?? "",
    linkedActivityId: context.activityId ?? viewModel.activities[0]?.id ?? "",
    linkedWikiEntryId: context.wikiId ?? viewModel.wikiEntries[0]?.id ?? "",
  };
}

function updateTaskActivityLinks(
  tasks: readonly WorkTask[],
  activity: WorkActivity,
): WorkTask[] {
  if (!activity.taskId) {
    return tasks.slice();
  }

  return tasks.map((task) =>
    task.id === activity.taskId
      ? {
          ...task,
          linkedActivityIds: Array.from(
            new Set([...task.linkedActivityIds, activity.id]),
          ),
          updatedAt: new Date().toISOString(),
        }
      : task,
  );
}

export function WorkLogPage({
  viewModel,
}: Readonly<{ viewModel: WorkLogViewModel }>) {
  const [tasks, setTasks] = useState<WorkTask[]>(viewModel.tasks);
  const [activities, setActivities] = useState<WorkActivity[]>(
    viewModel.activities,
  );
  const [logs, setLogs] = useState<WorkLogEntry[]>(viewModel.logs);
  const [followUps, setFollowUps] = useState<WorkFollowUp[]>(
    viewModel.followUps,
  );
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<WorkLogSegment>("all");
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [activityTypeFilter, setActivityTypeFilter] = useState("all");
  const [followUpStatusFilter, setFollowUpStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [wikiFilter, setWikiFilter] = useState("all");
  const [blockerFilter, setBlockerFilter] = useState("all");
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [inspector, setInspector] = useState<InspectorState>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [logDraft, setLogDraft] = useState<WorkLogDraft>(() =>
    initialLogDraft(viewModel),
  );
  const [activityDraft, setActivityDraft] = useState<ActivityDraft>(() =>
    initialActivityDraft(viewModel),
  );
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(() =>
    initialTaskDraft(viewModel),
  );
  const [followUpDraft, setFollowUpDraft] = useState<FollowUpDraft>(() =>
    initialFollowUpDraft(viewModel),
  );

  const dismissToast = useCallback(() => setToast(null), []);
  const query = normalize(search);
  const canUseLocalWorkDrafts = viewModel.profileId === "demo";

  const sortedLogs = useMemo(
    () =>
      logs
        .slice()
        .sort(
          (first, second) =>
            new Date(second.date).getTime() - new Date(first.date).getTime(),
        ),
    [logs],
  );

  const sortedActivities = useMemo(
    () =>
      activities
        .slice()
        .sort(
          (first, second) =>
            new Date(second.date).getTime() - new Date(first.date).getTime(),
        ),
    [activities],
  );

  const filteredTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          (taskStatusFilter === "all" || task.status === taskStatusFilter) &&
          (priorityFilter === "all" || task.priority === priorityFilter) &&
          (wikiFilter === "all" ||
            (wikiFilter === "yes" && task.linkedWikiEntryIds.length > 0) ||
            (wikiFilter === "no" && task.linkedWikiEntryIds.length === 0)) &&
          matchesSearch(
            [
              task.title,
              task.context,
              task.nextAction,
              taskStatusMeta[task.status].label,
              priorityMeta[task.priority].label,
            ],
            query,
          ),
      ),
    [priorityFilter, query, taskStatusFilter, tasks, wikiFilter],
  );

  const filteredActivities = useMemo(
    () =>
      sortedActivities.filter(
        (activity) =>
          (activityTypeFilter === "all" || activity.type === activityTypeFilter) &&
          (blockerFilter === "all" ||
            (blockerFilter === "yes" && activity.blockers.length > 0) ||
            (blockerFilter === "no" && activity.blockers.length === 0)) &&
          (wikiFilter === "all" ||
            (wikiFilter === "yes" && activity.linkedWikiEntryIds.length > 0) ||
            (wikiFilter === "no" && activity.linkedWikiEntryIds.length === 0)) &&
          matchesSearch(
            [
              activity.title,
              activity.summary,
              activity.result,
              activity.howItWasDone,
              activity.evidence,
              optionLabel(activity.type),
            ],
            query,
          ),
      ),
    [activityTypeFilter, blockerFilter, query, sortedActivities, wikiFilter],
  );

  const filteredFollowUps = useMemo(
    () =>
      followUps.filter(
        (followUp) =>
          (followUpStatusFilter === "all" ||
            followUp.status === followUpStatusFilter) &&
          (priorityFilter === "all" || followUp.priority === priorityFilter) &&
          matchesSearch(
            [
              followUp.title,
              followUp.nextAction,
              sourceLabels[followUp.source],
              followUpStatusMeta[followUp.status].label,
            ],
            query,
          ),
      ),
    [followUpStatusFilter, followUps, priorityFilter, query],
  );

  const filteredLogs = useMemo(
    () =>
      sortedLogs.filter(
        (entry) =>
          (blockerFilter === "all" ||
            (blockerFilter === "yes" && entry.blockers.length > 0) ||
            (blockerFilter === "no" && entry.blockers.length === 0)) &&
          (wikiFilter === "all" ||
            (wikiFilter === "yes" && entry.linkedWikiEntryIds.length > 0) ||
            (wikiFilter === "no" && entry.linkedWikiEntryIds.length === 0)) &&
          matchesSearch(
            [
              entry.title,
              entry.summary,
              entry.accomplished,
              entry.howItWasDone,
              entry.followUps.join(" "),
              logStatusMeta[entry.status].label,
            ],
            query,
          ),
      ),
    [blockerFilter, query, sortedLogs, wikiFilter],
  );

  const reviewActivities = filteredActivities.filter(
    (activity) => activity.type === "review" || activity.blockers.length > 0,
  );
  const reviewLogs = filteredLogs.filter((entry) => entry.status === "review_needed");
  const currentEntry = sortedLogs[0] ?? null;
  const selectedTask =
    inspector?.type === "task" ? findTask(tasks, inspector.id) : null;
  const selectedActivity =
    inspector?.type === "activity"
      ? findActivity(activities, inspector.id)
      : null;
  const selectedLog = inspector?.type === "log" ? findLog(logs, inspector.id) : null;

  function showPanel(panel: Exclude<WorkLogSegment, "all">) {
    if (segment === "all") {
      return true;
    }

    if (segment === "review") {
      return panel === "activities" || panel === "follow-ups";
    }

    return segment === panel;
  }

  function openDialog(
    kind: DialogKind,
    context: { taskId?: string; logId?: string; activityId?: string; wikiId?: string } = {},
  ) {
    setDialogError(null);
    setInspector(null);

    if (kind === "log") {
      setLogDraft(initialLogDraft({ ...viewModel, tasks, activities, logs, followUps }));
    }

    if (kind === "activity") {
      setActivityDraft(
        initialActivityDraft(
          { ...viewModel, tasks, activities, logs, followUps },
          context.taskId,
        ),
      );
    }

    if (kind === "task") {
      setTaskDraft(initialTaskDraft({ ...viewModel, tasks, activities, logs, followUps }));
    }

    if (kind === "follow-up") {
      setFollowUpDraft(
        initialFollowUpDraft(
          { ...viewModel, tasks, activities, logs, followUps },
          context,
        ),
      );
    }

    setDialog(kind);
  }

  function continueLog(entry: WorkLogEntry) {
    setDialogError(null);
    setInspector(null);
    setLogDraft({
      title: `${entry.title} · Follow-up`,
      date: today(),
      status: "draft",
      taskIds: entry.taskIds,
      activityIds: entry.activityIds,
      summary: entry.summary,
      accomplished: entry.accomplished,
      howItWasDone: entry.howItWasDone,
      blockers: entry.blockers.join("\n"),
      followUps: entry.followUps.join("\n"),
      linkedWikiEntryIds: entry.linkedWikiEntryIds,
      linkedArchitectureItemIds: entry.linkedArchitectureItemIds,
    });
    setDialog("log");
  }

  function closeDialog() {
    setDialog(null);
    setDialogError(null);
  }

  function submitLog() {
    if (
      empty(logDraft.title) ||
      empty(logDraft.summary) ||
      empty(logDraft.accomplished) ||
      empty(logDraft.howItWasDone)
    ) {
      setDialogError(
        "Complete Title, What was done, What was accomplished and How it was done before saving.",
      );
      return;
    }

    const entry: WorkLogEntry = {
      id: createId("work-log-local"),
      title: logDraft.title.trim(),
      date: logDraft.date || today(),
      status: logDraft.status,
      taskIds: logDraft.taskIds,
      activityIds: logDraft.activityIds,
      summary: logDraft.summary.trim(),
      accomplished: logDraft.accomplished.trim(),
      howItWasDone: logDraft.howItWasDone.trim(),
      blockers: splitLines(logDraft.blockers),
      followUps: splitLines(logDraft.followUps),
      linkedWikiEntryIds: logDraft.linkedWikiEntryIds,
      linkedArchitectureItemIds: logDraft.linkedArchitectureItemIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setLogs((current) => [entry, ...current]);
    setToast({
      title: "Work log saved locally",
      body: "The work entry exists only in local UI state.",
      tone: "success",
    });
    closeDialog();
  }

  function submitActivity() {
    if (
      empty(activityDraft.title) ||
      empty(activityDraft.summary) ||
      empty(activityDraft.result) ||
      empty(activityDraft.howItWasDone)
    ) {
      setDialogError(
        "Complete Title, Summary, Result and How it was done before saving.",
      );
      return;
    }

    const activity: WorkActivity = {
      id: createId("work-activity-local"),
      taskId: activityDraft.taskId || undefined,
      title: activityDraft.title.trim(),
      type: activityDraft.type,
      date: activityDraft.date || today(),
      durationLabel: activityDraft.durationLabel.trim() || undefined,
      summary: activityDraft.summary.trim(),
      result: activityDraft.result.trim(),
      howItWasDone: activityDraft.howItWasDone.trim(),
      evidence: activityDraft.evidence.trim() || "Local note without external evidence.",
      blockers: splitLines(activityDraft.blockers),
      followUps: splitLines(activityDraft.followUps),
      linkedWikiEntryIds: activityDraft.linkedWikiEntryIds,
      linkedArchitectureItemIds: activityDraft.linkedArchitectureItemIds,
    };

    setActivities((current) => [activity, ...current]);
    setTasks((current) => updateTaskActivityLinks(current, activity));
    setToast({
      title: "Activity saved locally",
      body: "No external work system was updated.",
      tone: "success",
    });
    closeDialog();
  }

  function submitTask() {
    if (empty(taskDraft.title) || empty(taskDraft.nextAction)) {
      setDialogError("Complete Title and Next Action before saving.");
      return;
    }

    const task: WorkTask = {
      id: createId("work-task-local"),
      title: taskDraft.title.trim(),
      status: taskDraft.status,
      priority: taskDraft.priority,
      context: taskDraft.context.trim() || "Local work context note.",
      nextAction: taskDraft.nextAction.trim(),
      linkedActivityIds: [],
      linkedWikiEntryIds: taskDraft.linkedWikiEntryIds,
      updatedAt: new Date().toISOString(),
    };

    setTasks((current) => [task, ...current]);
    setToast({
      title: "Task saved locally",
      body: "The task is mock/local state only.",
      tone: "success",
    });
    closeDialog();
  }

  function submitFollowUp() {
    if (empty(followUpDraft.title) || empty(followUpDraft.nextAction)) {
      setDialogError("Complete Title and Next Action before saving.");
      return;
    }

    const followUp: WorkFollowUp = {
      id: createId("work-follow-up-local"),
      title: followUpDraft.title.trim(),
      source: followUpDraft.source,
      status: followUpDraft.status,
      priority: followUpDraft.priority,
      nextAction: followUpDraft.nextAction.trim(),
      linkedLogEntryId: followUpDraft.linkedLogEntryId || undefined,
      linkedActivityId: followUpDraft.linkedActivityId || undefined,
      linkedWikiEntryId: followUpDraft.linkedWikiEntryId || undefined,
    };

    setFollowUps((current) => [followUp, ...current]);
    setToast({
      title: "Follow-up saved locally",
      body: "No task, calendar or company system was updated.",
      tone: "success",
    });
    closeDialog();
  }

  function markFollowUpDone(followUp: WorkFollowUp) {
    setFollowUps((current) =>
      current.map((item) =>
        item.id === followUp.id ? { ...item, status: "done" } : item,
      ),
    );
    setToast({
      title: "Follow-up marked done locally",
      body: "The status changed only in this page state.",
      tone: "success",
    });
  }

  function openFollowUpSource(followUp: WorkFollowUp) {
    if (followUp.linkedActivityId) {
      setInspector({ type: "activity", id: followUp.linkedActivityId });
      return;
    }

    if (followUp.linkedLogEntryId) {
      setInspector({ type: "log", id: followUp.linkedLogEntryId });
      return;
    }

    setToast({
      title: "No source linked",
      body: "This follow-up has no local source relation yet.",
      tone: "info",
    });
  }

  return (
    <div
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-4 pb-8"
      data-work-log-section="page"
      {...contentStateDataAttributes(
        viewModel.contentStates.page,
        viewModel.profileId,
      )}
    >
      <WorkLogHeader
        canUseLocalWorkDrafts={canUseLocalWorkDrafts}
        onAddActivity={() => openDialog("activity")}
        onAddFollowUp={() => openDialog("follow-up")}
        onAddTask={() => openDialog("task")}
        onLogWork={() => openDialog("log")}
      />

      <WorkLogFilters
        activityTypeFilter={activityTypeFilter}
        blockerFilter={blockerFilter}
        followUpStatusFilter={followUpStatusFilter}
        onActivityTypeFilter={setActivityTypeFilter}
        onBlockerFilter={setBlockerFilter}
        onFollowUpStatusFilter={setFollowUpStatusFilter}
        onPriorityFilter={setPriorityFilter}
        onSearch={setSearch}
        onSegment={setSegment}
        onTaskStatusFilter={setTaskStatusFilter}
        onWikiFilter={setWikiFilter}
        priorityFilter={priorityFilter}
        search={search}
        sectionProps={{
          "data-work-log-section": "search-filters",
          ...contentStateDataAttributes(
            viewModel.contentStates.searchFilters,
            viewModel.profileId,
          ),
        }}
        segment={segment}
        taskStatusFilter={taskStatusFilter}
        wikiFilter={wikiFilter}
      />

      <CurrentWorkEntryCard
        activities={activities}
        architectureItems={viewModel.architectureItems}
        canUseLocalWorkDrafts={canUseLocalWorkDrafts}
        entry={currentEntry}
        onAddActivity={() => openDialog("activity")}
        onContinueLog={continueLog}
        onLogWork={() => openDialog("log")}
        onOpenActivity={(activity) => setInspector({ type: "activity", id: activity.id })}
        onOpenLog={(entry) => setInspector({ type: "log", id: entry.id })}
        tasks={tasks}
        wikiEntries={viewModel.wikiEntries}
        profileId={viewModel.profileId}
        state={viewModel.contentStates.currentWorkEntry}
      />

      <section
        aria-label="Work log quick actions"
        className="grid gap-2 sm:grid-cols-3"
        data-work-log-section="quick-actions"
        {...contentStateDataAttributes(
          viewModel.contentStates.quickActions,
          viewModel.profileId,
        )}
      >
        <button
          className={primaryButtonClass}
          disabled={!canUseLocalWorkDrafts}
          onClick={() => openDialog("log")}
          type="button"
        >
          Log work
        </button>
        <button
          className={secondaryButtonClass}
          disabled={!canUseLocalWorkDrafts}
          onClick={() => openDialog("activity")}
          type="button"
        >
          Add activity
        </button>
        <button
          className={secondaryButtonClass}
          disabled={!canUseLocalWorkDrafts}
          onClick={() => openDialog("task")}
          type="button"
        >
          Add task
        </button>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="grid gap-4">
          {showPanel("follow-ups") ? (
            <OpenWorkFollowUps
              canUseLocalWorkDrafts={canUseLocalWorkDrafts}
              followUps={
                segment === "review"
                  ? filteredFollowUps.filter((item) => item.status !== "done")
                  : filteredFollowUps
              }
              onAddFollowUp={() => openDialog("follow-up")}
              onMarkDone={markFollowUpDone}
              onOpenSource={openFollowUpSource}
              profileId={viewModel.profileId}
              query={query}
              state={viewModel.contentStates.openFollowUps}
            />
          ) : null}
          {showPanel("tasks") ? (
            <WorkTaskContextList
              activities={activities}
              canUseLocalWorkDrafts={canUseLocalWorkDrafts}
              onAddActivity={(task) => openDialog("activity", { taskId: task.id })}
              onAddTask={() => openDialog("task")}
              onOpenTask={(task) => setInspector({ type: "task", id: task.id })}
              profileId={viewModel.profileId}
              query={query}
              state={viewModel.contentStates.taskContext}
              tasks={filteredTasks}
              wikiEntries={viewModel.wikiEntries}
            />
          ) : null}
          {showPanel("activities") ? (
            <WorkActivityTimeline
              activities={segment === "review" ? reviewActivities : filteredActivities}
              canUseLocalWorkDrafts={canUseLocalWorkDrafts}
              onAddActivity={() => openDialog("activity")}
              onOpenActivity={(activity) =>
                setInspector({ type: "activity", id: activity.id })
              }
              profileId={viewModel.profileId}
              query={query}
              state={viewModel.contentStates.activityTimeline}
              tasks={tasks}
            />
          ) : null}
        </div>
        <div className="grid gap-4 content-start">
          <WorkLogSignals
            activities={activities}
            followUps={followUps}
            logs={logs}
            profileId={viewModel.profileId}
            state={viewModel.contentStates.workLogSignals}
            wikiEntries={viewModel.wikiEntries}
          />
          <RecentWorkLogs
            canUseLocalWorkDrafts={canUseLocalWorkDrafts}
            entries={segment === "review" ? reviewLogs : filteredLogs}
            onLogWork={() => openDialog("log")}
            onOpenLog={(entry) => setInspector({ type: "log", id: entry.id })}
            profileId={viewModel.profileId}
            query={query}
            state={viewModel.contentStates.recentWorkLogs}
          />
          <LinkedWikiNotesPanel
            currentEntry={currentEntry}
            onOpenWiki={(entry) =>
              setToast({
                title: "Wiki entry available on /work/wiki",
                body: `${entry.title} is linked to the current work log.`,
                tone: "info",
              })
            }
            profileId={viewModel.profileId}
            state={viewModel.contentStates.linkedWikiNotes}
            wikiEntries={viewModel.wikiEntries}
          />
        </div>
      </div>

      {dialog ? (
        <DialogShell labelledBy="work-log-dialog-heading" onClose={closeDialog} open>
          <WorkLogDialog
            activities={activities}
            activityDraft={activityDraft}
            architectureItems={viewModel.architectureItems}
            dialog={dialog}
            dialogError={dialogError}
            followUpDraft={followUpDraft}
            logDraft={logDraft}
            logs={logs}
            onActivityDraft={setActivityDraft}
            onClose={closeDialog}
            onFollowUpDraft={setFollowUpDraft}
            onLogDraft={setLogDraft}
            onSubmitActivity={submitActivity}
            onSubmitFollowUp={submitFollowUp}
            onSubmitLog={submitLog}
            onSubmitTask={submitTask}
            onTaskDraft={setTaskDraft}
            taskDraft={taskDraft}
            tasks={tasks}
            wikiEntries={viewModel.wikiEntries}
          />
        </DialogShell>
      ) : null}

      <WorkLogInspector
        activities={activities}
        architectureItems={viewModel.architectureItems}
        onAddActivity={(task) => openDialog("activity", { taskId: task.id })}
        onAddFollowUp={(activity) =>
          openDialog("follow-up", { activityId: activity.id })
        }
        onClose={() => setInspector(null)}
        selectedActivity={selectedActivity}
        selectedLog={selectedLog}
        selectedTask={selectedTask}
        tasks={tasks}
        wikiEntries={viewModel.wikiEntries}
      />
      <Toast onDismiss={dismissToast} toast={toast} />
    </div>
  );
}

function WorkLogHeader({
  canUseLocalWorkDrafts,
  onAddActivity,
  onAddFollowUp,
  onAddTask,
  onLogWork,
}: Readonly<{
  canUseLocalWorkDrafts: boolean;
  onAddActivity: () => void;
  onAddFollowUp: () => void;
  onAddTask: () => void;
  onLogWork: () => void;
}>) {
  return (
    <header className="rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-5 shadow-[0_8px_22px_rgba(0,0,0,.12)] sm:px-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-green)]">
            Work · Log
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-[var(--text-primary)]">
            Work Log
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Tasks, activities, outcomes and how work was done
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-4 xl:flex xl:justify-end">
          <button
            className={primaryButtonClass}
            disabled={!canUseLocalWorkDrafts}
            onClick={onLogWork}
            type="button"
          >
            Log work
          </button>
          <button
            className={secondaryButtonClass}
            disabled={!canUseLocalWorkDrafts}
            onClick={onAddActivity}
            type="button"
          >
            Add activity
          </button>
          <button
            className={secondaryButtonClass}
            disabled={!canUseLocalWorkDrafts}
            onClick={onAddTask}
            type="button"
          >
            Add task
          </button>
          <button
            className={secondaryButtonClass}
            disabled={!canUseLocalWorkDrafts}
            onClick={onAddFollowUp}
            type="button"
          >
            Add follow-up
          </button>
        </div>
      </div>
    </header>
  );
}

function WorkLogFilters({
  activityTypeFilter,
  blockerFilter,
  followUpStatusFilter,
  onActivityTypeFilter,
  onBlockerFilter,
  onFollowUpStatusFilter,
  onPriorityFilter,
  onSearch,
  onSegment,
  onTaskStatusFilter,
  onWikiFilter,
  priorityFilter,
  search,
  sectionProps,
  segment,
  taskStatusFilter,
  wikiFilter,
}: Readonly<{
  activityTypeFilter: string;
  blockerFilter: string;
  followUpStatusFilter: string;
  onActivityTypeFilter: (value: string) => void;
  onBlockerFilter: (value: string) => void;
  onFollowUpStatusFilter: (value: string) => void;
  onPriorityFilter: (value: string) => void;
  onSearch: (value: string) => void;
  onSegment: (value: WorkLogSegment) => void;
  onTaskStatusFilter: (value: string) => void;
  onWikiFilter: (value: string) => void;
  priorityFilter: string;
  search: string;
  sectionProps?: WorkLogSectionProps;
  segment: WorkLogSegment;
  taskStatusFilter: string;
  wikiFilter: string;
}>) {
  return (
    <section
      {...sectionProps}
      aria-label="Work log filters"
      className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3"
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(240px,360px)_1fr]">
        <label htmlFor="work-log-search">
          <FieldLabel>Search work log</FieldLabel>
          <input
            className={inputClass}
            id="work-log-search"
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search work log"
            type="search"
            value={search}
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <FilterSelect
            id="work-task-status-filter"
            label="Task Status"
            onChange={onTaskStatusFilter}
            options={taskStatuses.map((status) => ({
              label: taskStatusMeta[status].label,
              value: status,
            }))}
            value={taskStatusFilter}
          />
          <FilterSelect
            id="work-activity-type-filter"
            label="Activity Type"
            onChange={onActivityTypeFilter}
            options={activityTypes.map((type) => ({
              label: optionLabel(type),
              value: type,
            }))}
            value={activityTypeFilter}
          />
          <FilterSelect
            id="work-follow-up-status-filter"
            label="Follow-up Status"
            onChange={onFollowUpStatusFilter}
            options={Object.entries(followUpStatusMeta).map(([value, meta]) => ({
              label: meta.label,
              value,
            }))}
            value={followUpStatusFilter}
          />
          <FilterSelect
            id="work-priority-filter"
            label="Priority"
            onChange={onPriorityFilter}
            options={Object.entries(priorityMeta).map(([value, meta]) => ({
              label: meta.label,
              value,
            }))}
            value={priorityFilter}
          />
          <FilterSelect
            id="work-wiki-filter"
            label="Has Wiki Link"
            onChange={onWikiFilter}
            options={[
              { label: "Has wiki", value: "yes" },
              { label: "No wiki", value: "no" },
            ]}
            value={wikiFilter}
          />
          <FilterSelect
            id="work-blocker-filter"
            label="Has Blocker"
            onChange={onBlockerFilter}
            options={[
              { label: "Has blocker", value: "yes" },
              { label: "No blocker", value: "no" },
            ]}
            value={blockerFilter}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Work log segments">
        {segments.map((item, index) => (
          <button
            aria-pressed={segment === item.value}
            className={cn(
              quietButtonClass,
              segment === item.value &&
                "border-[rgba(66,184,131,.42)] bg-[rgba(66,184,131,.14)] text-[var(--text-primary)]",
            )}
            key={`work-log-segment-${index}`}
            onClick={() => onSegment(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function FilterSelect({
  id,
  label,
  onChange,
  options,
  value,
}: Readonly<{
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: readonly { label: string; value: string }[];
  value: string;
}>) {
  return (
    <label htmlFor={id}>
      <FieldLabel>{label}</FieldLabel>
      <select
        className={inputClass}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CurrentWorkEntryCard({
  activities,
  architectureItems,
  canUseLocalWorkDrafts,
  entry,
  onAddActivity,
  onContinueLog,
  onLogWork,
  onOpenActivity,
  onOpenLog,
  tasks,
  wikiEntries,
  profileId,
  state,
}: Readonly<{
  activities: readonly WorkActivity[];
  architectureItems: readonly WorkArchitectureItem[];
  canUseLocalWorkDrafts: boolean;
  entry: WorkLogEntry | null;
  onAddActivity: () => void;
  onContinueLog: (entry: WorkLogEntry) => void;
  onLogWork: () => void;
  onOpenActivity: (activity: WorkActivity) => void;
  onOpenLog: (entry: WorkLogEntry) => void;
  tasks: readonly WorkTask[];
  wikiEntries: readonly WorkWikiEntry[];
  profileId: WorkLogViewModel["profileId"];
  state: WorkLogViewModel["contentStates"]["currentWorkEntry"];
}>) {
  if (!entry) {
    return (
      <Panel
        className="border-[rgba(66,184,131,.30)]"
        sectionProps={{
          "data-work-log-section": "current-work-entry",
          ...contentStateDataAttributes(state, profileId),
        }}
        subtitle="The work journal starts once a local entry exists."
        title="Current Work Entry"
      >
        <EmptyState
          actionLabel={canUseLocalWorkDrafts ? "Log work" : undefined}
          description="Erfasse später lokal, was erledigt wurde, wie es lief und welche Follow-ups bleiben."
          onAction={canUseLocalWorkDrafts ? onLogWork : undefined}
          title="Noch kein Work-Eintrag"
        />
      </Panel>
    );
  }

  const linkedTasks = entry.taskIds
    .map((id) => findTask(tasks, id))
    .filter((task): task is WorkTask => Boolean(task));
  const linkedActivities = entry.activityIds
    .map((id) => findActivity(activities, id))
    .filter((activity): activity is WorkActivity => Boolean(activity));
  const linkedWiki = entry.linkedWikiEntryIds
    .map((id) => findWiki(wikiEntries, id))
    .filter((wiki): wiki is WorkWikiEntry => Boolean(wiki));
  const linkedArchitecture = entry.linkedArchitectureItemIds
    .map((id) => findArchitecture(architectureItems, id))
    .filter((item): item is WorkArchitectureItem => Boolean(item));

  return (
    <section
      aria-labelledby="current-work-entry-title"
      className="overflow-hidden rounded-[var(--panel-radius)] border border-[rgba(66,184,131,.34)] bg-[linear-gradient(180deg,rgba(15,23,36,.98),rgba(15,23,36,.92))] shadow-[0_8px_22px_rgba(0,0,0,.12)]"
      data-work-log-section="current-work-entry"
      {...contentStateDataAttributes(state, profileId)}
    >
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-green)]">
                Current Work Entry
              </p>
              <h2
                className="mt-2 text-2xl font-semibold leading-7 text-[var(--text-primary)]"
                id="current-work-entry-title"
              >
                {entry.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {entry.summary}
              </p>
            </div>
            <Pill accent={logStatusMeta[entry.status].accent}>
              {logStatusMeta[entry.status].label}
            </Pill>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill>{formatDate(entry.date)}</Pill>
            {linkedTasks.map((task) => (
              <Pill accent={workAccent} key={task.id}>
                {task.title}
              </Pill>
            ))}
            {linkedActivities.map((activity) => (
              <button
                className={quietButtonClass}
                key={activity.id}
                onClick={() => onOpenActivity(activity)}
                type="button"
              >
                {activity.title}
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <TextBlock label="What was done" value={entry.summary} />
            <TextBlock label="What was accomplished" value={entry.accomplished} />
            <TextBlock label="How it was done" value={entry.howItWasDone} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ListBlock
              accent={riskAccent}
              emptyLabel="No blockers on this entry."
              items={entry.blockers}
              label="Blockers"
            />
            <ListBlock
              accent={warningAccent}
              emptyLabel="No follow-ups on this entry."
              items={entry.followUps}
              label="Follow-ups"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={primaryButtonClass} onClick={() => onContinueLog(entry)} type="button">
              Continue log
            </button>
            <button className={secondaryButtonClass} onClick={onAddActivity} type="button">
              Add activity
            </button>
            <button className={secondaryButtonClass} onClick={() => onOpenLog(entry)} type="button">
              Open entry
            </button>
          </div>
        </div>
        <div className="border-t border-[var(--border-subtle)] bg-[rgba(7,11,18,.26)] p-4 sm:p-5 xl:border-l xl:border-t-0">
          <div className="grid gap-3">
            <Metric label="Linked Tasks" value={linkedTasks.length} />
            <Metric
              accent={referenceAccent}
              label="Linked Wiki"
              value={linkedWiki.length}
            />
            <Metric
              accent={referenceAccent}
              label="Linked Architecture"
              value={linkedArchitecture.length}
            />
          </div>
          <div className="mt-4 grid gap-3">
            <RelationList label="Linked Wiki" items={linkedWiki.map((item) => item.title)} />
            <RelationList
              label="Linked Architecture"
              items={linkedArchitecture.map((item) => item.title)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function TextBlock({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
        {value}
      </p>
    </div>
  );
}

function ListBlock({
  accent,
  emptyLabel,
  items,
  label,
}: Readonly<{
  accent: string;
  emptyLabel: string;
  items: readonly string[];
  label: string;
}>) {
  return (
    <div className="rounded-[16px] border border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] p-4 [--accent:var(--accent-orange)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: accent }}>
        {label}
      </p>
      {items.length > 0 ? (
        <ul className="mt-2 grid gap-2">
          {items.map((item) => (
            <li className="text-[12px] leading-5 text-[var(--text-secondary)]" key={item}>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[12px] text-[var(--text-muted)]">{emptyLabel}</p>
      )}
    </div>
  );
}

function RelationList({
  items,
  label,
}: Readonly<{ items: readonly string[]; label: string }>) {
  return (
    <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>
      {items.length > 0 ? (
        <ul className="mt-2 grid gap-1">
          {items.map((item) => (
            <li className="text-[12px] leading-5 text-[var(--text-secondary)]" key={item}>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[12px] text-[var(--text-muted)]">No links yet.</p>
      )}
    </div>
  );
}

function WorkTaskContextList({
  activities,
  canUseLocalWorkDrafts,
  onAddActivity,
  onAddTask,
  onOpenTask,
  profileId,
  query,
  state,
  tasks,
  wikiEntries,
}: Readonly<{
  activities: readonly WorkActivity[];
  canUseLocalWorkDrafts: boolean;
  onAddActivity: (task: WorkTask) => void;
  onAddTask: () => void;
  onOpenTask: (task: WorkTask) => void;
  profileId: WorkLogViewModel["profileId"];
  query: string;
  state: WorkLogViewModel["contentStates"]["taskContext"];
  tasks: readonly WorkTask[];
  wikiEntries: readonly WorkWikiEntry[];
}>) {
  return (
    <Panel
      badge={<Pill>{tasks.length} tasks</Pill>}
      sectionProps={{
        "data-work-log-section": "task-context",
        ...contentStateDataAttributes(state, profileId),
      }}
      subtitle="Current task context with next action, not a Jira-style board."
      title="Task Context"
    >
      {tasks.length === 0 ? (
        <EmptyState
          actionLabel={canUseLocalWorkDrafts ? "Add task" : undefined}
          description="Work-Aufgaben erscheinen hier, sobald lokale Tasks mit Work-Kontext vorhanden sind."
          onAction={canUseLocalWorkDrafts ? onAddTask : undefined}
          title={
            query ? "No tasks match the filters" : "Keine verknüpften Work-Aufgaben"
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {tasks.map((task) => {
            const linkedActivities = task.linkedActivityIds
              .map((id) => findActivity(activities, id))
              .filter((activity): activity is WorkActivity => Boolean(activity));
            const linkedWiki = task.linkedWikiEntryIds
              .map((id) => findWiki(wikiEntries, id))
              .filter((wiki): wiki is WorkWikiEntry => Boolean(wiki));

            return (
              <article
                className="rounded-[15px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4 transition hover:border-[var(--border-default)]"
                key={task.id}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <h3 className="text-[14px] font-semibold leading-5 text-[var(--text-primary)]">
                    {task.title}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Pill accent={taskStatusMeta[task.status].accent}>
                      {taskStatusMeta[task.status].label}
                    </Pill>
                    <Pill accent={priorityMeta[task.priority].accent}>
                      {priorityMeta[task.priority].label}
                    </Pill>
                  </div>
                </div>
                <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">
                  {task.context}
                </p>
                <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-primary)]">Next:</span>{" "}
                  {task.nextAction}
                </p>
                <p className="mt-3 text-[11px] text-[var(--text-muted)]">
                  Activities: {linkedActivities.length} · Wiki links: {linkedWiki.length}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className={quietButtonClass} onClick={() => onOpenTask(task)} type="button">
                    Open task
                  </button>
                  <button
                    className={quietButtonClass}
                    disabled={!canUseLocalWorkDrafts}
                    onClick={() => onAddActivity(task)}
                    type="button"
                  >
                    Add activity
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function WorkActivityTimeline({
  activities,
  canUseLocalWorkDrafts,
  onAddActivity,
  onOpenActivity,
  profileId,
  query,
  state,
  tasks,
}: Readonly<{
  activities: readonly WorkActivity[];
  canUseLocalWorkDrafts: boolean;
  onAddActivity: () => void;
  onOpenActivity: (activity: WorkActivity) => void;
  profileId: WorkLogViewModel["profileId"];
  query: string;
  state: WorkLogViewModel["contentStates"]["activityTimeline"];
  tasks: readonly WorkTask[];
}>) {
  return (
    <Panel
      badge={<Pill accent={referenceAccent}>{activities.length} activities</Pill>}
      sectionProps={{
        "data-work-log-section": "activity-timeline",
        ...contentStateDataAttributes(state, profileId),
      }}
      subtitle="Chronological activity notes with result, method and evidence."
      title="Activity Timeline"
    >
      {activities.length === 0 ? (
        <EmptyState
          actionLabel={canUseLocalWorkDrafts ? "Add activity" : undefined}
          description="Add a local activity when work needs result and method context."
          onAction={canUseLocalWorkDrafts ? onAddActivity : undefined}
          title={query ? "No activities match the filters" : "Keine Aktivitäten"}
        />
      ) : (
        <div className="grid gap-3">
          {activities.map((activity) => {
            const task = findTask(tasks, activity.taskId);

            return (
              <article
                className="rounded-[15px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4"
                key={activity.id}
              >
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-semibold leading-5 text-[var(--text-primary)]">
                      {activity.title}
                    </h3>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                      {formatDate(activity.date)} · {activity.durationLabel ?? "No duration"} ·{" "}
                      {task?.title ?? "No linked task"}
                    </p>
                  </div>
                  <Pill accent={referenceAccent}>{optionLabel(activity.type)}</Pill>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                  <TimelineText label="Result" value={activity.result} />
                  <TimelineText label="How it was done" value={activity.howItWasDone} />
                  <TimelineText label="Evidence" value={activity.evidence} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className={quietButtonClass}
                    onClick={() => onOpenActivity(activity)}
                    type="button"
                  >
                    Open activity
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function TimelineText({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <p className="text-[12px] leading-5 text-[var(--text-secondary)]">
      <span className="font-semibold text-[var(--text-primary)]">{label}:</span>{" "}
      {value}
    </p>
  );
}

function OpenWorkFollowUps({
  canUseLocalWorkDrafts,
  followUps,
  onAddFollowUp,
  onMarkDone,
  onOpenSource,
  profileId,
  query,
  state,
}: Readonly<{
  canUseLocalWorkDrafts: boolean;
  followUps: readonly WorkFollowUp[];
  onAddFollowUp: () => void;
  onMarkDone: (followUp: WorkFollowUp) => void;
  onOpenSource: (followUp: WorkFollowUp) => void;
  profileId: WorkLogViewModel["profileId"];
  query: string;
  state: WorkLogViewModel["contentStates"]["openFollowUps"];
}>) {
  return (
    <Panel
      badge={<Pill accent={warningAccent}>{followUps.length} items</Pill>}
      sectionProps={{
        "data-work-log-section": "open-follow-ups",
        ...contentStateDataAttributes(state, profileId),
      }}
      subtitle="Open loops from logs and activities."
      title="Open Follow-ups"
    >
      {followUps.length === 0 ? (
        <EmptyState
          actionLabel={canUseLocalWorkDrafts ? "Add follow-up" : undefined}
          description="No local follow-ups are open for the current filters."
          onAction={canUseLocalWorkDrafts ? onAddFollowUp : undefined}
          title={query ? "No follow-ups match the filters" : "Keine offenen Follow-ups"}
        />
      ) : (
        <div className="grid gap-3">
          {followUps.map((followUp) => (
            <article
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4"
              key={followUp.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-[14px] font-semibold leading-5 text-[var(--text-primary)]">
                    {followUp.title}
                  </h3>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {sourceLabels[followUp.source]}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Pill accent={priorityMeta[followUp.priority].accent}>
                    {priorityMeta[followUp.priority].label}
                  </Pill>
                  <Pill accent={followUpStatusMeta[followUp.status].accent}>
                    {followUpStatusMeta[followUp.status].label}
                  </Pill>
                </div>
              </div>
              <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">Next:</span>{" "}
                {followUp.nextAction}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className={quietButtonClass}
                  disabled={followUp.status === "done"}
                  onClick={() => onMarkDone(followUp)}
                  type="button"
                >
                  Mark done
                </button>
                <button
                  className={quietButtonClass}
                  onClick={() => onOpenSource(followUp)}
                  type="button"
                >
                  Open source
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}

function RecentWorkLogs({
  canUseLocalWorkDrafts,
  entries,
  onLogWork,
  onOpenLog,
  profileId,
  query,
  state,
}: Readonly<{
  canUseLocalWorkDrafts: boolean;
  entries: readonly WorkLogEntry[];
  onLogWork: () => void;
  onOpenLog: (entry: WorkLogEntry) => void;
  profileId: WorkLogViewModel["profileId"];
  query: string;
  state: WorkLogViewModel["contentStates"]["recentWorkLogs"];
}>) {
  return (
    <Panel
      badge={<Pill>{entries.length}</Pill>}
      sectionProps={{
        "data-work-log-section": "recent-work-logs",
        ...contentStateDataAttributes(state, profileId),
      }}
      subtitle="Compact recent entries."
      title="Recent Work Logs"
    >
      {entries.length === 0 ? (
        <EmptyState
          actionLabel={canUseLocalWorkDrafts ? "Log work" : undefined}
          description="Recent work entries appear here after a local log is saved."
          onAction={canUseLocalWorkDrafts ? onLogWork : undefined}
          title={query ? "No work logs match the filters" : "Noch keine Work-Logs"}
        />
      ) : (
        <div className="grid gap-2">
          {entries.slice(0, 5).map((entry) => (
            <button
              className="rounded-[13px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] p-3 text-left transition hover:border-[var(--border-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              key={entry.id}
              onClick={() => onOpenLog(entry)}
              type="button"
            >
              <span className="block text-[13px] font-semibold leading-5 text-[var(--text-primary)]">
                {entry.title}
              </span>
              <span className="mt-1 block text-[11px] text-[var(--text-muted)]">
                {formatDate(entry.date)} · {logStatusMeta[entry.status].label}
              </span>
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}

function LinkedWikiNotesPanel({
  currentEntry,
  onOpenWiki,
  profileId,
  state,
  wikiEntries,
}: Readonly<{
  currentEntry: WorkLogEntry | null;
  onOpenWiki: (entry: WorkWikiEntry) => void;
  profileId: WorkLogViewModel["profileId"];
  state: WorkLogViewModel["contentStates"]["linkedWikiNotes"];
  wikiEntries: readonly WorkWikiEntry[];
}>) {
  const linkedWiki = currentEntry
    ? currentEntry.linkedWikiEntryIds
        .map((id) => findWiki(wikiEntries, id))
        .filter((entry): entry is WorkWikiEntry => Boolean(entry))
    : [];

  return (
    <Panel
      badge={<Pill accent={referenceAccent}>{linkedWiki.length}</Pill>}
      sectionProps={{
        "data-work-log-section": "linked-wiki-notes",
        ...contentStateDataAttributes(state, profileId),
      }}
      subtitle="Wiki notes connected to selected or latest work."
      title="Linked Wiki Notes"
    >
      {linkedWiki.length === 0 ? (
        <EmptyState
          description="Link a wiki note from a log or activity to see it here."
          title="Keine verknüpften Wiki-Notizen"
        />
      ) : (
        <div className="grid gap-2">
          {linkedWiki.map((entry) => (
            <article
              className="rounded-[13px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] p-3"
              key={entry.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
                    {entry.title}
                  </h3>
                  <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
                    {entry.summary}
                  </p>
                </div>
                <Pill accent={referenceAccent}>{optionLabel(entry.type)}</Pill>
              </div>
              <button
                className={cn(quietButtonClass, "mt-3")}
                onClick={() => onOpenWiki(entry)}
                type="button"
              >
                Open wiki entry
              </button>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}

function WorkLogSignals({
  activities,
  followUps,
  logs,
  profileId,
  state,
  wikiEntries,
}: Readonly<{
  activities: readonly WorkActivity[];
  followUps: readonly WorkFollowUp[];
  logs: readonly WorkLogEntry[];
  profileId: WorkLogViewModel["profileId"];
  state: WorkLogViewModel["contentStates"]["workLogSignals"];
  wikiEntries: readonly WorkWikiEntry[];
}>) {
  const weekActivityCount = Math.min(
    4,
    activities.filter((activity) =>
      ["2026-06-17", "2026-06-18", "2026-06-19", "2026-06-20"].includes(
        activity.date,
      ),
    ).length,
  );
  const openFollowUpCount = followUps.filter(
    (followUp) => followUp.status === "open",
  ).length;
  const linkedWikiCount = Math.min(
    3,
    wikiEntries.filter((entry) => entry.relatedLogEntryIds.length > 0).length,
  );
  const reviewActivityCount = Math.min(
    1,
    activities.filter(
      (activity) => activity.blockers.length > 0 || activity.type === "review",
    ).length,
  );
  const hasSignals =
    logs.length + activities.length + followUps.length + wikiEntries.length > 0;

  return (
    <Panel
      sectionProps={{
        "data-work-log-section": "work-log-signals",
        ...contentStateDataAttributes(state, profileId),
      }}
      subtitle="Text-led signals, no productivity scoring."
      title="Work Log Signals"
    >
      <div className="grid gap-2">
        <Metric
          label="Activities"
          value={
            hasSignals
              ? `${weekActivityCount || logs.length} activities logged this week`
              : "0"
          }
        />
        <Metric
          accent={warningAccent}
          label="Follow-ups"
          value={hasSignals ? `${openFollowUpCount} follow-ups open` : "0"}
        />
        <Metric
          accent={referenceAccent}
          label="Wiki"
          value={hasSignals ? `${linkedWikiCount} wiki notes linked` : "0"}
        />
        <Metric
          accent={warningAccent}
          label="Review"
          value={hasSignals ? `${reviewActivityCount} activity needs review` : "0"}
        />
      </div>
    </Panel>
  );
}

function WorkLogDialog({
  activities,
  activityDraft,
  architectureItems,
  dialog,
  dialogError,
  followUpDraft,
  logDraft,
  logs,
  onActivityDraft,
  onClose,
  onFollowUpDraft,
  onLogDraft,
  onSubmitActivity,
  onSubmitFollowUp,
  onSubmitLog,
  onSubmitTask,
  onTaskDraft,
  taskDraft,
  tasks,
  wikiEntries,
}: Readonly<{
  activities: readonly WorkActivity[];
  activityDraft: ActivityDraft;
  architectureItems: readonly WorkArchitectureItem[];
  dialog: Exclude<DialogKind, null>;
  dialogError: string | null;
  followUpDraft: FollowUpDraft;
  logDraft: WorkLogDraft;
  logs: readonly WorkLogEntry[];
  onActivityDraft: (draft: ActivityDraft) => void;
  onClose: () => void;
  onFollowUpDraft: (draft: FollowUpDraft) => void;
  onLogDraft: (draft: WorkLogDraft) => void;
  onSubmitActivity: () => void;
  onSubmitFollowUp: () => void;
  onSubmitLog: () => void;
  onSubmitTask: () => void;
  onTaskDraft: (draft: TaskDraft) => void;
  taskDraft: TaskDraft;
  tasks: readonly WorkTask[];
  wikiEntries: readonly WorkWikiEntry[];
}>) {
  const titleMap: Record<Exclude<DialogKind, null>, string> = {
    log: "Log work",
    activity: "Add activity",
    task: "Add task",
    "follow-up": "Add follow-up",
  };
  const submitMap: Record<Exclude<DialogKind, null>, () => void> = {
    log: onSubmitLog,
    activity: onSubmitActivity,
    task: onSubmitTask,
    "follow-up": onSubmitFollowUp,
  };

  return (
    <div className="flex max-h-[calc(100dvh-24px)] flex-col">
      <div className="border-b border-[var(--border-subtle)] px-5 py-4">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]" id="work-log-dialog-heading">
          {titleMap[dialog]}
        </h2>
        <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
          Saves are local mock state only. Do not add confidential work details.
        </p>
      </div>
      <div className="min-h-0 overflow-y-auto p-5">
        {dialogError ? (
          <div className="mb-4 rounded-[14px] border border-[rgba(221,107,95,.32)] bg-[rgba(221,107,95,.08)] p-3 text-[12px] leading-5 text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--accent-red)]">Save error:</span>{" "}
            {dialogError}
          </div>
        ) : null}

        {dialog === "log" ? (
          <div className="grid gap-4">
            <TextInput
              id="work-log-title"
              label="Title *"
              onChange={(value) => onLogDraft({ ...logDraft, title: value })}
              value={logDraft.title}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput
                id="work-log-date"
                label="Date"
                onChange={(value) => onLogDraft({ ...logDraft, date: value })}
                type="date"
                value={logDraft.date}
              />
              <label htmlFor="work-log-status">
                <FieldLabel>Status</FieldLabel>
                <select
                  className={inputClass}
                  id="work-log-status"
                  onChange={(event) =>
                    onLogDraft({
                      ...logDraft,
                      status: event.target.value as WorkLogStatus,
                    })
                  }
                  value={logDraft.status}
                >
                  {logStatuses.map((status) => (
                    <option key={status} value={status}>
                      {logStatusMeta[status].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <MultiSelect
              id="work-log-tasks"
              label="Linked tasks"
              onChange={(value) => onLogDraft({ ...logDraft, taskIds: value })}
              options={tasks.map((task) => ({ label: task.title, value: task.id }))}
              value={logDraft.taskIds}
            />
            <MultiSelect
              id="work-log-activities"
              label="Linked activities"
              onChange={(value) => onLogDraft({ ...logDraft, activityIds: value })}
              options={activities.map((activity) => ({
                label: activity.title,
                value: activity.id,
              }))}
              value={logDraft.activityIds}
            />
            <TextArea
              id="work-log-summary"
              label="What was done *"
              onChange={(value) => onLogDraft({ ...logDraft, summary: value })}
              value={logDraft.summary}
            />
            <TextArea
              id="work-log-accomplished"
              label="What was accomplished *"
              onChange={(value) =>
                onLogDraft({ ...logDraft, accomplished: value })
              }
              value={logDraft.accomplished}
            />
            <TextArea
              id="work-log-how"
              label="How it was done *"
              onChange={(value) =>
                onLogDraft({ ...logDraft, howItWasDone: value })
              }
              value={logDraft.howItWasDone}
            />
            <TextArea
              id="work-log-blockers"
              label="Blockers"
              onChange={(value) => onLogDraft({ ...logDraft, blockers: value })}
              optional
              value={logDraft.blockers}
            />
            <TextArea
              id="work-log-follow-ups"
              label="Follow-ups"
              onChange={(value) => onLogDraft({ ...logDraft, followUps: value })}
              optional
              value={logDraft.followUps}
            />
            <MultiSelect
              id="work-log-wiki-links"
              label="Linked wiki entries"
              onChange={(value) =>
                onLogDraft({ ...logDraft, linkedWikiEntryIds: value })
              }
              options={wikiEntries.map((entry) => ({
                label: entry.title,
                value: entry.id,
              }))}
              value={logDraft.linkedWikiEntryIds}
            />
            <MultiSelect
              id="work-log-architecture-links"
              label="Linked architecture items"
              onChange={(value) =>
                onLogDraft({ ...logDraft, linkedArchitectureItemIds: value })
              }
              options={architectureItems.map((item) => ({
                label: item.title,
                value: item.id,
              }))}
              value={logDraft.linkedArchitectureItemIds}
            />
          </div>
        ) : null}

        {dialog === "activity" ? (
          <div className="grid gap-4">
            <TextInput
              id="work-activity-title"
              label="Title *"
              onChange={(value) =>
                onActivityDraft({ ...activityDraft, title: value })
              }
              value={activityDraft.title}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <label htmlFor="work-activity-type">
                <FieldLabel>Type</FieldLabel>
                <select
                  className={inputClass}
                  id="work-activity-type"
                  onChange={(event) =>
                    onActivityDraft({
                      ...activityDraft,
                      type: event.target.value as WorkActivityType,
                    })
                  }
                  value={activityDraft.type}
                >
                  {activityTypes.map((type) => (
                    <option key={type} value={type}>
                      {optionLabel(type)}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="work-activity-task">
                <FieldLabel>Linked task</FieldLabel>
                <select
                  className={inputClass}
                  id="work-activity-task"
                  onChange={(event) =>
                    onActivityDraft({ ...activityDraft, taskId: event.target.value })
                  }
                  value={activityDraft.taskId}
                >
                  <option value="">No task</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </label>
              <TextInput
                id="work-activity-date"
                label="Date"
                onChange={(value) =>
                  onActivityDraft({ ...activityDraft, date: value })
                }
                type="date"
                value={activityDraft.date}
              />
            </div>
            <TextInput
              id="work-activity-duration"
              label="Duration"
              onChange={(value) =>
                onActivityDraft({ ...activityDraft, durationLabel: value })
              }
              optional
              value={activityDraft.durationLabel}
            />
            <TextArea
              id="work-activity-summary"
              label="Summary *"
              onChange={(value) =>
                onActivityDraft({ ...activityDraft, summary: value })
              }
              value={activityDraft.summary}
            />
            <TextArea
              id="work-activity-result"
              label="Result *"
              onChange={(value) =>
                onActivityDraft({ ...activityDraft, result: value })
              }
              value={activityDraft.result}
            />
            <TextArea
              id="work-activity-how"
              label="How it was done *"
              onChange={(value) =>
                onActivityDraft({ ...activityDraft, howItWasDone: value })
              }
              value={activityDraft.howItWasDone}
            />
            <TextArea
              id="work-activity-evidence"
              label="Evidence"
              onChange={(value) =>
                onActivityDraft({ ...activityDraft, evidence: value })
              }
              optional
              value={activityDraft.evidence}
            />
            <TextArea
              id="work-activity-blockers"
              label="Blockers"
              onChange={(value) =>
                onActivityDraft({ ...activityDraft, blockers: value })
              }
              optional
              value={activityDraft.blockers}
            />
            <TextArea
              id="work-activity-follow-ups"
              label="Follow-ups"
              onChange={(value) =>
                onActivityDraft({ ...activityDraft, followUps: value })
              }
              optional
              value={activityDraft.followUps}
            />
            <MultiSelect
              id="work-activity-wiki-links"
              label="Linked wiki entries"
              onChange={(value) =>
                onActivityDraft({ ...activityDraft, linkedWikiEntryIds: value })
              }
              options={wikiEntries.map((entry) => ({
                label: entry.title,
                value: entry.id,
              }))}
              value={activityDraft.linkedWikiEntryIds}
            />
          </div>
        ) : null}

        {dialog === "task" ? (
          <div className="grid gap-4">
            <TextInput
              id="work-task-title"
              label="Title *"
              onChange={(value) => onTaskDraft({ ...taskDraft, title: value })}
              value={taskDraft.title}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="work-task-status">
                <FieldLabel>Status</FieldLabel>
                <select
                  className={inputClass}
                  id="work-task-status"
                  onChange={(event) =>
                    onTaskDraft({
                      ...taskDraft,
                      status: event.target.value as WorkTaskStatus,
                    })
                  }
                  value={taskDraft.status}
                >
                  {taskStatuses.map((status) => (
                    <option key={status} value={status}>
                      {taskStatusMeta[status].label}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="work-task-priority">
                <FieldLabel>Priority</FieldLabel>
                <select
                  className={inputClass}
                  id="work-task-priority"
                  onChange={(event) =>
                    onTaskDraft({
                      ...taskDraft,
                      priority: event.target.value as WorkTask["priority"],
                    })
                  }
                  value={taskDraft.priority}
                >
                  {Object.entries(priorityMeta).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <TextArea
              id="work-task-context"
              label="Context"
              onChange={(value) => onTaskDraft({ ...taskDraft, context: value })}
              optional
              value={taskDraft.context}
            />
            <TextArea
              id="work-task-next-action"
              label="Next Action *"
              onChange={(value) =>
                onTaskDraft({ ...taskDraft, nextAction: value })
              }
              value={taskDraft.nextAction}
            />
            <MultiSelect
              id="work-task-wiki-links"
              label="Linked wiki entries"
              onChange={(value) =>
                onTaskDraft({ ...taskDraft, linkedWikiEntryIds: value })
              }
              options={wikiEntries.map((entry) => ({
                label: entry.title,
                value: entry.id,
              }))}
              value={taskDraft.linkedWikiEntryIds}
            />
          </div>
        ) : null}

        {dialog === "follow-up" ? (
          <div className="grid gap-4">
            <TextInput
              id="work-follow-up-title"
              label="Title *"
              onChange={(value) =>
                onFollowUpDraft({ ...followUpDraft, title: value })
              }
              value={followUpDraft.title}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <label htmlFor="work-follow-up-source">
                <FieldLabel>Source</FieldLabel>
                <select
                  className={inputClass}
                  id="work-follow-up-source"
                  onChange={(event) =>
                    onFollowUpDraft({
                      ...followUpDraft,
                      source: event.target.value as WorkFollowUp["source"],
                    })
                  }
                  value={followUpDraft.source}
                >
                  {Object.entries(sourceLabels).map(([source, label]) => (
                    <option key={source} value={source}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="work-follow-up-priority">
                <FieldLabel>Priority</FieldLabel>
                <select
                  className={inputClass}
                  id="work-follow-up-priority"
                  onChange={(event) =>
                    onFollowUpDraft({
                      ...followUpDraft,
                      priority: event.target.value as WorkFollowUp["priority"],
                    })
                  }
                  value={followUpDraft.priority}
                >
                  {Object.entries(priorityMeta).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="work-follow-up-status">
                <FieldLabel>Status</FieldLabel>
                <select
                  className={inputClass}
                  id="work-follow-up-status"
                  onChange={(event) =>
                    onFollowUpDraft({
                      ...followUpDraft,
                      status: event.target.value as WorkFollowUp["status"],
                    })
                  }
                  value={followUpDraft.status}
                >
                  {Object.entries(followUpStatusMeta).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <TextArea
              id="work-follow-up-next-action"
              label="Next Action *"
              onChange={(value) =>
                onFollowUpDraft({ ...followUpDraft, nextAction: value })
              }
              value={followUpDraft.nextAction}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <SingleSelect
                id="work-follow-up-log"
                label="Linked work log"
                onChange={(value) =>
                  onFollowUpDraft({ ...followUpDraft, linkedLogEntryId: value })
                }
                options={logs.map((entry) => ({ label: entry.title, value: entry.id }))}
                value={followUpDraft.linkedLogEntryId}
              />
              <SingleSelect
                id="work-follow-up-activity"
                label="Linked activity"
                onChange={(value) =>
                  onFollowUpDraft({ ...followUpDraft, linkedActivityId: value })
                }
                options={activities.map((activity) => ({
                  label: activity.title,
                  value: activity.id,
                }))}
                value={followUpDraft.linkedActivityId}
              />
              <SingleSelect
                id="work-follow-up-wiki"
                label="Linked wiki"
                onChange={(value) =>
                  onFollowUpDraft({ ...followUpDraft, linkedWikiEntryId: value })
                }
                options={wikiEntries.map((entry) => ({
                  label: entry.title,
                  value: entry.id,
                }))}
                value={followUpDraft.linkedWikiEntryId}
              />
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
        <button className={secondaryButtonClass} onClick={onClose} type="button">
          Cancel
        </button>
        <button className={primaryButtonClass} onClick={submitMap[dialog]} type="button">
          Save locally
        </button>
      </div>
    </div>
  );
}

function TextInput({
  id,
  label,
  onChange,
  optional,
  type = "text",
  value,
}: Readonly<{
  id: string;
  label: string;
  onChange: (value: string) => void;
  optional?: boolean;
  type?: string;
  value: string;
}>) {
  return (
    <label htmlFor={id}>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <input
        className={inputClass}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

function TextArea({
  id,
  label,
  onChange,
  optional,
  value,
}: Readonly<{
  id: string;
  label: string;
  onChange: (value: string) => void;
  optional?: boolean;
  value: string;
}>) {
  return (
    <label htmlFor={id}>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <textarea
        className={textareaClass}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function MultiSelect({
  id,
  label,
  onChange,
  options,
  value,
}: Readonly<{
  id: string;
  label: string;
  onChange: (value: string[]) => void;
  options: readonly { label: string; value: string }[];
  value: string[];
}>) {
  return (
    <label htmlFor={id}>
      <FieldLabel optional>{label}</FieldLabel>
      <select
        className={cn(inputClass, "min-h-[124px] py-2")}
        id={id}
        multiple
        onChange={(event) => onChange(selectedValues(event))}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SingleSelect({
  id,
  label,
  onChange,
  options,
  value,
}: Readonly<{
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: readonly { label: string; value: string }[];
  value: string;
}>) {
  return (
    <label htmlFor={id}>
      <FieldLabel optional>{label}</FieldLabel>
      <select
        className={inputClass}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">No link</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function WorkLogInspector({
  activities,
  architectureItems,
  onAddActivity,
  onAddFollowUp,
  onClose,
  selectedActivity,
  selectedLog,
  selectedTask,
  tasks,
  wikiEntries,
}: Readonly<{
  activities: readonly WorkActivity[];
  architectureItems: readonly WorkArchitectureItem[];
  onAddActivity: (task: WorkTask) => void;
  onAddFollowUp: (activity: WorkActivity) => void;
  onClose: () => void;
  selectedActivity: WorkActivity | null;
  selectedLog: WorkLogEntry | null;
  selectedTask: WorkTask | null;
  tasks: readonly WorkTask[];
  wikiEntries: readonly WorkWikiEntry[];
}>) {
  const open = Boolean(selectedTask || selectedActivity || selectedLog);

  return (
    <DialogShell labelledBy="work-log-inspector-heading" onClose={onClose} open={open} sheet>
      <div className="flex h-full flex-col">
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]" id="work-log-inspector-heading">
            {selectedTask?.title ?? selectedActivity?.title ?? selectedLog?.title ?? "Inspector"}
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
            Local detail view for work context.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {selectedTask ? (
            <TaskInspectorBody
              activities={activities}
              onAddActivity={() => onAddActivity(selectedTask)}
              selectedTask={selectedTask}
              wikiEntries={wikiEntries}
            />
          ) : null}
          {selectedActivity ? (
            <ActivityInspectorBody
              architectureItems={architectureItems}
              onAddFollowUp={() => onAddFollowUp(selectedActivity)}
              selectedActivity={selectedActivity}
              tasks={tasks}
              wikiEntries={wikiEntries}
            />
          ) : null}
          {selectedLog ? (
              <LogInspectorBody
                activities={activities}
                architectureItems={architectureItems}
                selectedLog={selectedLog}
                tasks={tasks}
                wikiEntries={wikiEntries}
            />
          ) : null}
        </div>
        <div className="flex justify-end border-t border-[var(--border-subtle)] px-5 py-4">
          <button className={secondaryButtonClass} onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

function TaskInspectorBody({
  activities,
  onAddActivity,
  selectedTask,
  wikiEntries,
}: Readonly<{
  activities: readonly WorkActivity[];
  onAddActivity: () => void;
  selectedTask: WorkTask;
  wikiEntries: readonly WorkWikiEntry[];
}>) {
  const linkedActivities = selectedTask.linkedActivityIds
    .map((id) => findActivity(activities, id))
    .filter((activity): activity is WorkActivity => Boolean(activity));
  const linkedWiki = selectedTask.linkedWikiEntryIds
    .map((id) => findWiki(wikiEntries, id))
    .filter((entry): entry is WorkWikiEntry => Boolean(entry));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Pill accent={taskStatusMeta[selectedTask.status].accent}>
          {taskStatusMeta[selectedTask.status].label}
        </Pill>
        <Pill accent={priorityMeta[selectedTask.priority].accent}>
          {priorityMeta[selectedTask.priority].label}
        </Pill>
      </div>
      <InspectorBlock label="Context" value={selectedTask.context} />
      <InspectorBlock label="Next Action" value={selectedTask.nextAction} />
      <RelationList
        label="Activities"
        items={linkedActivities.map((activity) => activity.title)}
      />
      <RelationList label="Wiki Links" items={linkedWiki.map((entry) => entry.title)} />
      <button className={primaryButtonClass} onClick={onAddActivity} type="button">
        Add activity
      </button>
    </div>
  );
}

function ActivityInspectorBody({
  architectureItems,
  onAddFollowUp,
  selectedActivity,
  tasks,
  wikiEntries,
}: Readonly<{
  architectureItems: readonly WorkArchitectureItem[];
  onAddFollowUp: () => void;
  selectedActivity: WorkActivity;
  tasks: readonly WorkTask[];
  wikiEntries: readonly WorkWikiEntry[];
}>) {
  const task = findTask(tasks, selectedActivity.taskId);
  const linkedWiki = selectedActivity.linkedWikiEntryIds
    .map((id) => findWiki(wikiEntries, id))
    .filter((entry): entry is WorkWikiEntry => Boolean(entry));
  const linkedArchitecture = selectedActivity.linkedArchitectureItemIds
    .map((id) => findArchitecture(architectureItems, id))
    .filter((item): item is WorkArchitectureItem => Boolean(item));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Pill accent={referenceAccent}>{optionLabel(selectedActivity.type)}</Pill>
        <Pill>{formatDate(selectedActivity.date)}</Pill>
        {task ? <Pill>{task.title}</Pill> : null}
      </div>
      <InspectorBlock label="Summary" value={selectedActivity.summary} />
      <InspectorBlock label="Result" value={selectedActivity.result} />
      <InspectorBlock label="How it was done" value={selectedActivity.howItWasDone} />
      <InspectorBlock label="Evidence" value={selectedActivity.evidence} />
      <RelationList label="Blockers" items={selectedActivity.blockers} />
      <RelationList label="Follow-ups" items={selectedActivity.followUps} />
      <RelationList label="Linked Wiki" items={linkedWiki.map((entry) => entry.title)} />
      <RelationList
        label="Linked Architecture"
        items={linkedArchitecture.map((item) => item.title)}
      />
      <button className={primaryButtonClass} onClick={onAddFollowUp} type="button">
        Add follow-up
      </button>
    </div>
  );
}

function LogInspectorBody({
  activities,
  architectureItems,
  selectedLog,
  tasks,
  wikiEntries,
}: Readonly<{
  activities: readonly WorkActivity[];
  architectureItems: readonly WorkArchitectureItem[];
  selectedLog: WorkLogEntry;
  tasks: readonly WorkTask[];
  wikiEntries: readonly WorkWikiEntry[];
}>) {
  const linkedTasks = selectedLog.taskIds
    .map((id) => findTask(tasks, id))
    .filter((task): task is WorkTask => Boolean(task));
  const linkedActivities = selectedLog.activityIds
    .map((id) => findActivity(activities, id))
    .filter((activity): activity is WorkActivity => Boolean(activity));
  const linkedWiki = selectedLog.linkedWikiEntryIds
    .map((id) => findWiki(wikiEntries, id))
    .filter((entry): entry is WorkWikiEntry => Boolean(entry));
  const linkedArchitecture = selectedLog.linkedArchitectureItemIds
    .map((id) => findArchitecture(architectureItems, id))
    .filter((item): item is WorkArchitectureItem => Boolean(item));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Pill accent={logStatusMeta[selectedLog.status].accent}>
          {logStatusMeta[selectedLog.status].label}
        </Pill>
        <Pill>{formatDate(selectedLog.date)}</Pill>
      </div>
      <InspectorBlock label="What was done" value={selectedLog.summary} />
      <InspectorBlock label="What was accomplished" value={selectedLog.accomplished} />
      <InspectorBlock label="How it was done" value={selectedLog.howItWasDone} />
      <RelationList label="Tasks" items={linkedTasks.map((task) => task.title)} />
      <RelationList
        label="Activities"
        items={linkedActivities.map((activity) => activity.title)}
      />
      <RelationList label="Blockers" items={selectedLog.blockers} />
      <RelationList label="Follow-ups" items={selectedLog.followUps} />
      <RelationList label="Linked Wiki" items={linkedWiki.map((entry) => entry.title)} />
      <RelationList
        label="Linked Architecture"
        items={linkedArchitecture.map((item) => item.title)}
      />
    </div>
  );
}

function InspectorBlock({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
        {value}
      </p>
    </div>
  );
}
