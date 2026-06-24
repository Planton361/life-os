import type { Metadata } from "next";
import {
  SettingsPage as SettingsFeaturePage,
  getSettingsViewModel,
} from "@/features/settings";
import {
  ProfileDataSettingsPanel,
  getCurrentLifeOsProfileId,
} from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Settings | Life OS",
  description:
    "Profile, appearance, privacy and system settings in local mock mode.",
};

export default async function SettingsPage() {
  const profileId = await getCurrentLifeOsProfileId();
  const viewModel = {
    ...getSettingsViewModel(),
    profileId,
  };

  return (
    <>
      <SettingsFeaturePage viewModel={viewModel} />
      <ProfileDataSettingsPanel />
    </>
  );
}
