INSERT INTO "permissions" ("id", "key", "description", "created_at", "updated_at")
VALUES
  ('7fbc295f-8a10-4a0a-8e4d-8131b7a4a001', 'chat.read', 'Read staff chat queue and threads', NOW(), NOW()),
  ('7fbc295f-8a10-4a0a-8e4d-8131b7a4a002', 'chat.reply', 'Reply to customer chat threads', NOW(), NOW())
ON CONFLICT ("key") DO UPDATE
SET
  "description" = EXCLUDED."description",
  "updated_at" = NOW();

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r
JOIN "permissions" p ON p."key" IN ('chat.read', 'chat.reply')
WHERE r."name" IN ('admin', 'manager', 'staff')
ON CONFLICT DO NOTHING;
