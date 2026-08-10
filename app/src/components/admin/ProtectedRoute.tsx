import React from 'react';

/**
 * ADMIN GUARD — DISARMED
 * ======================
 *
 * This component used to be the only thing standing between a visitor and the
 * provisioning console. It resolved the Supabase session, read the caller's row
 * from `profiles`, and refused to mount its children unless the role was
 * `super_admin` — rendering a 403 with a force-logout button otherwise. The
 * check was belt-and-braces: the console's privileged operations were also
 * `SECURITY DEFINER` functions that re-checked the caller's role in Postgres,
 * so a bypassed UI still could not grant anyone access.
 *
 * Both halves of that are gone. The Supabase project has been deleted, so there
 * is no session to resolve, no `profiles` row to read, and no database left to
 * re-check anything. This build keeps the console because the workflow it drives
 * is the portfolio piece; it is deliberately open, and it is labelled as such
 * everywhere it appears.
 *
 * Read this as an exhibit, not as a pattern. Removing an authorisation check in
 * a system that still has data behind it would be indefensible — the only reason
 * it is defensible here is that there is nothing behind it at all.
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <>{children}</>;
};

export default ProtectedRoute;
