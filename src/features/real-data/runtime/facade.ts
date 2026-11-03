import "server-only";
import type { ApplicationData } from "./application-context";
import type { ApplicationUseCases } from "./use-cases";
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
