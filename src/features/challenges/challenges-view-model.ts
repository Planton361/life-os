import {
  challengeRules,
  challengeTemplates,
  challenges,
} from "./mock-challenges-data";
import type { ChallengesViewModel } from "./types";

export function getChallengesViewModel(): ChallengesViewModel {
  return {
    challenges,
    profileId: "demo",
    rules: challengeRules,
    templates: challengeTemplates,
  };
}
