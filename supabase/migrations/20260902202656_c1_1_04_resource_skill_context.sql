-- C1.1-04: Resource↔Skill context remains a bounded resource_relations edge.
-- Context is intentionally distinct from skill_evidence and never changes skill progress.
alter type public.resource_relation_target_type add value if not exists 'skill';
