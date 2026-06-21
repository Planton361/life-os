import type { Metadata } from "next";
import {
  SettingsPage as SettingsFeaturePage,
  getSettingsViewModel,
} from "@/features/settings";

export const metadata: Metadata = {
  title: "Settings | Life OS",
  description:
    "Profile, appearance, privacy and system settings in local mock mode.",
};

export default function SettingsPage() {
  const viewModel = getSettingsViewModel();

  return <SettingsFeaturePage viewModel={viewModel} />;
}
