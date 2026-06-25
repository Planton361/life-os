import type { Metadata } from "next";
import { SupabaseAuthPanel } from "@/features/auth";
import { SettingsPage as SettingsFeaturePage } from "@/features/settings/settings-page";
import { getSettingsViewModel } from "@/features/settings/settings-view-model";
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
      <div className="mx-auto mt-3 w-full max-w-[2208px]">
        <SupabaseAuthPanel />
      </div>
      <ProfileDataSettingsPanel />
    </>
  );
}
