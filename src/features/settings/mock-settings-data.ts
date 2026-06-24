import type {
  SettingsAppearance,
  SettingsPreference,
  SettingsPrivacy,
  SettingsProfile,
  SettingsViewModel,
} from "./types";

export const settingsProfile: SettingsProfile = {
  avatarInitials: "A",
  avatarMode: "initials",
  description: "Master Wirtschaftsinformatik · Coding · Work · Health",
  displayName: "Anton",
  roleLabel: "Student · Werkstudent",
};

export const settingsAppearance: SettingsAppearance = {
  accentColor: "blue",
  density: "comfortable",
  reducedMotion: false,
  theme: "dark",
};

export const settingsPrivacy: SettingsPrivacy = {
  hideSensitiveWidgets: true,
  privateMode: true,
  showJournalSnippets: false,
  showWorkSnippets: true,
};

export const settingsPreferences: SettingsPreference[] = [
  {
    id: "default-start-page",
    label: "Default Start Page",
    description: "Dashboard",
    enabled: true,
  },
  {
    id: "sidebar-density",
    label: "Sidebar Density",
    description: "Comfortable navigation density",
    enabled: true,
  },
  {
    id: "command-center-visibility",
    label: "Command Center visibility",
    description: "Show command center on app pages that support it",
    enabled: true,
  },
  {
    id: "reminder-placeholders",
    label: "Reminder placeholders",
    description: "Prepared UI only. No notifications are sent.",
    enabled: false,
  },
  {
    id: "review-prompts-visible",
    label: "Review prompts visible",
    description: "Show review prompt placeholders in review-adjacent flows",
    enabled: true,
  },
];

export const settingsViewModel: SettingsViewModel = {
  appearance: settingsAppearance,
  preferences: settingsPreferences,
  profileId: "demo",
  privacy: settingsPrivacy,
  profile: settingsProfile,
  systemInfo: {
    appName: "Life OS",
    designDirection: "Life OS - Linear Calm Dark Command Center",
    integrations: "No external integrations",
    mockDataMode: "Static mock data",
    versionLabel: "MVP static phase",
  },
};
