# LinkedIn OAuth Integration - Implementation Plan

## Overview and Goals

Enable event planners to import professional data about attendees via LinkedIn OAuth for better networking-focused seating optimization at corporate events.

### Primary Goals
1. Implement secure LinkedIn OAuth flow
2. Import professional profile data (name, company, job title, industry)
3. Map LinkedIn data to Guest model
4. Detect potential connections between attendees
5. Maintain privacy compliance (GDPR)

---

## OAuth Flow Diagram

```
+---------------+     1. Click "Import from LinkedIn"      +------------------+
|   SeatOptima  |----------------------------------------->|  LinkedIn OAuth  |
|   (Frontend)  |                                          |   Login Page     |
+---------------+                                          +------------------+
       |                                                          |
       |  2. User authorizes app                                  |
       |                                                          v
       |                                          +---------------------------+
       |                                          |  LinkedIn redirects to    |
       |                                          |  callback URL with code   |
       |                                          +---------------------------+
       |                                                          |
       |  3. Redirect to serverless function                      |
       v                                                          v
+------------------+     4. Exchange code for token      +------------------+
|   Serverless     |<------------------------------------|   LinkedIn API   |
|   Function       |------------------------------------>|   (OAuth Token)  |
| (Cloudflare)     |     5. Fetch profile data           +------------------+
+------------------+
       |
       |  6. Return profile data via postMessage
       v
+---------------+     7. Map data to Guest model         +------------------+
|   SeatOptima  |---------------------------------------->|   Zustand Store  |
+---------------+                                        +------------------+
```

---

## Backend Requirements

Since GitHub Pages is static, we need a serverless backend for secure token exchange.

### Recommended Options

| Option | Pros | Cons | Cost |
|--------|------|------|------|
| **Cloudflare Workers** | Fast, global, generous free tier | New platform | Free |
| **Vercel Serverless** | Great DX, React integration | 10s timeout | Free |
| **Netlify Functions** | Simple setup | 125k/month limit | Free |
| **AWS Lambda** | Most flexible | Complex setup | ~Free |

**Recommendation:** Cloudflare Workers - best free tier, global edge performance.

---

## LinkedIn API Scopes Needed

| Scope | Purpose | Data Retrieved |
|-------|---------|----------------|
| `openid` | Sign In with LinkedIn | User identity |
| `profile` | Basic profile info | Name, headline, picture |
| `email` | Email address | Primary email |

**API Endpoints:**
- `GET https://api.linkedin.com/v2/userinfo` - Basic info
- `GET https://api.linkedin.com/v2/me` - Extended profile with headline

---

## Data Mapping Specification

```typescript
// LinkedIn UserInfo Response
interface LinkedInUserInfo {
  sub: string;           // LinkedIn member ID
  name: string;          // Full name
  given_name: string;    // First name
  family_name: string;   // Last name
  email: string;         // Email address
  picture?: string;      // Profile picture URL
}

// Mapping to Guest model
function mapLinkedInToGuest(userInfo: LinkedInUserInfo, profile: LinkedInProfile): Partial<Guest> {
  const { jobTitle, company } = parseHeadline(profile.headline);

  return {
    name: userInfo.name,
    email: userInfo.email,
    company: company,
    jobTitle: jobTitle,
    linkedInId: userInfo.sub,
    profilePictureUrl: userInfo.picture,
  };
}

// Parse headline like "Software Engineer at Google"
function parseHeadline(headline: string): { jobTitle?: string; company?: string } {
  const atMatch = headline?.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch) {
    return { jobTitle: atMatch[1].trim(), company: atMatch[2].trim() };
  }
  return { jobTitle: headline, company: undefined };
}
```

---

## Implementation Steps

### Phase 1: Serverless Backend Setup

**Files to create:**
```
backend/
  wrangler.toml              # Cloudflare Workers config
  src/
    index.ts                 # Main worker entry
    linkedin-oauth.ts        # OAuth handling logic
```

**Endpoints:**
- `GET /auth/linkedin` - Initiates OAuth flow
- `GET /auth/linkedin/callback` - Handles OAuth callback

