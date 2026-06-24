"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import {
  contentStateDataAttributes,
  resolveContentStateMeta,
} from "@/features/content-state";
import {
  DialogShell,
  EmptyState,
  FieldLabel,
  LocalMockNotice,
  Pill,
  StatusPill,
  SystemPageHeader,
  SystemPageShell,
  SystemPanel,
  Toast,
  chipButtonClass,
  inputClass,
  optionLabel,
  primaryButtonClass,
  quietButtonClass,
  secondaryButtonClass,
  textareaClass,
  type ToastState,
} from "@/features/system/system-ui";
import type {
  SettingsAppearance,
  SettingsPreference,
  SettingsPrivacy,
  SettingsProfile,
  SettingsViewModel,
} from "./types";

const settingsAccent = "var(--accent-cyan)";

const themeOptions: SettingsAppearance["theme"][] = ["dark", "system", "light"];
const accentOptions: SettingsAppearance["accentColor"][] = [
  "blue",
  "green",
  "orange",
  "purple",
  "cyan",
  "gray",
];
const densityOptions: SettingsAppearance["density"][] = ["comfortable", "compact"];
const avatarModeOptions: SettingsProfile["avatarMode"][] = [
  "initials",
  "local_preview",
  "none",
];

const accentToken: Record<SettingsAppearance["accentColor"], string> = {
  blue: "var(--accent-blue)",
  cyan: "var(--accent-cyan)",
  gray: "var(--text-muted)",
  green: "var(--accent-green)",
  orange: "var(--accent-orange)",
  purple: "var(--accent-purple)",
};

function sectionStateAttributes({
  capacity,
  itemCount,
  profileId,
  section,
}: Readonly<{
  capacity: number;
  itemCount: number;
  profileId: SettingsViewModel["profileId"];
  section: string;
}>) {
  return {
    ...contentStateDataAttributes(
      resolveContentStateMeta({ capacity, itemCount }),
      profileId,
    ),
    "data-settings-section": section,
  };
}

function clonePreferences(preferences: SettingsPreference[]) {
  return preferences.map((preference) => ({ ...preference }));
}

