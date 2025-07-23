# CRITICAL RULES - NEVER VIOLATE

## 🚨 DATABASE RESET RULE - ABSOLUTELY FORBIDDEN

**NEVER, UNDER ANY CIRCUMSTANCES, SUGGEST OR ATTEMPT TO:**

1. **Reset the database** (`supabase db reset`, `DROP DATABASE`, etc.)
2. **Drop tables** (`DROP TABLE`, `TRUNCATE TABLE`)
3. **Delete all data** in any way
4. **Use destructive migration commands**

## ✅ SAFE DATABASE OPERATIONS ONLY

**ONLY use these safe, additive operations:**

1. **Add new tables** (`CREATE TABLE IF NOT EXISTS`)
2. **Add new columns** (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`)
3. **Add indexes** (`CREATE INDEX IF NOT EXISTS`)
4. **Add constraints** (`ALTER TABLE ... ADD CONSTRAINT`)
5. **Create functions** (`CREATE OR REPLACE FUNCTION`)
6. **Create policies** (`CREATE POLICY`)
7. **Update existing data** (`UPDATE ... WHERE`)

## 🔍 ALWAYS CHECK BEFORE SUGGESTING

Before making any database-related suggestion, I MUST:

1. **Read this file first**
2. **Verify the operation is additive only**
3. **Ensure no data loss can occur**
4. **Double-check with the user before executing migrations**

## 📝 MIGRATION SAFETY CHECKLIST

Every migration must:
- [ ] Use `IF NOT EXISTS` clauses
- [ ] Be additive only (no DROP commands)
- [ ] Preserve existing data
- [ ] Not affect existing functionality
- [ ] Be tested in a safe environment first

## ⚠️ EMERGENCY PROCEDURE

If a migration fails or causes issues:
1. **DO NOT suggest reset**
2. **Create a new migration to fix the issue**
3. **Use `ALTER TABLE` to correct problems**
4. **Always preserve existing data**

---

**This rule is ABSOLUTE and cannot be overridden under any circumstances.** 