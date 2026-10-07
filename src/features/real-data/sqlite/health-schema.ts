export const healthOwnedTables = ["mood_entries", "sleep_entries", "weight_entries", "weight_goals"] as const;
export const healthSchema = `
CREATE TABLE mood_entries (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES profiles(id),profile_id TEXT NOT NULL REFERENCES profiles(id) CHECK(user_id=profile_id),
 mood TEXT NOT NULL CHECK(mood IN ('calm','content','focused','tired','anxious','stressed','happy')),
 recorded_at TEXT NOT NULL,local_date TEXT NOT NULL,timezone TEXT NOT NULL DEFAULT 'Europe/Berlin',
 archived_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
) STRICT;
CREATE INDEX mood_entries_owner_recorded ON mood_entries(user_id,recorded_at DESC) WHERE archived_at IS NULL;
CREATE TABLE sleep_entries (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES profiles(id),profile_id TEXT NOT NULL REFERENCES profiles(id) CHECK(user_id=profile_id),
 sleep_date TEXT NOT NULL,duration_minutes INTEGER NOT NULL CHECK(duration_minutes BETWEEN 1 AND 1440),
 quality INTEGER CHECK(quality BETWEEN 1 AND 5),note TEXT CHECK(note IS NULL OR length(note)<=500),
 created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(user_id,sleep_date)
) STRICT;
CREATE INDEX sleep_entries_owner_date ON sleep_entries(user_id,sleep_date DESC);
CREATE TABLE weight_entries (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES profiles(id),profile_id TEXT NOT NULL REFERENCES profiles(id) CHECK(user_id=profile_id),
 measured_on TEXT NOT NULL,weight_kg TEXT NOT NULL CHECK(decimal_fits(weight_kg,5,2) AND decimal_compare(weight_kg,'20')>=0 AND decimal_compare(weight_kg,'500')<=0),
 created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(user_id,measured_on)
) STRICT;
CREATE INDEX weight_entries_owner_date ON weight_entries(user_id,measured_on DESC);
CREATE TABLE weight_goals (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES profiles(id),profile_id TEXT NOT NULL REFERENCES profiles(id) CHECK(user_id=profile_id),
 target_weight_kg TEXT NOT NULL CHECK(decimal_fits(target_weight_kg,5,2) AND decimal_compare(target_weight_kg,'20')>=0 AND decimal_compare(target_weight_kg,'500')<=0),
 target_date TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(user_id)
) STRICT;
`;
