import type { LifeOsProfileId } from "@/features/profile-data";
import type { RealDataRepository } from "./real-data-repository";

export const profileDataAdapterKinds = ["demo", "empty", "manual"] as const;

export type ProfileDataAdapterKind = (typeof profileDataAdapterKinds)[number];

export type ProfileDataAdapterSource =
  | "fixture"
  | "empty"
  | "manual-json"
  | "supabase";

export type ProfileDataAdapterCapabilities = {
  canRead: boolean;
  canWrite: boolean;
  supportsTransactions: boolean;
};

export type ProfileDataAdapterContract = {
  kind: ProfileDataAdapterKind;
  profileId: LifeOsProfileId;
  source: ProfileDataAdapterSource;
  capabilities: ProfileDataAdapterCapabilities;
  repository: RealDataRepository;
};

export type DemoProfileDataAdapterContract = ProfileDataAdapterContract & {
  kind: "demo";
  profileId: "demo";
  source: "fixture";
  capabilities: {
    canRead: true;
    canWrite: false;
    supportsTransactions: false;
  };
};

export type EmptyProfileDataAdapterContract = ProfileDataAdapterContract & {
  kind: "empty";
  profileId: "empty";
  source: "empty";
  capabilities: {
    canRead: true;
    canWrite: false;
    supportsTransactions: false;
  };
};

export type ManualProfileDataAdapterContract = ProfileDataAdapterContract & {
  kind: "manual";
  profileId: "manual";
  source: "manual-json" | "supabase";
};

export type ProfileDataAdapterRegistry = {
  demo: DemoProfileDataAdapterContract;
  empty: EmptyProfileDataAdapterContract;
  manual: ManualProfileDataAdapterContract;
};
