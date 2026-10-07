export const habitOwnedTables = ["habits", "habit_logs"] as const;
export const habitSchema = `
CREATE TABLE habits (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES profiles(id),
  profile_id TEXT NOT NULL REFERENCES profiles(id) CHECK(profile_id=user_id),
  name TEXT NOT NULL CHECK(length(trim(name))>0),
  unit TEXT CHECK(unit IS NULL OR length(trim(unit))>0),
  daily_target TEXT CHECK(daily_target IS NULL OR decimal_compare(daily_target,'0')>0),
  default_increment TEXT NOT NULL DEFAULT '1' CHECK(decimal_compare(default_increment,'0')>0),
  time_window TEXT NOT NULL CHECK(time_window IN ('Morning','Midday','Evening')),
  sort_order INTEGER NOT NULL CHECK(sort_order BETWEEN 1 AND 8),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT,
  UNIQUE(user_id,id)
) STRICT;
CREATE UNIQUE INDEX habits_active_slot ON habits(user_id,time_window,sort_order) WHERE archived_at IS NULL;
CREATE INDEX habits_owner_order ON habits(user_id,archived_at,time_window,sort_order);
CREATE TABLE habit_logs (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES profiles(id),
  profile_id TEXT NOT NULL REFERENCES profiles(id) CHECK(profile_id=user_id),
  habit_id TEXT NOT NULL,
  value TEXT NOT NULL CHECK(decimal_compare(value,'0')>0),
  recorded_at TEXT NOT NULL, local_date TEXT NOT NULL,
  timezone TEXT NOT NULL CHECK(length(trim(timezone))>0),
  archived_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id,habit_id) REFERENCES habits(user_id,id) ON DELETE CASCADE
) STRICT;
CREATE INDEX habit_logs_owner_day ON habit_logs(user_id,local_date,recorded_at DESC) WHERE archived_at IS NULL;
CREATE INDEX habit_logs_owner_habit_day ON habit_logs(user_id,habit_id,local_date) WHERE archived_at IS NULL;
`;
