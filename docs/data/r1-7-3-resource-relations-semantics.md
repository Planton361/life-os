# R1.7.3 Resource Relations Semantics

Stand: 2026-06-27
Status: Active

## Scope

R1.7.3A locks the application data-layer semantics for the existing
`resource_relations` table. It does not add UI, migrations, RLS policies,
remote database changes, graph traversal, AI features, vectors, or embeddings.

## Relation Model

`resource_relations` stores directed links from one source Resource to one
target entity.

- Source side: `resource_id`, always a Resource owned by the current user.
- Target side: `target_type` plus `target_id`.
- Supported application target types in R1.7.3A: `project`, `goal`, `task`,
  `resource`.
- Supported relation types: `source`, `context`, `supports`, `evidence`,
  `decision`, `related`.
- Empty or null relation type input is normalized to `related`.

The database enum still contains additional target types. They remain reserved
until a later feature explicitly defines same-user ownership semantics and UI
behavior for them.

## Ownership

The database intentionally has no polymorphic foreign key for `target_id`.
Therefore the repository must validate both sides before writing:

- `resource_id` must exist in `resources` for the current `user_id` and must not
  be archived.
- `target_id` must exist in the table implied by `target_type` for the current
  `user_id` and must not be archived.
- All reads must filter by `user_id`.

RLS remains the final database boundary. Repository ownership checks are the
application-level semantic lock.

## Duplicate Handling

Links are idempotent for the tuple:

`resource_id`, `target_type`, `target_id`, `relation_type`

If a matching relation already exists, `linkResource` returns the existing row.
If a concurrent insert hits the unique constraint, the repository re-reads and
returns the duplicate row when available.

## Read Paths

The data layer exposes these read paths:

- all resource relations for one user/profile
- all relations for one source resource
- all relations for one target entity

Reads only return R1.7.3A-supported target types.

## Target Labels

Target label resolution is not part of R1.7.3A. Consumers that need display
labels must resolve them through a later read model or view-model adapter
without weakening the ownership rules above.
