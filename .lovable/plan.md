## MFA (2FA) Login Interceptor Hotfix

### Goal
Intercept the login flow in `src/pages/Login.tsx` so users enrolled in TOTP must enter their 6-digit code before reaching the dashboard. Users without 2FA continue to log in normally.

### Scope
Single file: `src/pages/Login.tsx`. No DB, no edge functions, no other components touched.

### Implementation Steps

1. **Imports**
   - Add `InputOTP`, `InputOTPGroup`, `InputOTPSlot` from `@/components/ui/input-otp`.
   - Add `supabase` from `@/integrations/supabase/client` (needed for `auth.mfa.*` calls — `AuthContext.signIn` doesn't expose them).
   - Add `ShieldCheck` icon from `lucide-react` for the MFA panel header.

2. **New state**
   - `showMfa: boolean`
   - `factorId: string`
   - `mfaCode: string`
   - `isVerifying: boolean`

3. **Refactor `handleSubmit`**
   - Keep using `signIn(email, password)` from `useAuth` for password verification (preserves existing toast + session wiring).
   - After success, call `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`.
   - If `currentLevel === 'aal1' && nextLevel === 'aal2'`:
     - `listFactors()` → pick first verified TOTP factor.
     - If found: `setFactorId`, `setShowMfa(true)`, clear `pendingLogin`, stop. Do NOT navigate.
   - Otherwise: fall through to the existing `pendingLogin` → role check → navigate path.

4. **New `handleVerifyMfa`**
   - `supabase.auth.mfa.challenge({ factorId })` → `verify({ factorId, challengeId, code: mfaCode })`.
   - On success: toast + let the existing `pendingLogin`/profile effect route to `/` (set `pendingLogin = true` so the coach-only role guard still applies).
   - On error: toast Turkish error, clear `mfaCode`, keep MFA panel open.
   - Guard: only enable submit when `mfaCode.length === 6`.

5. **Failure / cancel handling**
   - "İptal" button: `await supabase.auth.signOut()` then reset MFA state and clear inputs — prevents leaving a half-authenticated AAL1 session behind.
   - If `getAuthenticatorAssuranceLevel` or `listFactors` throws: sign out, toast error, reset to login form.

6. **JSX**
   - Conditional render inside the existing glass card:
     - `showMfa === false` → current email/password form unchanged.
     - `showMfa === true` → MFA panel: `ShieldCheck` header, Turkish copy ("Güvenlik Kodu" / "Authenticator uygulamanızdaki 6 haneli kodu girin"), centered `InputOTP` with 6 `InputOTPSlot`s, "Doğrula ve Giriş Yap" primary button, "İptal" ghost button.
   - Reuse existing dark/glass styling (`bg-black/40 backdrop-blur-xl border-white/10`) — no new design tokens.

7. **Role gate preservation**
   - The existing `useEffect` that checks `profile.role === 'coach'` and signs out non-coaches must still run after MFA verification. Achieved by setting `pendingLogin = true` once MFA verify succeeds, so profile-load triggers the same gate.

### Technical Notes
- Supabase persists the AAL1 session immediately after `signInWithPassword`. We must NOT navigate until either (a) no TOTP factor exists, or (b) `mfa.verify` resolves successfully — otherwise `ProtectedRoute` lets the user in at AAL1.
- `listFactors()` returns both verified and unverified TOTP entries; filter to `status === 'verified'` to avoid challenging against a pending enrollment.
- Cancel must `signOut()` to invalidate the AAL1 session; otherwise a refresh would bypass MFA.

### Verification
- Coach without 2FA → unchanged behavior, lands on `/`.
- Coach with verified TOTP → password submit reveals OTP panel; correct code → `/`; wrong code → toast, stays on panel; cancel → returns to login, session cleared.
- Non-coach with correct password (and MFA if any) → still hits the role guard and is signed out with the existing toast.
