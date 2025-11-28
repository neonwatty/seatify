# Survey Builder - Implementation Plan

## Overview and Goals

Enable event planners to create custom questionnaires that attendees can fill out before the event, gathering preferences, relationships, and interests that feed into the seating optimization algorithm.

### Key Goals
1. Drag-and-drop survey builder interface for planners
2. Generate shareable survey links (serverless)
3. Support multiple question types including relationship mapping
4. Automatically map survey responses to Guest profile fields
5. Pre-built templates for weddings and corporate events

---

## Survey Builder UI Design

**Layout Structure:**
```
+------------------------------------------+
| Header (with "Surveys" nav button)        |
+------------------------------------------+
| Survey Builder Panel    | Preview Panel  |
| - Template selector     | Live preview   |
| - Question list (drag)  | of survey as   |
| - Add question button   | attendee sees  |
| - Question editor       | it             |
+------------------------------------------+
```

**Components:**
- `SurveyBuilder.tsx` - Main two-column layout
- `SurveyTemplateSelector.tsx` - Template dropdown/cards
- `QuestionList.tsx` - Draggable list using @dnd-kit
- `QuestionEditor.tsx` - Modal for editing questions
- `SurveyPreview.tsx` - Real-time preview
- `ShareSurveyModal.tsx` - Generate shareable link

---

## Attendee Survey Flow (Serverless)

**Challenge:** No backend means attendees cannot submit directly to a database.

**Solution: URL-Encoded Response Protocol**

### Step 1: Planner generates survey link
```
https://username.github.io/seating-arrangement/#/survey/{surveyToken}
```
- `surveyToken`: Base64-encoded JSON containing survey questions, event name, guest names

### Step 2: Attendee fills out survey
- App decodes surveyToken from URL
- Renders standalone survey form
- Attendee completes survey

### Step 3: Response submission (2 options)

**Option A: Copy-to-Clipboard Response Code (Recommended)**
- Generate Base64 JSON response code
- Attendee copies and sends to planner via email/text
- Planner pastes into "Import Responses" modal

**Option B: mailto: Link**
- Generate pre-filled email with response data
- Subject: `[SeatOptima Response] {Event Name} - {Guest Name}`

---

## Question Type Specifications

```typescript
type QuestionType =
  | 'text'           // Free text input
  | 'textarea'       // Multi-line text
  | 'single_select'  // Radio buttons
  | 'multiselect'    // Checkboxes
  | 'relationship'   // "Who do you know?" selector
  | 'rating'         // 1-5 scale
  | 'yesno';         // Simple yes/no

interface SurveyQuestion {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
  helpText?: string;
  placeholder?: string;
  mapsTo?: GuestFieldMapping;
  order: number;
}

type GuestFieldMapping =
  | 'interests'
  | 'dietaryRestrictions'
  | 'accessibilityNeeds'
  | 'company'
  | 'jobTitle'
  | 'industry'
  | 'group'
  | 'relationships';
```

---

## Response-to-Guest Mapping

```typescript
function importSurveyResponse(response: EncodedResponse, event: Event) {
  // 1. Find existing guest by email or name
  let guest = event.guests.find(
    g => g.email === response.guestEmail ||
         g.name.toLowerCase() === response.guestName.toLowerCase()
  );

  // 2. Create new guest if not found
  if (!guest) {
    guest = createGuest({ name: response.guestName, email: response.guestEmail });
  }

  // 3. Process each answer based on question's mapsTo field
  for (const answer of response.answers) {
    const question = event.surveyQuestions.find(q => q.id === answer.questionId);
    if (!question?.mapsTo) continue;

    switch (question.mapsTo) {
      case 'interests':
        guest.interests = parseListAnswer(answer.answer);
        break;
      case 'relationships':
        const relationships = parseRelationshipAnswer(answer.answer, event.guests);
        guest.relationships = [...guest.relationships, ...relationships];
        break;
      // ... handle other mappings
    }
  }

  return guest;
}
```

---

## Template Designs

### Wedding Template

```typescript
const weddingTemplate: SurveyQuestion[] = [
  {
    id: 'wedding-1',
    question: 'Which side are you here for?',
    type: 'single_select',
    options: ["Bride's side", "Groom's side", "Both", "Neither"],
    required: true,
    mapsTo: 'group',
  },
  {
    id: 'wedding-2',
    question: 'Who else attending do you know?',
    type: 'relationship',
    helpText: 'Select anyone you know and how you know them',
    mapsTo: 'relationships',
  },
  {
    id: 'wedding-3',
    question: 'What are your hobbies or interests?',
    type: 'multiselect',
    options: ['Sports', 'Music', 'Art', 'Travel', 'Food & Wine', 'Technology', 'Reading', 'Outdoors'],
    mapsTo: 'interests',
  },
  {
    id: 'wedding-4',
    question: 'Any dietary restrictions?',
    type: 'multiselect',
    options: ['Vegetarian', 'Vegan', 'Gluten-free', 'Kosher', 'Halal', 'Nut allergy', 'None'],
    required: true,
    mapsTo: 'dietaryRestrictions',
  },
  {
    id: 'wedding-5',
    question: 'Is there anyone you would prefer NOT to be seated near?',
    type: 'text',
    helpText: 'This information is confidential',
  },
];
```

