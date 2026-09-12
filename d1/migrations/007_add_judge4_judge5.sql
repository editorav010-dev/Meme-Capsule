-- Migration 007: Add Judge 4 and Judge 5 Accounts
-- Creates default judge accounts user-judge4 (judge4) and user-judge5 (judge5) in cat_users
-- Default initial password: "changeme123" (SHA-256: 494a715f7e9b4071aca61bac42ca858a309524e5864f0920030862a4ae7589be)

INSERT OR IGNORE INTO cat_users (id, username, display_name, password_hash, role, is_active)
VALUES 
  ('user-judge4', 'judge4', 'Judge Four', '494a715f7e9b4071aca61bac42ca858a309524e5864f0920030862a4ae7589be', 'judge', 1),
  ('user-judge5', 'judge5', 'Judge Five', '494a715f7e9b4071aca61bac42ca858a309524e5864f0920030862a4ae7589be', 'judge', 1);
