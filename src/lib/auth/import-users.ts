/**
 * The mapping from Supabase's auth.users rows to Better Auth's rows
 * (OPS-365). A pure function: OPS-366's copy tool calls it with the rows it
 * read and writes what it returns to auth_users and auth_accounts
 * (migrations/d1/0002_auth.sql). Nothing calls it yet.
 *
 * Passwords: Supabase Auth keeps a bcrypt hash in encrypted_password. A hash
 * that starts with $2a$, $2b$ or $2y$ moves as it is (Better Auth here
 * verifies with bcryptjs, which reads all three). Anything else, or no hash,
 * cannot move: that user gets no account row and is listed in `needInvite`, so
 * the copy tool sends them a new invite after the flip.
 */
export interface SupabaseAuthUser {
  id: string;
  email: string | null;
  encrypted_password?: string | null;
  email_confirmed_at?: string | null;
  banned_until?: string | null;
  raw_user_meta_data?: { full_name?: unknown } | null;
  created_at?: string | null;
}

export interface AuthUserRow {
  id: string;
  email: string;
  name: string;
  email_verified: 0 | 1;
  banned_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthAccountRow {
  id: string;
  user_id: string;
  account_id: string;
  provider_id: "credential";
  password: string;
  created_at: string;
  updated_at: string;
}

const BCRYPT = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

export function authRowsFromSupabase(users: SupabaseAuthUser[], now: Date = new Date()): {
  users: AuthUserRow[];
  accounts: AuthAccountRow[];
  needInvite: string[];
} {
  const out = { users: [] as AuthUserRow[], accounts: [] as AuthAccountRow[], needInvite: [] as string[] };
  for (const u of users) {
    const email = (u.email ?? "").trim().toLowerCase();
    if (!u.id || !email) continue; // a user without an email cannot sign in
    const created = u.created_at ? new Date(u.created_at).toISOString() : now.toISOString();
    const fullName = u.raw_user_meta_data?.full_name;
    out.users.push({
      id: u.id,
      email,
      name: typeof fullName === "string" ? fullName.trim() : "",
      email_verified: u.email_confirmed_at ? 1 : 0,
      banned_until: u.banned_until ? new Date(u.banned_until).toISOString() : null,
      created_at: created,
      updated_at: now.toISOString(),
    });
    const hash = u.encrypted_password ?? "";
    if (BCRYPT.test(hash)) {
      out.accounts.push({
        id: crypto.randomUUID(),
        user_id: u.id,
        account_id: u.id,
        provider_id: "credential",
        password: hash,
        created_at: created,
        updated_at: now.toISOString(),
      });
    } else {
      out.needInvite.push(u.id);
    }
  }
  return out;
}
