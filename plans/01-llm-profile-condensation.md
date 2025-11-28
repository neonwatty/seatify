# LLM Profile Condensation - Implementation Plan

## Overview and Goals

This feature adds LLM-powered profile condensation to the seating arrangement app, enabling event planners to automatically generate actionable guest summaries that improve seating optimization decisions.

### Primary Goals
1. Integrate LLM API (OpenAI) for client-side profile analysis
2. Condense disparate guest data into optimization-ready summaries
3. Extract seating-relevant insights (conversation topics, networking potential, compatibility signals)
4. Maintain privacy by keeping all data client-side with user-provided API keys
5. Enhance the optimization algorithm with LLM-generated insights

### Success Metrics
- Reduce time spent manually analyzing guest profiles by 80%
- Improve seating optimization scores through better compatibility matching
- Zero server-side data transmission (privacy-first)

---

## Technical Approach

### Architecture Decision: Client-Side LLM Integration

Since the app runs on GitHub Pages with no backend, we will use a **direct client-side OpenAI API integration** with user-provided API keys. This approach:
- Maintains the serverless architecture
- Keeps all guest data on the client
- Allows users to control API costs
- Avoids CORS issues by calling OpenAI directly

### LLM Provider Strategy

```
Primary: OpenAI GPT-4o-mini (cost-effective, fast)
Fallback: OpenAI GPT-3.5-turbo (cheaper fallback)
Future: Support for other providers (Anthropic, local models)
```

### Data Flow Diagram

```
+------------------+     +-------------------+     +------------------+
|   Guest Form     |     |   Profile Data    |     |   LLM Service    |
|   (manual entry) |---->|   Aggregator      |---->|   (OpenAI API)   |
+------------------+     +-------------------+     +------------------+
                                 ^                         |
+------------------+             |                         v
|   CSV Import     |-------------+                 +------------------+
+------------------+                               |   Response       |
                                                   |   Parser         |
+------------------+                               +------------------+
|   Survey Data    |-------------+                         |
+------------------+             |                         v
                                 v                 +------------------+
                         +-------------------+     |  profileSummary  |
                         |   Zustand Store   |<----|  + metadata      |
                         |   (persistence)   |     +------------------+
                         +-------------------+
                                 |
                                 v
                    +------------------------+
                    |   Optimization Engine  |
                    |   (enhanced scoring)   |
                    +------------------------+
```

---

## Implementation Steps

### Phase 1: API Key Management & Service Layer

#### Step 1.1: Create Settings Store Slice
**File:** `src/store/settingsSlice.ts`

```typescript
interface SettingsState {
  openaiApiKey: string | null;
  llmModel: 'gpt-4o-mini' | 'gpt-3.5-turbo';
  autoCondenseOnImport: boolean;

  setOpenaiApiKey: (key: string | null) => void;
  setLlmModel: (model: SettingsState['llmModel']) => void;
  setAutoCondenseOnImport: (value: boolean) => void;
}
```

#### Step 1.2: Create LLM Service Module
**File:** `src/services/llmService.ts`

```typescript
interface LLMService {
  condenseProfile(guest: Guest, context: EventContext): Promise<CondensedProfile>;
  condenseProfiles(guests: Guest[], context: EventContext): Promise<Map<string, CondensedProfile>>;
  validateApiKey(key: string): Promise<boolean>;
}

interface CondensedProfile {
  summary: string;           // 2-3 sentence profile
  conversationTopics: string[];  // Good icebreaker topics
  networkingValue: 'low' | 'medium' | 'high';
  personalitySignals: string[];  // e.g., "introvert", "connector"
  seatingNotes: string;      // Specific seating recommendations
  compatibilityTags: string[]; // For matching algorithm
}
```

#### Step 1.3: Create Rate Limiter Utility
**File:** `src/utils/rateLimiter.ts`

### Phase 2: Types and Data Model Extensions

#### Step 2.1: Extend Guest Type
**File:** `src/types/index.ts`

