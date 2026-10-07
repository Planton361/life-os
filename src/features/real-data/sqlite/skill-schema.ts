export const skillOwnedTables = [
  "skills",
  "skill_evidence",
  "skill_development_targets",
  "skill_milestones",
  "skill_development_reviews",
  "skill_evidence_revisions",
  "skill_development_review_evidence",
  "skill_development_review_amendments",
  "skill_command_receipts",
  "task_skill_links",
] as const;
const ddl = `
CREATE TABLE skills (
 id TEXT PRIMARY KEY DEFAULT(life_uuid()) CHECK(codec_uuid_valid(id)),user_id TEXT NOT NULL REFERENCES profiles(id),area_id TEXT,
 name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 200),summary TEXT CHECK(length(summary)<=8000),category TEXT CHECK(length(category)<=8000),level TEXT CHECK(length(level)<=8000),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','archived')),development_revision INTEGER NOT NULL DEFAULT 0 CHECK(development_revision>=0),archived_at TEXT,
 created_at TEXT NOT NULL DEFAULT(life_now()),updated_at TEXT NOT NULL DEFAULT(life_now()),UNIQUE(user_id,id),FOREIGN KEY(user_id,area_id) REFERENCES areas(user_id,id)
) STRICT;
CREATE TABLE skill_evidence (
 id TEXT PRIMARY KEY DEFAULT(life_uuid()) CHECK(codec_uuid_valid(id)),user_id TEXT NOT NULL REFERENCES profiles(id),skill_id TEXT NOT NULL,
 source_type TEXT NOT NULL CHECK(source_type IN ('task','project','goal','resource','manual_note')),source_id TEXT,title TEXT NOT NULL CHECK(length(trim(title))>0),note TEXT,
 evidence_date TEXT NOT NULL CHECK(codec_date_valid(evidence_date)),weight INTEGER CHECK(weight BETWEEN 1 AND 5),revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),withdrawn_at TEXT,
 source_snapshot TEXT CHECK(source_snapshot IS NULL OR json_valid(source_snapshot)),provenance_state TEXT NOT NULL DEFAULT 'legacy_unverified' CHECK(provenance_state IN ('captured','legacy_unverified')),
 created_at TEXT NOT NULL DEFAULT(life_now()),updated_at TEXT NOT NULL DEFAULT(life_now()),UNIQUE(user_id,skill_id,id),
 FOREIGN KEY(user_id,skill_id) REFERENCES skills(user_id,id) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(user_id,skill_id,id,revision) REFERENCES skill_evidence_revisions(user_id,skill_id,evidence_id,revision) DEFERRABLE INITIALLY DEFERRED
) STRICT;
CREATE TABLE task_skill_links (
 id TEXT PRIMARY KEY DEFAULT(life_uuid()) CHECK(codec_uuid_valid(id)),user_id TEXT NOT NULL REFERENCES profiles(id),task_id TEXT NOT NULL,skill_id TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT(life_now()),updated_at TEXT NOT NULL DEFAULT(life_now()),UNIQUE(user_id,task_id,skill_id),
 FOREIGN KEY(user_id,task_id) REFERENCES tasks(user_id,id),FOREIGN KEY(user_id,skill_id) REFERENCES skills(user_id,id)
) STRICT;
CREATE TABLE skill_development_targets (
 id TEXT primary key DEFAULT(life_uuid()), user_id TEXT not null REFERENCES profiles(id),
 skill_id TEXT not null, title text not null check(length(trim(title)) between 1 and 200), description text check(length(description)<=8000),
 status text not null default 'planned' check(status in ('planned','current','completed','retired')),
 cycle INTEGER not null default 1 check(cycle>0), archived_at TEXT, terminal_review_id TEXT,
 created_at TEXT not null DEFAULT(life_now()), updated_at TEXT not null DEFAULT(life_now()),
 unique(user_id,skill_id,id),
 foreign key(user_id,skill_id) references skills(user_id,id) deferrable initially deferred,
 check(archived_at is null or status<>'current'), check((status in ('completed','retired'))=(terminal_review_id is not null)), FOREIGN KEY(user_id,skill_id,id,terminal_review_id) REFERENCES skill_development_reviews(user_id,skill_id,target_id,id) DEFERRABLE INITIALLY DEFERRED) STRICT;
CREATE TABLE skill_milestones (
 id TEXT primary key DEFAULT(life_uuid()), user_id TEXT not null REFERENCES profiles(id),
 skill_id TEXT not null, target_id TEXT not null, title text not null check(length(trim(title)) between 1 and 200), description text check(length(description)<=8000),
 sort_order INTEGER not null check(sort_order>=0), status text not null default 'planned' check(status in ('planned','current','completed')),
 cycle INTEGER not null default 1 check(cycle>0), archived_at TEXT, terminal_review_id TEXT,
 created_at TEXT not null DEFAULT(life_now()), updated_at TEXT not null DEFAULT(life_now()),
 active_position INTEGER GENERATED ALWAYS AS (CASE WHEN archived_at IS NULL THEN sort_order END) STORED,
 unique(user_id,skill_id,target_id,id),
 foreign key(user_id,skill_id,target_id) references skill_development_targets(user_id,skill_id,id) deferrable initially deferred,
 check(archived_at is null or status<>'current'), check((status='completed')=(terminal_review_id is not null)), UNIQUE(user_id,target_id,active_position), FOREIGN KEY(user_id,skill_id,target_id,id,terminal_review_id) REFERENCES skill_development_reviews(user_id,skill_id,target_id,milestone_id,id) DEFERRABLE INITIALLY DEFERRED) STRICT;
CREATE TABLE skill_development_reviews (
 id TEXT primary key DEFAULT(life_uuid()),user_id TEXT not null REFERENCES profiles(id),
 skill_id TEXT not null,target_id TEXT not null,milestone_id TEXT,cycle INTEGER not null check(cycle>0),
 decision text not null check(decision in ('continue','completed','retired')), note text not null check(length(trim(note)) between 1 and 8000),
 reviewed_at TEXT not null DEFAULT(life_now()),aggregate_revision INTEGER not null,snapshot_version INTEGER not null default 1 check(snapshot_version=1),
 subject_snapshot TEXT not null,milestones_snapshot TEXT not null,
 unique(user_id,skill_id,target_id,id),unique(user_id,skill_id,target_id,milestone_id,id),
 foreign key(user_id,skill_id,target_id) references skill_development_targets(user_id,skill_id,id) deferrable initially deferred,
 foreign key(user_id,skill_id,target_id,milestone_id) references skill_milestones(user_id,skill_id,target_id,id) deferrable initially deferred,
 check(milestone_id is null or decision<>'retired')) STRICT;
CREATE TABLE skill_evidence_revisions (
 user_id TEXT not null REFERENCES profiles(id),skill_id TEXT not null,evidence_id TEXT not null,revision INTEGER not null check(revision>0),
 source_type text not null,source_id TEXT,title text not null,note text,evidence_date TEXT not null CHECK(codec_date_valid(evidence_date)),weight INTEGER,
 withdrawn_at TEXT,source_snapshot TEXT,provenance_state text not null,
 operation text not null check(operation in ('baseline','create','correct','withdraw','restore')),reason text,recorded_at TEXT not null DEFAULT(life_now()),
 primary key(user_id,evidence_id,revision),unique(user_id,skill_id,evidence_id,revision),
 foreign key(user_id,skill_id,evidence_id) references skill_evidence(user_id,skill_id,id) deferrable initially deferred,
 check(source_type in ('task','project','goal','resource','manual_note')),
 check(provenance_state in ('captured','legacy_unverified')),
 check(weight is null or weight between 1 and 5),
 check(operation not in ('correct','withdraw','restore') or (reason is not null and length(trim(reason)) between 1 and 8000))) STRICT;
CREATE TABLE skill_development_review_evidence (
 user_id TEXT not null REFERENCES profiles(id),skill_id TEXT not null,target_id TEXT not null,review_id TEXT not null,evidence_id TEXT not null,evidence_revision INTEGER not null,
 primary key(user_id,review_id,evidence_id),
 foreign key(user_id,skill_id,target_id,review_id) references skill_development_reviews(user_id,skill_id,target_id,id) deferrable initially deferred,
 foreign key(user_id,skill_id,evidence_id,evidence_revision) references skill_evidence_revisions(user_id,skill_id,evidence_id,revision) deferrable initially deferred) STRICT;
CREATE TABLE skill_development_review_amendments (
 id TEXT primary key DEFAULT(life_uuid()),user_id TEXT not null REFERENCES profiles(id),skill_id TEXT not null,target_id TEXT not null,review_id TEXT not null,
 kind text not null check(kind in ('clarification','withdrawal','mistaken')),note text not null check(length(trim(note)) between 1 and 8000),created_at TEXT not null DEFAULT(life_now()),
 foreign key(user_id,skill_id,target_id,review_id) references skill_development_reviews(user_id,skill_id,target_id,id) deferrable initially deferred) STRICT;
CREATE TABLE skill_command_receipts (
 user_id TEXT not null REFERENCES profiles(id),command_id TEXT not null,skill_id TEXT not null,operation text not null,request TEXT not null,result TEXT not null,created_at TEXT not null DEFAULT(life_now()),
 primary key(user_id,command_id),foreign key(user_id,skill_id) references skills(user_id,id) deferrable initially deferred) STRICT;
CREATE UNIQUE INDEX skill_target_current ON skill_development_targets(user_id,skill_id) WHERE archived_at IS NULL AND status='current';
CREATE UNIQUE INDEX skill_milestone_current ON skill_milestones(user_id,target_id) WHERE archived_at IS NULL AND status='current';
`;

