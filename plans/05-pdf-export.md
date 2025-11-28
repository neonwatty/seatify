# PDF Export - Implementation Plan

## Overview and Goals

Add comprehensive PDF export functionality to generate print-ready documents for event planning.

### Export Types
1. **Floor plan** - Visual representation of all tables
2. **Table cards** - List of guests per table
3. **Place cards** - Name cards for each seat
4. **Guest list** - Complete list with table assignments
5. **Dietary report** - Summary of dietary/accessibility needs

### Success Criteria
- High-quality, print-ready PDFs (Letter, A4)
- Customizable templates (fonts, colors, branding)
- Handle 100+ guests efficiently
- Works entirely client-side
- Export times under 5 seconds

---

## Library Comparison

### Option 1: jsPDF
| Aspect | Details |
|--------|---------|
| **Pros** | Lightweight (~300KB), no dependencies, full control |
| **Cons** | Manual positioning, limited styling |
| **Best for** | Guest lists, table cards, reports |

### Option 2: @react-pdf/renderer
| Aspect | Details |
|--------|---------|
| **Pros** | React syntax, flexbox layout, typography control |
| **Cons** | Larger bundle (~800KB), learning curve |
| **Best for** | Complex template-based documents |

### Option 3: html2canvas + jsPDF
| Aspect | Details |
|--------|---------|
| **Pros** | Captures existing components, preserves CSS |
| **Cons** | Rasterized (not vector), larger files, poor text quality |
| **Best for** | Floor plan visual export |

---

## Recommended Approach: Hybrid

**Architecture:**
- **jsPDF** for structured documents (guest lists, reports)
- **jspdf-autotable** for table rendering
- **html2canvas** for floor plan capture

**Dependencies:**
```json
{
  "jspdf": "^2.5.1",
  "html2canvas": "^1.4.1",
  "jspdf-autotable": "^3.8.1"
}
```

---

## PDF Layout Designs

### 1. Floor Plan Export

```
+--------------------------------------------------+
|  [Logo]     Event Name            Date           |
|--------------------------------------------------|
|                                                  |
|     +-----+                    +-----+           |
|     |  T1 |                    |  T2 |           |
|     +-----+                    +-----+           |
|                                                  |
|         +-----+     +-----+                      |
|         |  T3 |     |  T4 |                      |
|         +-----+     +-----+                      |
|                                                  |
|--------------------------------------------------|
|  Total: 8 Tables | 64 Guests | Generated: Date  |
+--------------------------------------------------+
```

- Landscape orientation
- html2canvas captures Canvas component
- Header with event details
- Footer with statistics

### 2. Table Cards (4 per page)

```
+---------------------------+
|       TABLE 1             |
|       (Round, 8 seats)    |
|                           |
|  1. John Smith            |
|  2. Jane Doe      [V]     |
|  3. Bob Wilson            |
|  4. Alice Brown   [GF]    |
|                           |
|  [V]=Vegetarian [GF]=GF   |
+---------------------------+
```

- 4.25" x 5.5" cards
- Cut lines for separation
- Dietary legend symbols

### 3. Place Cards (8 per page)

```
+---------------------------+
|      John Smith           |
|      ─────────            |
|      Table 1              |
|...........................|  <-- Fold line
|      John Smith           |
|      Table 1              |
+---------------------------+
```

- 4" x 2" folded tent cards
- Large readable font (18-24pt)
- Duplicated above/below fold

### 4. Guest List

```
+--------------------------------------------------+
|  [Logo]        GUEST LIST         Page 1 of 3    |
|--------------------------------------------------|
| #  | Guest Name    | Table | Company  | Dietary  |
|----|---------------|-------|----------|----------|
| 1  | John Smith    |   1   | Acme Co  | -        |
| 2  | Jane Doe      |   1   | -        | Vegan    |
|--------------------------------------------------|
|  Total: 64  |  Assigned: 60  |  Pending: 4      |
+--------------------------------------------------+
```

- Portrait orientation
- Sortable: alphabetical, by table, by group
- Multi-page with pagination

### 5. Dietary Report

```
+--------------------------------------------------+
|  DIETARY & ACCESSIBILITY REPORT                  |
|--------------------------------------------------|
|  SUMMARY                                         |
|  │ Vegetarian     │   8   │   12.5%    │         |
|  │ Vegan          │   3   │    4.7%    │         |
|  │ Gluten-free    │   5   │    7.8%    │         |
|--------------------------------------------------|
|  GUESTS WITH RESTRICTIONS                        |
|  Vegetarian: Jane Doe (T1), Mike Johnson (T3)    |
|--------------------------------------------------|
|  ACCESSIBILITY NEEDS                             |
|  Bob Wilson: Wheelchair access (Table 2)         |
+--------------------------------------------------+
```

