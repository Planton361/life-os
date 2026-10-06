export const projectOwnedTables = [
  "project_completion_criteria",
  "project_reviews",
  "project_review_criteria",
  "project_review_resources",
  "project_lifecycle_events",
  "project_review_amendments",
  "project_command_receipts",
] as const;
const owner = `user_id TEXT NOT NULL REFERENCES profiles(id), project_id TEXT NOT NULL,
`;
const id = `id TEXT PRIMARY KEY DEFAULT(life_uuid()) CHECK(codec_uuid_valid(id)),`;
const time = (column: string) =>
  `${column} TEXT NOT NULL DEFAULT(life_now()) CHECK(codec_timestamp_valid(${column}))`;
const text = (column: string, limit: number, nullable = false) =>
  `CHECK(${nullable ? `${column} IS NULL OR ` : ""}(project_text_valid(${column},${limit})=1))`;

const ddl = `
CREATE TABLE project_completion_criteria (
 ${id} ${owner} text TEXT NOT NULL ${text("text", 1000)}, sort_order INTEGER NOT NULL DEFAULT 0 CHECK(sort_order>=0),
 ${time("created_at")}, ${time("updated_at")}, archived_at TEXT CHECK(archived_at IS NULL OR codec_timestamp_valid(archived_at)),
 archive_reason TEXT ${text("archive_reason", 2000, true)}, archived_cycle INTEGER CHECK(archived_cycle>=0), archived_revision INTEGER CHECK(archived_revision>=0),
 UNIQUE(user_id,project_id,id), CHECK((archived_at IS NULL AND archive_reason IS NULL AND archived_cycle IS NULL AND archived_revision IS NULL)
 OR (archived_at IS NOT NULL AND archive_reason IS NOT NULL AND archived_cycle IS NOT NULL AND archived_revision IS NOT NULL))
) STRICT;
CREATE TABLE project_command_receipts (
 ${owner} command_id TEXT NOT NULL CHECK(codec_uuid_valid(command_id)), command_kind TEXT NOT NULL CHECK(command_kind IN ('result.set','criterion.create','criterion.edit','criterion.reorder','criterion.archive','review.submit','review.amend','project.reopen','project.archive','project.status.set')),
 request_payload TEXT NOT NULL CHECK(json_valid(request_payload)), request_fingerprint TEXT NOT NULL CHECK(project_hash_valid(request_fingerprint)), result_payload TEXT NOT NULL CHECK(json_valid(result_payload)), ${time("created_at")},
 PRIMARY KEY(user_id,command_id), UNIQUE(user_id,project_id,command_id)
) STRICT;
CREATE TABLE project_reviews (
 ${id} ${owner}  command_id TEXT NOT NULL CHECK(codec_uuid_valid(command_id)),
 completion_cycle INTEGER NOT NULL CHECK(completion_cycle>=0), revision_before INTEGER NOT NULL CHECK(revision_before>=0), revision_after INTEGER NOT NULL CHECK(revision_after=revision_before+1), snapshot_version INTEGER NOT NULL DEFAULT 1 CHECK(snapshot_version=1),
 project_title_snapshot TEXT NOT NULL, desired_result_snapshot TEXT ${text("desired_result_snapshot", 4000, true)}, goal_id_snapshot TEXT CHECK(goal_id_snapshot IS NULL OR codec_uuid_valid(goal_id_snapshot)), goal_title_snapshot TEXT,
 decision TEXT NOT NULL CHECK(decision IN ('completed','continue')), prior_status TEXT NOT NULL CHECK(prior_status IN ('idea','active','paused','blocked')), resulting_status TEXT NOT NULL,
 result_accepted INTEGER NOT NULL CHECK(result_accepted IN (0,1)), rationale TEXT NOT NULL ${text("rationale", 2000)}, ${time("work_observed_at")}, context_fingerprint TEXT NOT NULL CHECK(project_hash_valid(context_fingerprint)),
 open_task_count INTEGER NOT NULL CHECK(open_task_count>=0), done_task_count INTEGER NOT NULL CHECK(done_task_count>=0), canceled_task_count INTEGER NOT NULL CHECK(canceled_task_count>=0), open_milestone_count INTEGER NOT NULL CHECK(open_milestone_count>=0), done_milestone_count INTEGER NOT NULL CHECK(done_milestone_count>=0),
 open_work_acknowledged INTEGER NOT NULL CHECK(open_work_acknowledged IN (0,1)), open_work_disposition TEXT ${text("open_work_disposition", 2000, true)}, archived_criteria_acknowledged INTEGER NOT NULL CHECK(archived_criteria_acknowledged IN (0,1)), ${time("reviewed_at")},
 UNIQUE(user_id,project_id,id), UNIQUE(user_id,command_id), UNIQUE(project_id,revision_after),
 CHECK((decision='completed' AND resulting_status='completed' AND result_accepted=1 AND desired_result_snapshot IS NOT NULL) OR (decision='continue' AND resulting_status=prior_status AND result_accepted=0)),
 CHECK((decision='completed' AND open_task_count+open_milestone_count>0 AND open_work_acknowledged=1 AND open_work_disposition IS NOT NULL)
 OR ((decision='continue' OR open_task_count+open_milestone_count=0) AND open_work_acknowledged=0 AND open_work_disposition IS NULL))
) STRICT;
CREATE UNIQUE INDEX project_one_completion ON project_reviews(user_id,project_id,completion_cycle) WHERE decision='completed';
CREATE TABLE project_review_criteria (
 ${owner}  criterion_id TEXT NOT NULL CHECK(codec_uuid_valid(criterion_id)), review_id TEXT NOT NULL,
 text_snapshot TEXT NOT NULL ${text("text_snapshot", 1000)}, sort_order_snapshot INTEGER NOT NULL CHECK(sort_order_snapshot>=0), decision TEXT NOT NULL CHECK(decision IN ('satisfied','not_satisfied','not_assessed','excluded')),
 rationale TEXT ${text("rationale", 2000, true)}, was_archived INTEGER NOT NULL CHECK(was_archived IN (0,1)), archive_reason_snapshot TEXT ${text("archive_reason_snapshot", 2000, true)}, archived_cycle_snapshot INTEGER CHECK(archived_cycle_snapshot>=0), archived_revision_snapshot INTEGER CHECK(archived_revision_snapshot>=0),
 PRIMARY KEY(review_id,criterion_id), UNIQUE(user_id,project_id,review_id,criterion_id), CHECK(decision<>'not_satisfied' OR rationale IS NOT NULL), CHECK(was_archived=(decision='excluded')),
 CHECK((was_archived=1 AND archive_reason_snapshot IS NOT NULL AND archived_cycle_snapshot IS NOT NULL AND archived_revision_snapshot IS NOT NULL)
 OR (was_archived=0 AND archive_reason_snapshot IS NULL AND archived_cycle_snapshot IS NULL AND archived_revision_snapshot IS NULL))
) STRICT;
CREATE TABLE project_review_resources (
 ${id} ${owner}  review_id TEXT NOT NULL, criterion_id TEXT CHECK(criterion_id IS NULL OR codec_uuid_valid(criterion_id)), resource_id TEXT NOT NULL,
 relation_id_snapshot TEXT NOT NULL CHECK(codec_uuid_valid(relation_id_snapshot)), title_snapshot TEXT NOT NULL,
 resource_type_snapshot TEXT NOT NULL CHECK(resource_type_snapshot IN ('note','learning','prompt','research','link','source','snippet','decision')),
 safe_url_snapshot TEXT CHECK(safe_url_snapshot IS NULL OR project_safe_url(safe_url_snapshot) IS safe_url_snapshot),
 project_role_snapshot TEXT NOT NULL CHECK(project_role_snapshot IN ('reference','additional_artifact','primary_artifact')),
 relation_type_snapshot TEXT NOT NULL CHECK(relation_type_snapshot IN ('source','context','supports','evidence','decision','related')), note TEXT ${text("note", 2000, true)}, UNIQUE(user_id,project_id,review_id,id),
 FOREIGN KEY(user_id,resource_id) REFERENCES resources(user_id,id) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(user_id,project_id,review_id,criterion_id) REFERENCES project_review_criteria(user_id,project_id,review_id,criterion_id) DEFERRABLE INITIALLY DEFERRED
) STRICT;
CREATE UNIQUE INDEX project_resource_global ON project_review_resources(review_id,resource_id) WHERE criterion_id IS NULL;
CREATE UNIQUE INDEX project_resource_criterion ON project_review_resources(review_id,criterion_id,resource_id) WHERE criterion_id IS NOT NULL;
CREATE TABLE project_lifecycle_events (
 ${id} ${owner}  command_id TEXT NOT NULL, event_kind TEXT NOT NULL CHECK(event_kind IN ('reopened','archived')), revision_after INTEGER NOT NULL CHECK(revision_after>=0), cycle_before INTEGER NOT NULL CHECK(cycle_before>=0), cycle_after INTEGER NOT NULL CHECK(cycle_after>=0),
 project_title_snapshot TEXT NOT NULL, prior_status TEXT NOT NULL CHECK(prior_status IN ('idea','active','paused','blocked','completed','archived')), resulting_status TEXT NOT NULL CHECK(resulting_status IN ('idea','active','paused','blocked','completed','archived')), prior_completion_kind TEXT CHECK(prior_completion_kind IS NULL OR prior_completion_kind IN ('review','legacy_without_review')), prior_review_id TEXT, reason TEXT ${text("reason", 2000, true)}, mistaken_completion INTEGER NOT NULL DEFAULT 0 CHECK(mistaken_completion IN (0,1)), ${time("recorded_at")},
 UNIQUE(user_id,project_id,id), UNIQUE(user_id,command_id), UNIQUE(project_id,revision_after),
 FOREIGN KEY(user_id,project_id,prior_review_id) REFERENCES project_reviews(user_id,project_id,id) DEFERRABLE INITIALLY DEFERRED,
 CHECK((event_kind='reopened' AND prior_status='completed' AND resulting_status='active' AND cycle_after=cycle_before+1) OR (event_kind='archived' AND prior_status<>'archived' AND resulting_status='archived' AND cycle_after=cycle_before)),
 CHECK((prior_status='completed' AND prior_completion_kind IS NOT NULL AND ((prior_completion_kind='review' AND prior_review_id IS NOT NULL) OR (prior_completion_kind='legacy_without_review' AND prior_review_id IS NULL))) OR (prior_status<>'completed' AND prior_completion_kind IS NULL AND prior_review_id IS NULL)),
 CHECK(mistaken_completion=0 OR (event_kind='reopened' AND reason IS NOT NULL))
) STRICT;
CREATE UNIQUE INDEX project_reopen_review_once ON project_lifecycle_events(prior_review_id) WHERE event_kind='reopened' AND prior_review_id IS NOT NULL;
CREATE UNIQUE INDEX project_reopen_legacy_once ON project_lifecycle_events(user_id,project_id) WHERE event_kind='reopened' AND prior_completion_kind='legacy_without_review';
CREATE TABLE project_review_amendments (
 ${id} ${owner}   review_id TEXT NOT NULL, command_id TEXT NOT NULL, revision_after INTEGER NOT NULL CHECK(revision_after>=0), kind TEXT NOT NULL CHECK(kind IN ('clarification','evidence_withdrawn','marked_mistaken')), review_resource_id TEXT, reason TEXT NOT NULL ${text("reason", 2000)}, ${time("recorded_at")},
 UNIQUE(user_id,command_id), FOREIGN KEY(user_id,project_id,review_id,review_resource_id) REFERENCES project_review_resources(user_id,project_id,review_id,id) DEFERRABLE INITIALLY DEFERRED,
 CHECK((kind='evidence_withdrawn')=(review_resource_id IS NOT NULL))
) STRICT;
CREATE UNIQUE INDEX project_evidence_withdraw_once ON project_review_amendments(review_resource_id) WHERE kind='evidence_withdrawn';
CREATE UNIQUE INDEX project_mistaken_once ON project_review_amendments(review_id) WHERE kind='marked_mistaken';
CREATE INDEX project_criteria_current ON project_completion_criteria(user_id,project_id,archived_cycle,sort_order,id);
CREATE INDEX project_review_revision ON project_reviews(user_id,project_id,revision_after DESC,id);
CREATE INDEX project_lifecycle_revision ON project_lifecycle_events(user_id,project_id,revision_after DESC,id);
CREATE INDEX project_amend_revision ON project_review_amendments(user_id,project_id,revision_after DESC,id);
`;

