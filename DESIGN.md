# Meeting Action Items Design System

## 1. Atmosphere & Identity

A calm review console for turning rough Korean meeting notes into accountable work. The signature is quiet evidence: every extracted item keeps its source quote visible, while editing surfaces stay compact and direct.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/primary | --surface-primary | #F7F8FA | #0F172A | App background |
| Surface/secondary | --surface-secondary | #FFFFFF | #111827 | Panels and list items |
| Surface/elevated | --surface-elevated | #F1F5F9 | #1F2937 | Subtle nested regions |
| Text/primary | --text-primary | #111827 | #F8FAFC | Titles, form values |
| Text/secondary | --text-secondary | #4B5563 | #CBD5E1 | Supporting text |
| Text/tertiary | --text-tertiary | #6B7280 | #94A3B8 | Metadata, placeholders |
| Border/default | --border-default | #D8DEE8 | #334155 | Controls, panels |
| Border/subtle | --border-subtle | #E8ECF2 | #1E293B | Dividers |
| Accent/primary | --accent-primary | #0F766E | #2DD4BF | Primary actions, links |
| Accent/hover | --accent-hover | #0B625C | #5EEAD4 | Primary hover |
| Status/success | --status-success | #15803D | #4ADE80 | Save feedback |
| Status/warning | --status-warning | #B45309 | #FBBF24 | Retry prompts |
| Status/error | --status-error | #B91C1C | #FCA5A5 | Error and destructive UI |
| Status/info | --status-info | #2563EB | #93C5FD | Informational hints |

### Rules

- Accent is reserved for primary actions, links, and focus states.
- Error color appears only in error boxes and delete controls.
- No decorative gradients or unrelated accent families.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Display | 40px / 2.5rem | 700 | 1.15 | 0 | Main page title |
| H1 | 32px / 2rem | 700 | 1.2 | 0 | Route titles |
| H2 | 24px / 1.5rem | 700 | 1.3 | 0 | Section titles |
| H3 | 18px / 1.125rem | 600 | 1.4 | 0 | Item titles |
| Body/lg | 18px / 1.125rem | 400 | 1.6 | 0 | Lead text |
| Body | 16px / 1rem | 400 | 1.6 | 0 | Default text |
| Body/sm | 14px / 0.875rem | 400 | 1.5 | 0 | Secondary text |
| Caption | 12px / 0.75rem | 500 | 1.4 | 0 | Metadata, codes |

### Font Stack

- Primary: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
- Mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace
- Serif: not used

### Rules

- Body text never drops below 14px.
- Form labels use Body/sm or Caption, never all-caps overline styling.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a base of 4px.

| Token | Value | Usage |
|-------|-------|-------|
| --space-1 | 4px | Tight inline separation |
| --space-2 | 8px | Compact groups |
| --space-3 | 12px | Form padding |
| --space-4 | 16px | Default gaps |
| --space-5 | 20px | Panel internals |
| --space-6 | 24px | Card padding |
| --space-8 | 32px | Section groups |
| --space-10 | 40px | Major inner spacing |
| --space-12 | 48px | Page rhythm |
| --space-16 | 64px | Wide route spacing |

### Grid

- Max content width: 1120px
- Column system: single column on mobile, two columns for dense review surfaces from lg upward
- Breakpoints: sm 640px, md 768px, lg 1024px, xl 1280px

### Rules

- Controls must not change size between loading, disabled, and active states.
- Dense data uses stacked rows rather than nested cards.

## 5. Components

### App Header

- Structure: sticky header with title link and meetings list link.
- Spacing: --space-4 horizontal, --space-3 vertical.
- States: link hover, focus ring.
- Accessibility: native anchors with visible focus.

### Error Box

- Structure: status panel with message, code, optional retry button.
- Spacing: --space-4.
- States: retry button hover, focus, disabled.
- Accessibility: role="alert".

### Editable Extracted Item

- Structure: editable input fields followed by read-only source quote.
- Spacing: --space-3 field stack, --space-4 row padding.
- States: disabled while saving, delete pending, focus ring.
- Accessibility: labels remain visible for each input.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 120ms | ease-out | Button press, hover |
| Standard | 200ms | ease-in-out | Loading state changes |
| Emphasis | 360ms | cubic-bezier(0.16, 1, 0.3, 1) | Not used initially |

### Rules

- Animate only opacity and transform.
- Every interactive element has hover, active, focus, disabled states.
- Respect reduced motion by keeping animations non-essential.

## 7. Depth & Surface

### Strategy

Borders-only. Panels use border and tonal surface shifts, not shadows.

| Type | Value | Usage |
|------|-------|-------|
| Default | 1px solid var(--border-default) | Panels, controls |
| Subtle | 1px solid var(--border-subtle) | Dividers |