// SQLite stores PG integer fields as exact INTEGER; retain the source int32 bounds
// while development/aggregate revisions retain the full signed int64 range.
export const skillSchema = ddl.replace(
  /CREATE TABLE ([a-z_]+) \(([\s\S]*?)\) STRICT;/g,
  (_match, table: string, body: string) => {
    const columns = [
      ...body.matchAll(/(?:^|,)\s*([a-z_]+)\s+(TEXT|INTEGER)\b/gi),
    ].map((m) => m[1]);
    const checks = columns.flatMap((column) => {
      if (column === "id" || column.endsWith("_id"))
        return [`CHECK(${column} IS NULL OR codec_uuid_valid(${column}))`];
      if (column.endsWith("_at"))
        return [`CHECK(${column} IS NULL OR codec_timestamp_valid(${column}))`];
      if (
        [
          "cycle",
          "sort_order",
          "revision",
          "evidence_revision",
          "snapshot_version",
        ].includes(column)
      )
        return [`CHECK(${column} BETWEEN 0 AND 2147483647)`];
      if (
        [
          "request",
          "result",
          "subject_snapshot",
          "milestones_snapshot",
          "source_snapshot",
        ].includes(column)
      )
        return [`CHECK(${column} IS NULL OR json_valid(${column}))`];
      return [];
    });
    return `CREATE TABLE ${table} (${body},${checks.join(",")}) STRICT;`;
  },
);
