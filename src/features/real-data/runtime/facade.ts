import "server-only";
import type { ApplicationData } from "./application-context";
import type { ApplicationUseCases } from "./use-cases";
export const createGoalContextProject = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["createGoalContextProject"]>
) => data.useCases.createGoalContextProject(...args);
export const createGoalContextTask = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["createGoalContextTask"]>
) => data.useCases.createGoalContextTask(...args);
export const getGoalOutcome = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["getGoalOutcome"]>
) => data.useCases.getGoalOutcome(...args);
export const getGoalOutcomeSummaries = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["getGoalOutcomeSummaries"]>
) => data.useCases.getGoalOutcomeSummaries(...args);
export const createGoalMilestone = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["createGoalMilestone"]>
) => data.useCases.createGoalMilestone(...args);
export const updateGoalMilestone = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["updateGoalMilestone"]>
) => data.useCases.updateGoalMilestone(...args);
export const setGoalMilestoneStatus = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["setGoalMilestoneStatus"]>
) => data.useCases.setGoalMilestoneStatus(...args);
export const archiveGoalMilestone = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["archiveGoalMilestone"]>
) => data.useCases.archiveGoalMilestone(...args);
export const reorderGoalMilestone = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["reorderGoalMilestone"]>
) => data.useCases.reorderGoalMilestone(...args);
export const createGoalCriterion = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["createGoalCriterion"]>
) => data.useCases.createGoalCriterion(...args);
export const archiveGoalCriterion = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["archiveGoalCriterion"]>
) => data.useCases.archiveGoalCriterion(...args);
export const appendGoalCriterionEvaluation = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["appendGoalCriterionEvaluation"]>
) => data.useCases.appendGoalCriterionEvaluation(...args);
export const appendGoalCriterionRevision = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["appendGoalCriterionRevision"]>
) => data.useCases.appendGoalCriterionRevision(...args);
export const addGoalCriterionEvidence = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["addGoalCriterionEvidence"]>
) => data.useCases.addGoalCriterionEvidence(...args);
export const addGoalMilestoneEvidence = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["addGoalMilestoneEvidence"]>
) => data.useCases.addGoalMilestoneEvidence(...args);
export const addGoalAchievementEvidence = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["addGoalAchievementEvidence"]>
) => data.useCases.addGoalAchievementEvidence(...args);
export const amendGoalMilestoneAchievementEvent = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["amendGoalMilestoneAchievementEvent"]>
) => data.useCases.amendGoalMilestoneAchievementEvent(...args);
export const amendGoalAchievementEvent = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["amendGoalAchievementEvent"]>
) => data.useCases.amendGoalAchievementEvent(...args);
export const addGoalProjectSupport = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["addGoalProjectSupport"]>
) => data.useCases.addGoalProjectSupport(...args);
export const removeGoalProjectSupport = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["removeGoalProjectSupport"]>
) => data.useCases.removeGoalProjectSupport(...args);
export const addGoalTaskSupport = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["addGoalTaskSupport"]>
) => data.useCases.addGoalTaskSupport(...args);
export const removeGoalTaskSupport = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["removeGoalTaskSupport"]>
) => data.useCases.removeGoalTaskSupport(...args);
export const achieveGoal = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["achieveGoal"]>
) => data.useCases.achieveGoal(...args);
export const reopenGoal = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["reopenGoal"]>
) => data.useCases.reopenGoal(...args);
export const readProjectDepth = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["readProjectDepth"]>
) => data.useCases.readProjectDepth(...args);
export const writeProjectDepth = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["writeProjectDepth"]>
) => data.useCases.writeProjectDepth(...args);
export const writeProjectMilestone = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["writeProjectMilestone"]>
) => data.useCases.writeProjectMilestone(...args);
export const setProjectResourceRole = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["setProjectResourceRole"]>
) => data.useCases.setProjectResourceRole(...args);
export const readTaskDependencyGraph = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["readTaskDependencyGraph"]>
) => data.useCases.readTaskDependencyGraph(...args);
export const writeTaskDependency = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["writeTaskDependency"]>
) => data.useCases.writeTaskDependency(...args);
export const writeTaskStep = (
  data: ApplicationData,
  ...args: Parameters<ApplicationUseCases["writeTaskStep"]>
) => data.useCases.writeTaskStep(...args);
export const getTaskRepository = (data: ApplicationData) =>
  data.repositories.tasks;
export const getProjectRepository = (data: ApplicationData) =>
  data.repositories.projects;
export const getGoalRepository = (data: ApplicationData) =>
  data.repositories.goals;
export const getSkillRepository = (data: ApplicationData) =>
  data.repositories.skills;
export const getResourceRepository = (data: ApplicationData) =>
  data.repositories.resources;
export const getInboxRepository = (data: ApplicationData) =>
  data.repositories.inbox;
export const getNutritionRepository = (data: ApplicationData) =>
  data.repositories.nutrition;
export const getReviewRepository = (data: ApplicationData) =>
  data.repositories.reviews;
export const getScheduleSourceRepository = (data: ApplicationData) =>
  data.repositories.scheduling;
export const getHealthRepository = (data: ApplicationData) =>
  data.repositories.health;
export const getHabitRepository = (data: ApplicationData) =>
  data.repositories.habits;
export const getTrainingRepository = (data: ApplicationData) =>
  data.repositories.training;
export const readTodayActivity = (
  data: ApplicationData,
  _userId: string,
  now?: Date,
) => {
  void _userId;
  return data.reads.todayActivity(now);
};
export const readWeeklyPlanningContext = (
  data: ApplicationData,
  _userId: string,
) => {
  void _userId;
  return data.reads.weeklyPlanning();
};
export const getCodingRepository = (data: ApplicationData) =>
  data.repositories.coding;
export const getEducationRepository = (data: ApplicationData) =>
  data.repositories.education;
export const getWorkRepository = (data: ApplicationData) =>
  data.repositories.work;
export const getWorkKnowledgeRepository = (data: ApplicationData) =>
  data.repositories.workKnowledge;
export const getWorkMeetingRepository = (data: ApplicationData) =>
  data.repositories.workMeetings;
export const getLifeRepository = (data: ApplicationData) =>
  data.repositories.life;
export const getAntiRotRepository = (data: ApplicationData) =>
  data.repositories.antiRot;
export const getChallengeRepository = (data: ApplicationData) =>
  data.repositories.challenges;
export const getShopRepository = (data: ApplicationData) =>
  data.repositories.shop;
export const getInboxWorkspaceRepository = (
  data: ApplicationData,
  _userId: string,
) => {
  void _userId;
  return data.repositories.inboxWorkspace;
};
export const getInboxTriageTransaction = (data: ApplicationData) =>
  data.useCases.triageInbox;
export const getInboxResourceTransaction = (data: ApplicationData) =>
  data.useCases.resourceFromInbox;