export const projectSchema = ddl.replace(
  /CREATE TABLE (project_[a-z_]+) \(([\s\S]*?)\) STRICT;/g,
  (_match, table: string, columns: string) => {
    const constraints = [
      "FOREIGN KEY(user_id,project_id) REFERENCES projects(user_id,id) DEFERRABLE INITIALLY DEFERRED",
    ];
    if (
      [
        "project_reviews",
        "project_lifecycle_events",
        "project_review_amendments",
      ].includes(table)
    )
      constraints.push(
        "FOREIGN KEY(user_id,project_id,command_id) REFERENCES project_command_receipts(user_id,project_id,command_id) DEFERRABLE INITIALLY DEFERRED",
      );
    if (
      [
        "project_review_criteria",
        "project_review_resources",
        "project_review_amendments",
      ].includes(table)
    )
      constraints.push(
        "FOREIGN KEY(user_id,project_id,review_id) REFERENCES project_reviews(user_id,project_id,id) DEFERRABLE INITIALLY DEFERRED",
      );
    if (table === "project_review_criteria")
      constraints.push(
        "FOREIGN KEY(user_id,project_id,criterion_id) REFERENCES project_completion_criteria(user_id,project_id,id) DEFERRABLE INITIALLY DEFERRED",
      );
    return `CREATE TABLE ${table} (${columns}, ${constraints.join(",")} ) STRICT;`;
  },
);