function ToggleRow({
  checked,
  description,
  label,
  onChange,
}: Readonly<{
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}>) {
  return (
    <label className="flex min-h-16 items-center justify-between gap-4 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3">
      <span>
        <span className="block text-sm font-semibold text-[var(--text-primary)]">
          {label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </span>
      </span>
      <input
        checked={checked}
        className="size-5 accent-[var(--accent-cyan)]"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

function AvatarPreview({ profile }: Readonly<{ profile: SettingsProfile }>) {
  if (profile.avatarMode === "none") {
    return (
      <div className="flex size-20 items-center justify-center rounded-[20px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.54)] text-xs font-semibold text-[var(--text-muted)]">
        None
      </div>
    );
  }

  return (
    <div className="flex size-20 items-center justify-center rounded-[20px] border border-[color-mix(in_srgb,var(--accent)_32%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_13%,rgba(18,28,43,.72))] text-3xl font-semibold text-[var(--text-primary)]">
      {profile.avatarInitials || "A"}
    </div>
  );
}

function ProfileSettingsPanel({
  error,
  profileId,
  onChange,
  onPreview,
  profile,
}: Readonly<{
  error: string | null;
  profileId: SettingsViewModel["profileId"];
  onChange: (profile: SettingsProfile) => void;
  onPreview: () => void;
  profile: SettingsProfile;
}>) {
  function update<K extends keyof SettingsProfile>(
    key: K,
    value: SettingsProfile[K],
  ) {
    onChange({ ...profile, [key]: value });
  }

  return (
    <SystemPanel
      badge={<Pill accent={settingsAccent}>Local preview only</Pill>}
      className="lg:col-span-2"
      dataAttributes={sectionStateAttributes({
        capacity: 1,
        itemCount: profile.displayName.trim() ? 1 : 0,
        profileId,
        section: "profile-settings",
      })}
      subtitle="Profile editing is prepared as local UI state. No auth profile or upload service is connected."
      title="Profile Settings"
    >
      <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex flex-col items-start gap-3">
          <AvatarPreview profile={profile} />
          <button className={secondaryButtonClass} onClick={onPreview} type="button">
            Update preview
          </button>
          <LocalMockNotice>Local preview only</LocalMockNotice>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <FieldLabel>Display Name *</FieldLabel>
            <input
              className={inputClass}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                update("displayName", event.target.value)
              }
              value={profile.displayName}
            />
          </label>
          <label>
            <FieldLabel>Role Label</FieldLabel>
            <input
              className={inputClass}
              onChange={(event) => update("roleLabel", event.target.value)}
              value={profile.roleLabel}
            />
          </label>
          <label>
            <FieldLabel>Avatar Initials</FieldLabel>
            <input
              className={inputClass}
              maxLength={3}
              onChange={(event) =>
                update("avatarInitials", event.target.value.toUpperCase())
              }
              value={profile.avatarInitials}
            />
          </label>
          <label>
            <FieldLabel>Avatar Mode</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) =>
                update("avatarMode", event.target.value as SettingsProfile["avatarMode"])
              }
              value={profile.avatarMode}
            >
              {avatarModeOptions.map((mode) => (
                <option key={mode} value={mode}>
                  {optionLabel(mode)}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            <FieldLabel>Description</FieldLabel>
            <textarea
              className={textareaClass}
              onChange={(event) => update("description", event.target.value)}
              value={profile.description}
            />
          </label>
          {error ? (
            <p className="sm:col-span-2 rounded-[12px] border border-[rgba(221,107,95,.28)] bg-[rgba(221,107,95,.08)] px-3 py-2 text-xs text-[var(--accent-red)]">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </SystemPanel>
  );
}

function AppearanceSettingsPanel({
  appearance,
  profileId,
  onChange,
}: Readonly<{
  appearance: SettingsAppearance;
  profileId: SettingsViewModel["profileId"];
  onChange: (appearance: SettingsAppearance) => void;
}>) {
  function update<K extends keyof SettingsAppearance>(
    key: K,
    value: SettingsAppearance[K],
  ) {
    onChange({ ...appearance, [key]: value });
  }

  return (
    <SystemPanel
      badge={<StatusPill accent={accentToken[appearance.accentColor]}>{optionLabel(appearance.accentColor)}</StatusPill>}
      dataAttributes={sectionStateAttributes({
        capacity: 4,
        itemCount: 4,
        profileId,
        section: "appearance",
      })}
      subtitle="Local UI preview state only. No new theme library or persistence is connected."
      title="Appearance"
    >
      <div className="space-y-4">
        <div>
          <FieldLabel>Theme</FieldLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {themeOptions.map((theme) => (
              <button
                aria-pressed={appearance.theme === theme}
                className={cn(
                  chipButtonClass,
                  appearance.theme === theme
                    ? "border-[color-mix(in_srgb,var(--accent)_42%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--text-primary)]"
                    : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] text-[var(--text-muted)]",
                )}
                key={theme}
                onClick={() => update("theme", theme)}
                type="button"
              >
                {optionLabel(theme)}
              </button>
            ))}
          </div>
        </div>

        <label>
          <FieldLabel>Accent Color</FieldLabel>
          <select
            className={inputClass}
            onChange={(event) =>
              update("accentColor", event.target.value as SettingsAppearance["accentColor"])
            }
            value={appearance.accentColor}
          >
            {accentOptions.map((accent) => (
              <option key={accent} value={accent}>
                {optionLabel(accent)}
              </option>
            ))}
          </select>
        </label>

        <div>
          <FieldLabel>Density</FieldLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {densityOptions.map((density) => (
              <button
                aria-pressed={appearance.density === density}
                className={cn(
                  chipButtonClass,
                  appearance.density === density
                    ? "border-[color-mix(in_srgb,var(--accent)_42%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--text-primary)]"
                    : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] text-[var(--text-muted)]",
                )}
                key={density}
                onClick={() => update("density", density)}
                type="button"
              >
                {optionLabel(density)}
              </button>
            ))}
          </div>
        </div>

        <ToggleRow
          checked={appearance.reducedMotion}
          description="Respect a calmer motion preference in supported future interactions."
          label="Reduced Motion"
          onChange={(checked) => update("reducedMotion", checked)}
        />
      </div>
    </SystemPanel>
  );
}

function PrivacySettingsPanel({
  onChange,
  profileId,
  privacy,
}: Readonly<{
  onChange: (privacy: SettingsPrivacy) => void;
  profileId: SettingsViewModel["profileId"];
  privacy: SettingsPrivacy;
}>) {
  function update<K extends keyof SettingsPrivacy>(key: K, value: SettingsPrivacy[K]) {
    onChange({ ...privacy, [key]: value });
  }

  return (
    <SystemPanel
      badge={<StatusPill accent="var(--accent-green)">Private mode enabled</StatusPill>}
      dataAttributes={sectionStateAttributes({
        capacity: 4,
        itemCount: 4,
        profileId,
        section: "privacy",
      })}
      subtitle="Privacy toggles are local UI preview state only. No external persistence is connected."
      title="Privacy"
    >
      <div className="space-y-3">
        <ToggleRow
          checked={privacy.privateMode}
          description="Marks the app surface as private by default in UI copy."
          label="Private Mode"
          onChange={(checked) => update("privateMode", checked)}
        />
        <ToggleRow
          checked={privacy.hideSensitiveWidgets}
          description="Prepared preference for hiding sensitive widgets."
          label="Hide Sensitive Widgets"
          onChange={(checked) => update("hideSensitiveWidgets", checked)}
        />
        <ToggleRow
          checked={privacy.showJournalSnippets}
          description="Prepared display preference for journal snippets."
          label="Show Journal Snippets"
          onChange={(checked) => update("showJournalSnippets", checked)}
        />
        <ToggleRow
          checked={privacy.showWorkSnippets}
          description="Prepared display preference for work snippets."
          label="Show Work Snippets"
          onChange={(checked) => update("showWorkSnippets", checked)}
        />
      </div>
    </SystemPanel>
  );
}

function ProfilePreviewDialog({
  onClose,
  profile,
}: Readonly<{
  onClose: () => void;
  profile: SettingsProfile | null;
}>) {
  if (!profile) {
    return null;
  }

  return (
    <DialogShell labelledBy="profile-preview-heading" onClose={onClose} open>
      <div className="border-b border-[var(--border-subtle)] px-5 py-4">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]" id="profile-preview-heading">
          Profile preview
        </h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          Local preview only. No profile data is persisted.
        </p>
      </div>
      <div className="p-5">
        <div className="flex gap-4 rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-4">
          <AvatarPreview profile={profile} />
          <div>
            <p className="text-xl font-semibold text-[var(--text-primary)]">
              {profile.displayName}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {profile.roleLabel}
            </p>
            <p className="mt-3 max-w-lg text-xs leading-5 text-[var(--text-muted)]">
              {profile.description}
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-end border-t border-[var(--border-subtle)] px-5 py-4">
        <button className={secondaryButtonClass} onClick={onClose} type="button">
          Close
        </button>
      </div>
    </DialogShell>
  );
}

function ResetDialog({
  onClose,
  onConfirm,
  open,
}: Readonly<{
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
}>) {
  if (!open) {
    return null;
  }

  return (
    <DialogShell labelledBy="reset-settings-heading" onClose={onClose} open>
      <div className="border-b border-[var(--border-subtle)] px-5 py-4">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]" id="reset-settings-heading">
          Reset local changes
        </h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          This only resets current UI state to static mock defaults.
        </p>
      </div>
      <div className="p-5">
        <LocalMockNotice>No persisted settings or account data will be changed.</LocalMockNotice>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
        <button className={secondaryButtonClass} onClick={onClose} type="button">
          Cancel
        </button>
        <button className={primaryButtonClass} onClick={onConfirm} type="button">
          Reset local state
        </button>
      </div>
    </DialogShell>
  );
}

export function SettingsPage({
  viewModel,
}: Readonly<{
  viewModel: SettingsViewModel;
}>) {
  const profileId = viewModel.profileId;
  const [profile, setProfile] = useState(viewModel.profile);
  const [appearance, setAppearance] = useState(viewModel.appearance);
  const [privacy, setPrivacy] = useState(viewModel.privacy);
  const [preferences, setPreferences] = useState(() =>
    clonePreferences(viewModel.preferences),
  );
  const [savedState, setSavedState] = useState(() => ({
    appearance: viewModel.appearance,
    preferences: clonePreferences(viewModel.preferences),
    privacy: viewModel.privacy,
    profile: viewModel.profile,
  }));
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewProfile, setPreviewProfile] = useState<SettingsProfile | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  function showToast(nextToast: ToastState) {
    setToast(nextToast);
    window.setTimeout(() => setToast(null), 2800);
  }

  function updateProfile(profileDraft: SettingsProfile) {
    setProfile(profileDraft);
    setDirty(true);
  }

  function updateAppearance(appearanceDraft: SettingsAppearance) {
    setAppearance(appearanceDraft);
    setDirty(true);
  }

  function updatePrivacy(privacyDraft: SettingsPrivacy) {
    setPrivacy(privacyDraft);
    setDirty(true);
  }

  function saveChanges(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!profile.displayName.trim()) {
      setError("Display Name is required");
      return;
    }

    setError(null);
    setSavedState({
      appearance,
      preferences: clonePreferences(preferences),
      privacy,
      profile,
    });
    setDirty(false);
    showToast({
      body: "Local UI preview updated for this session. No external persistence was used.",
      title: "Preview state updated",
      tone: "success",
    });
  }

  function resetLocalChanges() {
    setProfile(savedState.profile);
    setAppearance(savedState.appearance);
    setPrivacy(savedState.privacy);
    setPreferences(clonePreferences(savedState.preferences));
    setError(null);
    setDirty(false);
    setResetOpen(false);
    showToast({
      body: "Unsaved local UI changes were discarded.",
      title: "Local changes reset",
      tone: "info",
    });
  }

  function updatePreference(id: string, enabled: boolean) {
    setDirty(true);
    setPreferences((current) =>
      current.map((preference) =>
        preference.id === id ? { ...preference, enabled } : preference,
      ),
    );
  }

  return (
    <form
      onChangeCapture={() => setDirty(true)}
      onClickCapture={(event) => {
        const target = event.target;

        if (
          target instanceof HTMLElement &&
          target.closest('button[aria-pressed="false"]')
        ) {
          setDirty(true);
        }
      }}
      onSubmit={saveChanges}
    >
      <SystemPageShell
        accent={settingsAccent}
        dataAttributes={sectionStateAttributes({
          capacity: 6,
          itemCount: 6,
          profileId,
          section: "page",
        })}
        id="settings-page"
      >
        <SystemPageHeader
          eyebrow="System / Settings"
          primaryAction={
            <button className={primaryButtonClass} disabled={!dirty} type="submit">
              Save changes
            </button>
          }
          secondaryActions={
            <>
              <button
                className={secondaryButtonClass}
                disabled={!dirty}
                onClick={() => setResetOpen(true)}
                type="button"
              >
                Reset local changes
              </button>
              <button
                className={secondaryButtonClass}
                onClick={() => setPreviewProfile(profile)}
                type="button"
              >
                Preview profile
              </button>
            </>
          }
          summary="Profile, appearance and system preferences"
          title="Settings"
        />

        <div className="grid gap-3 lg:grid-cols-2">
          <ProfileSettingsPanel
            error={error}
            onChange={updateProfile}
            onPreview={() => setPreviewProfile(profile)}
            profileId={profileId}
            profile={profile}
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <AppearanceSettingsPanel
            appearance={appearance}
            onChange={updateAppearance}
            profileId={profileId}
          />
          <PrivacySettingsPanel
            onChange={updatePrivacy}
            privacy={privacy}
            profileId={profileId}
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.48fr)]">
          <SystemPanel
            badge={dirty ? <Pill accent="var(--accent-orange)">Unsaved changes</Pill> : <Pill quiet>Saved mock state</Pill>}
            dataAttributes={sectionStateAttributes({
              capacity: 5,
              itemCount: preferences.length,
              profileId,
              section: "app-preferences",
            })}
            subtitle="Prepared local preferences only. No notifications, persistence or external services are connected."
            title="App Preferences"
          >
            {preferences.length > 0 ? (
              <div className="space-y-3">
                {preferences.map((preference) => (
                  <ToggleRow
                    checked={preference.enabled}
                    description={preference.description}
                    key={preference.id}
                    label={preference.label}
                    onChange={(checked) => updatePreference(preference.id, checked)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                description="App preferences will appear here when local preference defaults exist."
                title="No app preferences"
              />
            )}
          </SystemPanel>

          <div className="space-y-3">
            <SystemPanel
              badge={<Pill quiet>Prepared</Pill>}
              dataAttributes={sectionStateAttributes({
                capacity: 2,
                itemCount: 0,
                profileId,
                section: "data-export",
              })}
              subtitle="Export will be added after real persistence."
              title="Data & Export"
            >
              <div className="space-y-3">
                <button className={secondaryButtonClass} disabled type="button">
                  Export data
                </button>
                <button className={secondaryButtonClass} disabled type="button">
                  Backup settings
                </button>
                <LocalMockNotice>Export will be added after real persistence</LocalMockNotice>
              </div>
            </SystemPanel>

            <SystemPanel
              dataAttributes={sectionStateAttributes({
                capacity: 5,
                itemCount: Object.keys(viewModel.systemInfo).length,
                profileId,
                section: "system-info",
              })}
              subtitle="Static app mode summary."
              title="System Info"
            >
              <dl className="space-y-2 text-xs leading-5">
                {Object.entries(viewModel.systemInfo).map(([key, value]) => (
                  <div
                    className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] px-3 py-2"
                    key={key}
                  >
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                      {optionLabel(key)}
                    </dt>
                    <dd className="mt-1 text-[var(--text-secondary)]">{value}</dd>
                  </div>
                ))}
              </dl>
            </SystemPanel>

            <SystemPanel
              badge={<StatusPill accent="var(--accent-red)">Disabled</StatusPill>}
              subtitle="Prepared destructive actions remain disabled in static mock mode."
              title="Danger Zone"
            >
              <div className="space-y-3">
                <button className={quietButtonClass} disabled type="button">
                  Reset all local mock data
                </button>
                <button className={quietButtonClass} disabled type="button">
                  Delete account
                </button>
                <LocalMockNotice>No destructive action is implemented.</LocalMockNotice>
              </div>
            </SystemPanel>
          </div>
        </div>

        <ProfilePreviewDialog
          onClose={() => setPreviewProfile(null)}
          profile={previewProfile}
        />
        <ResetDialog
          onClose={() => setResetOpen(false)}
          onConfirm={resetLocalChanges}
          open={resetOpen}
        />
        <Toast toast={toast} />
      </SystemPageShell>
    </form>
  );
}
