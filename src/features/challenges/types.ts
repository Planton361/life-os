export type ChallengeCadence = "daily" | "weekly" | "monthly";

export type ChallengeStatus =
  | "active"
  | "completed"
  | "failed"
  | "paused"
  | "draft"
  | "archived";

export type ChallengeDifficulty = "easy" | "medium" | "hard";

export type Challenge = {
  id: string;
  title: string;
  cadence: ChallengeCadence;
  status: ChallengeStatus;
  difficulty: ChallengeDifficulty;
  description: string;
  rewardAmount: number;
  progressCurrent: number;
  progressTarget: number;
  progressLabel: string;
  linkedArea?:
    | "health"
    | "education"
    | "work"
    | "coding"
    | "personal"
    | "nutrition"
    | "review";
  dueLabel?: string;
  completedAt?: string;
  nextAction: string;
  createdByUser: boolean;
};

export type ChallengeTemplate = {
  title: string;
  cadence: ChallengeCadence;
  difficulty: ChallengeDifficulty;
  description: string;
  rewardAmount: number;
  progressTarget: number;
  linkedArea?: Challenge["linkedArea"];
  dueLabel?: string;
  nextAction: string;
};

export type ChallengesViewModel = {
  profileId: "demo" | "empty" | "manual";
  challenges: Challenge[];
  templates: ChallengeTemplate[];
  rules: string[];
};
