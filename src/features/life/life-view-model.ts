import {
  entertainmentItems,
  inventoryItems,
  journalEntries,
  lifeNotes,
  reflectionPrompts,
} from "./mock-life-data";
import type {
  EntertainmentPageViewModel,
  InventoryPageViewModel,
  JournalPageViewModel,
  NotesPageViewModel,
} from "./types";

export function getJournalPageViewModel(): JournalPageViewModel {
  return {
    header: {
      eyebrow: "Life / Personal record",
      title: "Journal",
      summary: "Private reflections and personal review notes",
      context: "Static mock records, local draft saves, private by default.",
    },
    pageContract: {
      pageType: "Personal Record Workbench",
      primaryPurpose:
        "Write and revisit private journal entries without diagnostic scoring.",
      writes: "Local mock journal entries in client state.",
      reads: "Static mock journal entries and reflection prompts.",
      canonicalSource: "Later journal_entries and review_records.",
      sensitiveData: "Journal records are personal_sensitive.",
      primaryDecision: "Which reflection should continue next?",
      mainZone: "Writing Focus",
      emptyState: "Start a private local journal entry.",
      mobileOrder: [
        "Header + New journal entry",
        "Writing Focus",
        "Reflection Prompts",
        "Recent Entries",
        "Journal Pattern",
      ],
    },
    entries: journalEntries,
    prompts: reflectionPrompts,
  };
}

export function getNotesPageViewModel(): NotesPageViewModel {
  return {
    header: {
      eyebrow: "Life / Brain dump",
      title: "Notes",
      summary: "Loose thoughts that should not disappear",
      context:
        "Notes stay loose unless they are manually moved later. No conversion runs here.",
    },
    pageContract: {
      pageType: "Area Subpage / Personal notes",
      primaryPurpose:
        "Preserve loose thoughts without automatically creating tasks or knowledge.",
      writes: "Local mock notes in client state.",
      reads: "Static mock personal notes and capture sources.",
      canonicalSource: "Later notes and resources links.",
      sensitiveData: "Notes can be personal_sensitive.",
      primaryDecision: "Which loose thought should be kept or reopened?",
      mainZone: "Brain Dump History",
      emptyState: "Capture a loose note that remains intentionally unstructured.",
      mobileOrder: [
        "Header + New note",
        "Search",
        "New Note shortcut",
        "Brain Dump History",
        "Note Types",
        "Recent Capture Sources",
      ],
    },
    notes: lifeNotes,
  };
}

export function getEntertainmentPageViewModel(): EntertainmentPageViewModel {
  return {
    header: {
      eyebrow: "Life / Media shelf",
      title: "Entertainment",
      summary: "Personal media list and recovery shelf",
      context: "No social feed, public watchlist, ratings community or lookup API.",
    },
    pageContract: {
      pageType: "Area Subpage / Collection Overview",
      primaryPurpose:
        "Keep personal media status, notes and next actions visible without social mechanics.",
      writes: "Local mock entertainment items in client state.",
      reads: "Static mock entertainment items.",
      canonicalSource: "Later entertainment_items.",
      sensitiveData: "Personal media choices are private personal context.",
      primaryDecision: "What media should continue, wait, or stay on the shelf?",
      mainZone: "Entertainment Shelf",
      emptyState: "Add a local media item to start the shelf.",
      mobileOrder: [
        "Header + Add media",
        "Segments",
        "Current Media",
        "Entertainment Shelf",
        "Media Wishlist",
        "Finished/Paused",
      ],
    },
    items: entertainmentItems,
  };
}

export function getInventoryPageViewModel(): InventoryPageViewModel {
  return {
    header: {
      eyebrow: "Life / Inventory",
      title: "Inventory",
      summary: "Owned items, replacements and wishlist decisions",
      context:
        "Budget fit is a manual planning label. No payments, price API or financial advice.",
    },
    pageContract: {
      pageType: "Entity Workbench / Area Subpage",
      primaryPurpose:
        "Review owned items, replacement needs and wishlist decisions.",
      writes: "Local mock inventory and wishlist items in client state.",
      reads: "Static mock inventory items.",
      canonicalSource: "Later inventory_items and purchase_decisions.",
      sensitiveData: "Inventory and wishlist are private planning data.",
      primaryDecision: "What is owned, what waits, and what fits the budget signal?",
      mainZone: "Inventory & Wishlist",
      emptyState: "Add a local inventory item or wishlist item.",
      mobileOrder: [
        "Header + Add item",
        "Segments",
        "Wishlist Decisions",
        "Inventory List",
        "Owned Items",
        "Budget Fit Summary",
      ],
    },
    items: inventoryItems,
  };
}