### Corporate Event Template

```typescript
const corporateTemplate: SurveyQuestion[] = [
  {
    question: 'What company do you work for?',
    type: 'text',
    mapsTo: 'company',
  },
  {
    question: 'What is your job title?',
    type: 'text',
    mapsTo: 'jobTitle',
  },
  {
    question: 'Which industry best describes your work?',
    type: 'single_select',
    options: ['Technology', 'Finance', 'Healthcare', 'Consulting', 'Marketing', 'Legal'],
    mapsTo: 'industry',
  },
  {
    question: 'Which colleagues attending do you already know?',
    type: 'relationship',
    mapsTo: 'relationships',
  },
  {
    question: 'Rate your comfort level with networking:',
    type: 'rating',
    ratingLabels: { low: 'Prefer familiar faces', high: 'Love meeting new people' },
  },
];
```

---

## Implementation Steps

### Phase 1: Type Definitions and Store

| Step | File | Description |
|------|------|-------------|
| 1.1 | `src/types/index.ts` | Extend SurveyQuestion with new fields |
| 1.2 | `src/types/index.ts` | Add SurveyToken, EncodedResponse interfaces |
| 1.3 | `src/store/useStore.ts` | Add survey CRUD actions |
| 1.4 | `src/store/useStore.ts` | Add response import actions |

### Phase 2: Survey Builder Components

| Step | File | Description |
|------|------|-------------|
| 2.1 | `src/components/survey/SurveyBuilder.tsx` | Main two-column layout |
| 2.2 | `src/components/survey/QuestionList.tsx` | Draggable question list |
| 2.3 | `src/components/survey/QuestionEditor.tsx` | Question editing modal |
| 2.4 | `src/components/survey/SurveyPreview.tsx` | Live preview panel |
| 2.5 | `src/components/survey/TemplateSelector.tsx` | Template selection UI |

### Phase 3: Question Type Renderers

| File | Description |
|------|-------------|
| `src/components/survey/questions/TextQuestion.tsx` | Text inputs |
| `src/components/survey/questions/SelectQuestion.tsx` | Single/multi select |
| `src/components/survey/questions/RatingQuestion.tsx` | Star rating |
| `src/components/survey/questions/RelationshipQuestion.tsx` | Guest relationship selector |

### Phase 4: Attendee Survey View

| File | Description |
|------|-------------|
| `src/components/survey/AttendeeSurvey.tsx` | Standalone survey form |
| `src/components/survey/SurveySubmitSuccess.tsx` | Success page with response code |
| `src/utils/surveyEncoding.ts` | Encode/decode functions |

### Phase 5: Share and Import

| File | Description |
|------|-------------|
| `src/components/survey/ShareSurveyModal.tsx` | Generate shareable link |
| `src/components/survey/ImportResponseModal.tsx` | Paste response code |
| `src/utils/responseMapper.ts` | Map responses to Guest fields |

### Phase 6: Routing and Integration

- Add survey route handling to `App.tsx`
- Add "Surveys" navigation to `Header.tsx`
- Create `useSurveyRoute.ts` hook for URL parsing

---

## Estimated Complexity

| Component | Complexity | Effort (Hours) |
|-----------|------------|----------------|
| Type definitions | Low | 2 |
| Store updates | Medium | 4 |
| Survey Builder UI | High | 12 |
| Question Editor | Medium | 6 |
| Question Renderers | Medium | 8 |
| Attendee Survey | Medium | 6 |
| URL Encoding/Decoding | Low | 3 |
| Response Import | Medium | 5 |
| Share Modal | Low | 2 |
| Templates | Low | 2 |
| Routing Integration | Medium | 4 |
| CSS/Styling | Medium | 6 |
| **Total** | | **~60 hours** |

---

## File Structure

```
src/
├── components/survey/
│   ├── SurveyBuilder.tsx
│   ├── SurveyBuilder.css
│   ├── QuestionList.tsx
│   ├── QuestionCard.tsx
│   ├── QuestionEditor.tsx
│   ├── SurveyPreview.tsx
│   ├── TemplateSelector.tsx
│   ├── ShareSurveyModal.tsx
│   ├── ImportResponseModal.tsx
│   ├── AttendeeSurvey.tsx
│   ├── AttendeeSurvey.css
│   └── questions/
│       ├── TextQuestion.tsx
│       ├── SelectQuestion.tsx
│       ├── RatingQuestion.tsx
│       ├── RelationshipQuestion.tsx
│       └── index.ts
├── utils/
│   ├── surveyEncoding.ts
│   └── responseMapper.ts
├── data/
│   └── surveyTemplates.ts
└── hooks/
    └── useSurveyRoute.ts
```
