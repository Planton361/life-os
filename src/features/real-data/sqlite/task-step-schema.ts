// PostgreSQL task_steps retains duplicate positions; ties use creation time/ID.
export const taskStepSchema = `
CREATE TABLE task_steps (
 id TEXT PRIMARY KEY CHECK(codec_uuid_valid(id)),
 user_id TEXT NOT NULL REFERENCES profiles(id), task_id TEXT NOT NULL,
 title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 500),
 position INTEGER NOT NULL DEFAULT 0 CHECK(position BETWEEN 0 AND 2147483647),
 completed_at TEXT CHECK(completed_at IS NULL OR codec_timestamp_valid(completed_at)),
 archived_at TEXT CHECK(archived_at IS NULL OR codec_timestamp_valid(archived_at)),
 created_at TEXT NOT NULL CHECK(codec_timestamp_valid(created_at)),
 updated_at TEXT NOT NULL CHECK(codec_timestamp_valid(updated_at)),
 FOREIGN KEY(user_id,task_id) REFERENCES tasks(user_id,id), UNIQUE(user_id,id)
) STRICT;
CREATE INDEX task_steps_owner_task ON task_steps(user_id,task_id,position,created_at,id);
CREATE TRIGGER task_steps_active_parent_insert BEFORE INSERT ON task_steps BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM tasks WHERE user_id=NEW.user_id AND id=NEW.task_id AND archived_at IS NULL)
 THEN RAISE(ABORT,'STEP_PARENT_UNAVAILABLE') END;
END;
CREATE TRIGGER task_steps_active_parent_update BEFORE UPDATE ON task_steps BEGIN
 SELECT CASE WHEN OLD.archived_at IS NOT NULL OR NOT EXISTS(SELECT 1 FROM tasks WHERE user_id=OLD.user_id AND id=OLD.task_id AND archived_at IS NULL)
 THEN RAISE(ABORT,'STEP_UNAVAILABLE') END;
 SELECT CASE WHEN NEW.id IS NOT OLD.id OR NEW.task_id IS NOT OLD.task_id OR NEW.created_at IS NOT OLD.created_at
 THEN RAISE(ABORT,'STEP_IDENTITY_IMMUTABLE') END;
END;
CREATE TRIGGER task_steps_no_delete BEFORE DELETE ON task_steps BEGIN SELECT RAISE(ABORT,'STEP_ARCHIVE_REQUIRED'); END;
`;
