-- Insert default roles
INSERT INTO "roles" ("name", "description") VALUES
('admin', 'Administrator with full access to all features'),
('issuer', 'Can create and manage badges and issue them to recipients'),
('recipient', 'Can receive and manage their own badges'),
('verifier', 'Can verify badges but not issue them'),
('guest', 'Limited access to public features only');

-- Insert default permissions
INSERT INTO "permissions" ("name", "description") VALUES
('read:credentials', 'Read credential data'),
('create:credentials', 'Create new credentials'),
('update:credentials', 'Update existing credentials'),
('delete:credentials', 'Delete credentials'),
('verify:credentials', 'Verify credential authenticity'),
('read:profile', 'Read user profile data'),
('update:profile', 'Update user profile data'),
('read:users', 'Read user data'),
('create:users', 'Create new users'),
('update:users', 'Update existing users'),
('delete:users', 'Delete users'),
('read:issuers', 'Read issuer data'),
('create:issuers', 'Create new issuers'),
('update:issuers', 'Update existing issuers'),
('delete:issuers', 'Delete issuers');

-- Assign permissions to roles
-- Admin role gets all permissions
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.role_id, p.permission_id
FROM "roles" r, "permissions" p
WHERE r.name = 'admin';

-- Issuer role permissions
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.role_id, p.permission_id
FROM "roles" r, "permissions" p
WHERE r.name = 'issuer' AND p.name IN (
  'read:credentials', 'create:credentials', 'update:credentials',
  'read:profile', 'update:profile',
  'read:issuers', 'update:issuers'
);

-- Recipient role permissions
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.role_id, p.permission_id
FROM "roles" r, "permissions" p
WHERE r.name = 'recipient' AND p.name IN (
  'read:credentials', 'verify:credentials',
  'read:profile', 'update:profile'
);

-- Verifier role permissions
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.role_id, p.permission_id
FROM "roles" r, "permissions" p
WHERE r.name = 'verifier' AND p.name IN (
  'read:credentials', 'verify:credentials',
  'read:profile'
);

-- Guest role permissions
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.role_id, p.permission_id
FROM "roles" r, "permissions" p
WHERE r.name = 'guest' AND p.name IN (
  'verify:credentials',
  'read:profile'
);