---

## Template Customization

```typescript
interface PdfTemplate {
  id: string;
  name: string;

  // Branding
  logo?: string;

  // Typography
  fonts: {
    heading: FontConfig;
    body: FontConfig;
  };

  // Colors
  colors: {
    primary: string;
    secondary: string;
    text: string;
    border: string;
  };

  // Layout
  pageSize: 'letter' | 'a4';
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number };

  // Style
  headerStyle: 'minimal' | 'elegant' | 'corporate';
  showPageNumbers: boolean;
}
```

### Pre-built Templates

1. **Elegant (Wedding)** - Serif fonts, soft colors, decorative borders
2. **Corporate** - Sans-serif, navy/gray, clean lines
3. **Modern Minimal** - Black/white, no decoration
4. **Custom** - User-configurable

---

## Implementation Steps

### Phase 1: Foundation (2-3 days)

| Step | File | Description |
|------|------|-------------|
| 1.1 | Install deps | `npm install jspdf jspdf-autotable html2canvas` |
| 1.2 | `src/types/pdf.ts` | PdfTemplate, ExportOptions interfaces |
| 1.3 | `src/services/pdf/PdfGenerator.ts` | Core PDF generation class |
| 1.4 | `src/services/pdf/utils/` | Styles, layout helpers |

### Phase 2: Export Templates (3-4 days)

| Step | File | Description |
|------|------|-------------|
| 2.1 | `templates/GuestListTemplate.ts` | Table rendering with autotable |
| 2.2 | `templates/TableCardTemplate.ts` | 4-up layout with cut marks |
| 2.3 | `templates/PlaceCardTemplate.ts` | 8-up with fold lines |
| 2.4 | `templates/FloorPlanTemplate.ts` | html2canvas integration |
| 2.5 | `templates/DietaryReportTemplate.ts` | Summary statistics |

### Phase 3: UI Integration (2-3 days)

| Step | File | Description |
|------|------|-------------|
| 3.1 | `src/components/ExportModal.tsx` | Export type selection, download |
| 3.2 | `src/components/TemplateCustomizer.tsx` | Color picker, font selection, logo upload |
| 3.3 | Modify `Header.tsx` | Add "Export PDF" button |
| 3.4 | Modify `useStore.ts` | Add template preferences |

### Phase 4: Polish (1-2 days)
- Loading states and progress indicators
- Error handling
- Performance optimization (lazy load, image compression)
- Testing with large events

---

## Print Optimization

1. **Color Management** - CMYK-safe colors, print-friendly option
2. **Font Embedding** - Embed fonts, web-safe fallbacks
3. **Resolution** - Vector for text/lines, 300 DPI for raster
4. **Margins** - 0.5" standard, crop marks for cards

---

## Estimated Complexity

| Component | Complexity | Time |
|-----------|------------|------|
| Type definitions | Low | 2 hrs |
| PDF service core | Medium | 4 hrs |
| Guest list template | Medium | 4 hrs |
| Table cards template | Medium | 4 hrs |
| Place cards template | Low-Medium | 3 hrs |
| Floor plan template | High | 6 hrs |
| Dietary report | Medium | 4 hrs |
| Export modal UI | Medium | 4 hrs |
| Template customizer | High | 8 hrs |
| Store integration | Low | 2 hrs |
| Testing & polish | Medium | 4 hrs |
| **Total** | | **45-50 hours** |

---

## File Structure

```
src/
├── types/
│   └── pdf.ts                    # PDF-related types
├── services/
│   └── pdf/
│       ├── index.ts              # Main export service
│       ├── PdfGenerator.ts       # Core generation class
│       ├── templates/
│       │   ├── FloorPlanTemplate.ts
│       │   ├── TableCardTemplate.ts
│       │   ├── PlaceCardTemplate.ts
│       │   ├── GuestListTemplate.ts
│       │   └── DietaryReportTemplate.ts
│       └── utils/
│           ├── pdfStyles.ts      # Common styles/fonts
│           ├── layoutHelpers.ts  # Page layout utilities
│           └── canvasCapture.ts  # html2canvas integration
├── components/
│   ├── ExportModal.tsx
│   ├── ExportModal.css
│   ├── TemplateCustomizer.tsx
│   └── TemplateCustomizer.css
└── data/
    └── pdfTemplates.ts           # Pre-built template configs
```
