export type SettingsProfile = {
  displayName: string;
  roleLabel: string;
  description: string;
  avatarMode: "initials" | "local_preview" | "none";
  avatarInitials: string;
};

export type SettingsAppearance = {
  theme: "dark" | "system" | "light";
  accentColor: "blue" | "green" | "orange" | "purple" | "cyan" | "gray";
  density: "comfortable" | "compact";
  reducedMotion: boolean;
};

export type SettingsPrivacy = {
  privateMode: boolean;
  hideSensitiveWidgets: boolean;
  showJournalSnippets: boolean;
  showWorkSnippets: boolean;
};

export type SettingsPreference = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

export type SettingsViewModel = {
  profile: SettingsProfile;
  appearance: SettingsAppearance;
  privacy: SettingsPrivacy;
  preferences: SettingsPreference[];
  systemInfo: {
    appName: string;
    designDirection: string;
    mockDataMode: string;
    versionLabel: string;
    integrations: string;
  };
};