Add to existing Guest interface:
```typescript
export interface Guest {
  // ... existing fields ...

  // LLM-generated profile data
  profileSummary?: string;
  condensedProfile?: CondensedProfile;
  profileGeneratedAt?: string; // ISO date
  profileVersion?: number;     // For cache invalidation
}
```

### Phase 3: UI Components

| Component | File | Description |
|-----------|------|-------------|
| SettingsModal | `src/components/SettingsModal.tsx` | API key management |
| ProfileSummaryCard | `src/components/ProfileSummaryCard.tsx` | Display condensed profile |
| BulkCondensePanel | `src/components/BulkCondensePanel.tsx` | Batch processing UI |

### Phase 4: Integration with Existing Components

- Modify `GuestForm.tsx` to add AI profile section
- Enhance `OptimizeView.tsx` with profile-aware scoring
- Update `Header.tsx` to add settings access

### Phase 5: Optimization Algorithm Enhancement

```typescript
function calculateCompatibilityScore(guest1: Guest, guest2: Guest): number {
  let score = 0;
  const p1 = guest1.condensedProfile;
  const p2 = guest2.condensedProfile;

  if (!p1 || !p2) return score;

  // Shared compatibility tags
  const sharedTags = p1.compatibilityTags.filter(
    tag => p2.compatibilityTags.includes(tag)
  );
  score += sharedTags.length * 3;

  // Complementary networking values
  if (p1.networkingValue === 'high' && p2.networkingValue === 'low') {
    score += 2; // Connector + introvert pairing
  }

  // Shared conversation topics
  const sharedTopics = p1.conversationTopics.filter(
    topic => p2.conversationTopics.some(t =>
      t.toLowerCase().includes(topic.toLowerCase())
    )
  );
  score += sharedTopics.length * 2;

  return score;
}
```

---

## API Interface Design

### LLM Prompt Template

```
You are an expert event planner analyzing guest profiles to optimize seating arrangements.

EVENT CONTEXT:
- Event Type: {eventType}
- Event Name: {eventName}

GUEST PROFILE:
- Name: {name}
- Company: {company}
- Job Title: {jobTitle}
- Industry: {industry}
- Interests: {interests}
- Group: {group}
- Notes: {notes}

Generate a structured analysis for seating optimization in JSON format:
{
  "summary": "",
  "conversationTopics": [],
  "networkingValue": "",
  "personalitySignals": [],
  "seatingNotes": "",
  "compatibilityTags": []
}
```

---

## Privacy Considerations

1. **No Server Storage**: All data remains in browser localStorage
2. **User-Controlled API Keys**: Keys stored locally only
3. **Minimal Data Transmission**: Only send essential guest fields to LLM
4. **Clear Disclosure**: UI states data is sent to OpenAI
5. **Opt-In Only**: Profile generation requires explicit user action

---

## Error Handling Strategy

| Error Code | User Message | Action |
|------------|--------------|--------|
| INVALID_API_KEY | "API key is invalid" | Open Settings |
| RATE_LIMITED | "Too many requests. Waiting..." | Retry Now |
| QUOTA_EXCEEDED | "OpenAI quota exceeded" | OpenAI Dashboard |
| NETWORK_ERROR | "Network error" | Retry |

---

## Estimated Complexity

| Component | Complexity | Estimated Hours |
|-----------|------------|-----------------|
| Settings Store & UI | Low | 4 |
| LLM Service Module | Medium | 8 |
| Rate Limiter | Medium | 4 |
| ProfileSummaryCard | Low | 3 |
| GuestForm Integration | Low | 2 |
| BulkCondensePanel | Medium | 6 |
| Optimization Enhancement | Medium | 6 |
| Error Handling | Medium | 4 |
| Testing | Medium | 8 |
| **Total** | | **45 hours** |

---

## File Structure

```
src/
  services/
    llmService.ts           # Core LLM integration
  utils/
    rateLimiter.ts          # Rate limiting utility
  store/
    useStore.ts             # Extend with settings slice
  types/
    index.ts                # Extend Guest, add CondensedProfile
  components/
    SettingsModal.tsx       # API key management
    ProfileSummaryCard.tsx  # Display condensed profile
    BulkCondensePanel.tsx   # Batch processing UI
```
