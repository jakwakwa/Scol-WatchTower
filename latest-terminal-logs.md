# **Terminal log analysis**

Summary of what the logs show from your dev run (Inngest \+ Next.js).

---

## 1\. Environment

- **Inngest dev server**: `http://localhost:8288` (then auto-discovery disabled after sync).  
- **Next.js**: 16.1.6 (Turbopack), `http://localhost:3000`, loading `.env.local` and `.env`.

---

## 2\. Request/response health

- **API routes**: `PUT /api/inngest` and `POST /api/inngest` consistently return **200** or **206** (step runs).  
- **Dashboard/applicant/quote/form endpoints**: mostly **200**, with some slow responses (e.g. first compile of a route).

---

## 3\. Business flow (what actually happened)

### Applicant 6 (workflow 6\)

1. **Lead created** → `onboarding/lead.created` → workflow started.  
2. **Stage 1**: ITC credit check (Mockaroo) → company “Skynoodle”, AUTO\_APPROVE.  
3. **Stage 2**: Quote generated (quoteId 3, R500k), then workflow set to `awaiting_human`.  
4. **Quote approved** (staff) → form links “mock emailed” to `jakwakwa@gmail.com` (Facility Application, Signed Quotation, StratCol Contract, ABSA 6995, Document Uploads).  
5. Workflow then **waiting for Signed Quotation**.  
6. **Form submitted**: SIGNED\_QUOTATION submitted → `form/submitted` then `quote/signed` published.  
7. Workflow updated to **“Waiting for Contract Signed signal…”** (next step).

### Applicant 7 (workflow 7\)

1. Same sequence: lead created → ITC (“Photojam”, MANUAL\_REVIEW) → quote 4 → awaiting human → quote approved → form links emailed → **waiting for Signed Quotation**.  
2. No form submission for 7 in this log; workflow 7 stays at “Waiting for Signed Quotation”.

---

## 4\. Errors and warnings

| Issue | When | Meaning |
| :---- | :---- | :---- |
| **Clerk infinite redirect** | On `GET /forms/7igpfaIAEYDMazqRE89sE1CoMbHMGiBj57ph5hNI87Q` and `GET /forms/obhprS3AqUwrs-ZTnTKWLWRVNyHrBIy3rm2KDgmXt-M` | “Refreshing the session token resulted in an infinite redirect loop… your Clerk instance keys do not match”. Typically: form pages are hit without a valid Clerk session (e.g. magic-link user or different origin), and the app tries to refresh auth and redirects in a loop. Can also be wrong/mismatched publishable vs secret keys. |
| **404 favicons** | Multiple | `GET /apple-touch-icon.png` and `GET /apple-touch-icon-precomposed.png` return 404\. Browsers request these automatically; optional to fix. |

The form pages still returned **200** after the Clerk message, so the request eventually completed despite the redirect warning.

---

## 5\. Inngest behaviour

- **StratCol Client Onboarding** (`stratcol-onboard-stratcol-client-onboarding`) is invoked for:  
  - `onboarding/lead.created`  
  - `onboarding/quote-generated`  
  - `quote/approved`  
  - `form/submitted` → then your app emits `quote/signed`, and the same function runs again for `quote/signed`.  
- Steps are executed via `POST /api/inngest?fnId=...&stepId=step` with **206**.  
- Log lines like “\[Workflow\] STARTED for applicant=6 workflow=6” repeat per step because the function is re-run from the beginning each time; that’s normal for step-based Inngest functions.

---

## 6\. Notifications

- **Stage change** events logged for workflows 6 and 7\.  
- Notifications created for: “Quote ready for approval”, “Onboarding forms sent”, “Form submitted \- SIGNED QUOTATION submitted successfully.”

---

## 7\. Summary

- **Flows**: Two applicants (6 and 7\) went through lead → ITC → quote → staff approval → form links sent. Applicant **6** completed the Signed Quotation form and the workflow correctly advanced to “Waiting for Contract Signed signal”. Applicant **7** is still waiting for that form.  
- **Problems**: (1) **Clerk redirect loop** when opening magic-link form URLs—likely auth/keys or how form routes handle unauthenticated/magic-link users. (2) **Missing apple touch icons** (404), cosmetic only.  
- **Next step**: Resolve the Clerk warning by ensuring form routes use the correct Clerk instance and keys, and optionally allow unauthenticated or magic-link access for those form URLs so token refresh doesn’t cause a redirect loop.
