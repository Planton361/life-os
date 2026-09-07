import { getJournalData } from "@/features/profile-data/journal-data";
import { JournalWorkspace } from "@/features/life/journal/journal-workspace";

export const metadata = {
  title: "Journal | Life OS",
  description: "Persönliche Einträge, Reflexion und chronologischer Verlauf.",
};
export default async function LifeJournalRoute() {
  return <JournalWorkspace {...await getJournalData()} />;
}
