

## Epic 9 - Part 1: Email Templates Infrastructure

### Summary
Create an email templates system with database table, seed data, custom hook, and template selector in the compose dialog. No existing files will be deleted.

### Step A — Database Migration

Create `email_templates` table + seed 2 system templates in a single migration:

```sql
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- SELECT: system templates + own templates
CREATE POLICY "Users can read system or own templates"
ON public.email_templates FOR SELECT TO authenticated
USING (is_system = true OR owner_id = auth.uid());

-- INSERT: only own
CREATE POLICY "Users can insert own templates"
ON public.email_templates FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

-- UPDATE: only own
CREATE POLICY "Users can update own templates"
ON public.email_templates FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

-- DELETE: only own
CREATE POLICY "Users can delete own templates"
ON public.email_templates FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- Seed system templates
INSERT INTO public.email_templates (owner_id, name, subject, body_html, is_system) VALUES
(NULL, 'Hoş Geldin (Kurumsal)', 'Hoş Geldiniz, {{isim}}!',
 '<p>Merhaba {{isim}},</p><p>Ailemize hoş geldiniz! Size en iyi hizmeti sunmak için buradayız. Herhangi bir sorunuz olursa lütfen çekinmeden bize ulaşın.</p><p>Saygılarımızla,<br/>Koçunuz</p>',
 true),
(NULL, 'Antrenman Programı Hatırlatması', 'Yeni Antrenman Programınız Hazır, {{isim}}!',
 '<p>Merhaba {{isim}},</p><p>Yeni antrenman programınız sisteme yüklenmiştir. Lütfen uygulamadan programınızı inceleyiniz ve sorularınız için bizimle iletişime geçiniz.</p><p>Başarılar dileriz!</p>',
 true);
```

### Step B — Create Hook (`src/hooks/useEmailTemplates.ts`) — NEW FILE

```typescript
// Fetches templates where is_system=true OR owner_id=user.id
// Returns { templates, isLoading }
```

### Step C — Update `ComposeMailDialog.tsx` — EDIT (surgical)

- Add imports: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` + `useEmailTemplates` + `useAuth`
- Add template selector dropdown above "Kime" field labeled "Şablon Seç (İsteğe Bağlı)"
- On template selection: populate `subject` and `bodyText` (strip HTML tags for textarea display)
- No files deleted, no restructuring

### Files

| File | Action |
|------|--------|
| Migration SQL | CREATE table + RLS + seed |
| `src/hooks/useEmailTemplates.ts` | CREATE |
| `src/components/mailbox/ComposeMailDialog.tsx` | EDIT — add template selector |

