# Control room

Open `/admin` on the public Vercel site or local Node site and sign in with the password configured on the server. The password and session signing key are environment variables, not repository or browser values.

## What can be edited

| Area | Change | Public effect |
| --- | --- | --- |
| Site & stream | Two opening lines, placeholder title and note, YouTube Live URL/ID | Replaces public copy or activates the YouTube player. Paper-trading labels remain fixed. |
| Simulation | Zone hold time, cooldown, virtual order size | Updates the method and decision rules. The local persistent server applies changes to new camera observations immediately. |
| Paper ledger | Scenario USD prices | Revalues the sample portfolio. These prices are labelled scenario values, not live quotes. |
| Paper ledger | Add a virtual BUY/SELL | Updates cash, units, chart and trade history. The entry is labelled `Admin`, not `Camera`. |

The Vercel control room edits its dedicated Neon **preview** database. It does not control the separate camera-driven SQLite ledger, which can be edited through `/admin` on the persistent Node deployment. Vercel has no observation-ingest route or continuous event stream. The public Vercel page checks for saved changes each minute; reload for an immediate view.

## Authentication and storage

Set `ADMIN_PASSWORD` and a random `ADMIN_SESSION_SECRET` of at least 32 characters. The Vercel project stores these as secret environment variables. The server compares password hashes in constant time, issues a signed, HTTP-only, SameSite Strict cookie for 12 hours, checks request origin on writes, and locks an IP for 15 minutes after five failed sign-ins. The local Node server uses an in-process lockout; Vercel stores attempts in Neon so separate functions share the limit.

The Vercel database uses `preview_settings`, `preview_quotes`, `preview_trades` and `admin_login_attempts` tables. The schema is created on first use. `preview_settings.revision` guards manual-trade inserts against a simultaneous edit. Preview trades are append-only through the panel; there is no silent delete or relabelling as camera decisions.

The local Node server stores site settings, rules and scenario overrides in the existing SQLite `settings` table. Manual trades are recorded through its normal transactional ledger with `source=admin`. Back up the SQLite volume before making operational changes to a live season.

## First use

1. Sign in at `/admin`.
2. Open **Site & stream** to add Vlad's actual YouTube Live URL when ready. Until then, leave the field blank and the temporary still remains visible.
3. Open **Simulation** to review the 5-second hold, 30-second cooldown and $500 virtual order defaults.
4. Open **Paper ledger** to change scenario prices or add clearly labelled admin paper trades.
5. Use **Open public site** and reload to verify the published view.