### Phase 2: Frontend Types and Store

**Modify:** `src/types/index.ts`
```typescript
export interface Guest {
  // ... existing fields ...
  linkedInId?: string;
  linkedInProfileUrl?: string;
  profilePictureUrl?: string;
  linkedInImportedAt?: string;
  consentGiven?: boolean;
}
```

### Phase 3: UI Components

| File | Description |
|------|-------------|
| `src/components/LinkedInImport/LinkedInImportButton.tsx` | OAuth trigger button |
| `src/components/LinkedInImport/LinkedInConsentModal.tsx` | Privacy consent dialog |
| `src/components/LinkedInImport/LinkedInProfilePreview.tsx` | Preview before import |
| `src/services/linkedInService.ts` | OAuth flow logic |

### Phase 4: Connection Detection

Since LinkedIn Connections API is restricted, use alternatives:

**Option A: Email Domain Matching**
```typescript
function detectSharedCompany(guests: Guest[]): Relationship[] {
  const byDomain = new Map<string, Guest[]>();
  guests.forEach(g => {
    if (g.email) {
      const domain = g.email.split('@')[1];
      const existing = byDomain.get(domain) || [];
      byDomain.set(domain, [...existing, g]);
    }
  });
  // Create colleague relationships for same domain
}
```

**Option B: Company Name Matching**
- Normalize company names
- Group by company
- Create colleague relationships

---

## Privacy/GDPR Considerations

### Required Consent Elements

1. **Transparency Notice:**
   - What data: Name, email, job title, company
   - Why: To optimize seating for professional networking
   - How long: Duration of event planning
   - Who: Only event planner, not shared

2. **Explicit Consent Checkbox:**
   ```
   [ ] I consent to SeatOptima accessing my LinkedIn profile
       information for seating optimization purposes.
   ```

3. **Data Subject Rights:**
   - Right to access: Export guest data
   - Right to deletion: Remove guest and LinkedIn data
   - Right to rectification: Edit imported data

---

## Fallback Strategies

### For Guests Without LinkedIn
1. Manual entry via GuestForm (existing)
2. CSV import (existing)
3. Survey integration (planned feature)

### For API Failures
```typescript
async function fetchProfileWithFallback(code: string): Promise<Guest> {
  try {
    return await fetchFromLinkedIn(code);
  } catch (error) {
    return {
      name: error.partialData?.name || 'Unknown',
      email: error.partialData?.email,
      requiresManualCompletion: true,
    };
  }
}
```

---

## Estimated Complexity

| Component | Effort | Risk |
|-----------|--------|------|
| Cloudflare Worker setup | 2 days | Low |
| LinkedIn OAuth implementation | 2 days | Medium |
| Frontend UI components | 3 days | Low |
| Store updates | 1 day | Low |
| Consent flow | 2 days | Medium |
| Connection detection | 2 days | High |
| Testing & polish | 3 days | Medium |

**Total Estimate: 15 days (3 weeks with buffer)**

---

## Environment Variables

**Frontend (.env.local):**
```env
VITE_LINKEDIN_BACKEND_URL=https://your-worker.workers.dev
VITE_LINKEDIN_CLIENT_ID=your_client_id
```

**Backend (Cloudflare secrets):**
```bash
wrangler secret put LINKEDIN_CLIENT_ID
wrangler secret put LINKEDIN_CLIENT_SECRET
wrangler secret put FRONTEND_URL
```

---

## File Structure

```
seating-arrangement/
├── backend/                          # Serverless backend
│   ├── wrangler.toml
│   └── src/
│       ├── index.ts
│       └── linkedin-oauth.ts
├── src/
│   ├── types/index.ts                # Add LinkedIn fields
│   ├── store/useStore.ts             # Add LinkedIn actions
│   ├── services/linkedInService.ts   # OAuth logic
│   └── components/LinkedInImport/
│       ├── LinkedInImportButton.tsx
│       ├── LinkedInConsentModal.tsx
│       ├── LinkedInProfilePreview.tsx
│       └── PrivacyNotice.tsx
```
