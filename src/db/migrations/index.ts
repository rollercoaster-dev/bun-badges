import * as migration_003 from "./0003_add_issuer_public_key";
import * as migration_004 from "./0004_add_status_lists";
import * as migration_005 from "./0005_add_oauth_tables";
import * as migration_006 from "./0006_add_evidence_url";
import * as migration_007 from "./0007_add_headless_oauth";
import * as migration_008 from "./0008_add_token_mappings";
import * as migration_009 from "./0009_add_pkce_consent";
import * as migration_010 from "./0010_add_jar_support";

// List of migrations to run, in order
export const migrations = [
  migration_003,
  migration_004,
  migration_005,
  migration_006,
  migration_007,
  migration_008,
  migration_009,
  migration_010,
];
