INSERT INTO "permissions" ("id", "key", "description", "created_at", "updated_at")
VALUES
  ('4f97d6d2-8d2b-4a1d-9f44-1f0a2ff8d001', 'customers:create', 'Create new customers', NOW(), NOW()),
  ('4f97d6d2-8d2b-4a1d-9f44-1f0a2ff8d002', 'customers:read', 'View customers and their details', NOW(), NOW()),
  ('4f97d6d2-8d2b-4a1d-9f44-1f0a2ff8d003', 'customers:update', 'Update customer information', NOW(), NOW()),
  ('4f97d6d2-8d2b-4a1d-9f44-1f0a2ff8d004', 'customers:delete', 'Delete customers', NOW(), NOW())
ON CONFLICT ("key") DO UPDATE
SET
  "description" = EXCLUDED."description",
  "updated_at" = NOW();

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.name = 'super-admin'
  AND p."key" IN (
    'customers:create',
    'customers:read',
    'customers:update',
    'customers:delete'
  )
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.name = 'admin'
  AND p."key" IN (
    'customers:create',
    'customers:read',
    'customers:update',
    'customers:delete'
  )
ON CONFLICT DO NOTHING;
