-- Add foreign key constraints for authorization tables
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_users_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "users"("user_id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_permission_id_fk" FOREIGN KEY ("permission_id") REFERENCES "permissions"("permission_id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_assigned_by_users_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "users"("user_id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_permissions_permission_id_fk" FOREIGN KEY ("permission_id") REFERENCES "permissions"("permission_id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_assigned_by_users_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "users"("user_id") ON DELETE no action ON UPDATE no action;
