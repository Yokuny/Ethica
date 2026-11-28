---
name: dashboard-design
description: Redesign, audit, and build high-clarity dashboards using visual hierarchy, semantic color symbolism, and disciplined chart selection. Use whenever the user asks to improve, review, critique, design, or refactor a dashboard UI, analytics screen, KPI panel, or data visualization layout from screenshots, descriptions, or frontend code.
---

# Dashboard Design

Transform cluttered or low-contrast dashboards into scannable decision-making tools by structuring multi-layered data, enforcing semantic color rules, and choosing the right visualization for each analytical question.

## When to Use

- The user shares a dashboard screenshot, wireframe, or frontend code and asks for UI/UX improvements.
- The user wants to organize complex, multi-layered metrics (KPIs, cash flow, goals, category breakdowns) without visual overload.
- The user asks for a color palette or visual hierarchy system for analytics and reporting screens.

## Core Design Principles

### 1. Multi-Layer Visual Hierarchy (Top-to-Bottom Flow)

Organize screens into distinct cognitive layers so the eye moves naturally from high-level status to root causes:

- **Layer 1 - Executive Pulse (Top):** Place 3 to 5 primary KPI cards in the top-left reading path. Show the core metric in bold high-contrast typography, paired with a comparison delta (vs. previous period or target) and a minimal sparkline. Avoid mixing unrelated metrics with identical visual weight.
- **Layer 2 - Performance & Trajectory (Upper Middle):** Display time-series trends and goal pacing (e.g., cash flow over time, annual target progress). Keep goal benchmarks visually distinct (dashed neutral line) from actual performance (solid fill or line).
- **Layer 3 - Composition & Drivers (Lower Middle):** Group comparative breakdowns side-by-side (e.g., revenue sources vs. expense categories) using aligned layouts so the user can compare "where it comes from" against "where it goes."
- **Layer 4 - Granular Details (Base / On-Demand):** Hide raw tables, month-by-month logs, and secondary records behind progressive disclosure (collapsible drawers, tabs, or "View details" toggles) so the default view stays clean.

### 2. Semantic Color Symbolism

Never use color merely to decorate. Restrict the palette to a clean neutral foundation plus 4 strict semantic roles:

- **Neutral Base (80-85% of UI):** Use off-white or light slate backgrounds (#F8FAFC), pure white cards (#FFFFFF) with subtle borders (#E2E8F0), and dark slate text (#0F172A for primary values, #64748B for labels) to maximize readability and whitespace.
- **Positive / Inflow / On-Track (Emerald/Green):** Reserve exclusively for revenue, net positive balance, growth, and targets met.
- **Negative / Outflow / Critical Alert (Coral/Red):** Reserve exclusively for expenses, overdue items, losses, or metrics off-track.
- **Attention / Pending / Pacing Risk (Amber/Yellow):** Use for receivables, pending actions, or metrics slightly behind pace.
- **Primary Focus / Neutral Category (Blue/Indigo):** Use for non-financial counts, active volume, or primary categorical series.

### 3. Chart Selection & Anti-Clutter Rules

- **Trends over time:** Use clean line charts or single-series area charts. Avoid overlapping multi-series translucent area charts (stream/spline overlaps create muddy colors and distort visual comparison); use multi-line charts or grouped bar charts instead.
- **Comparisons:** Use horizontal or vertical bar charts whenever comparing magnitudes across categories or time periods.
- **Part-to-whole (Donut/Pie):** Only use donut charts when there are 3 or fewer categories and the goal is showing simple share of total. Always place the total value inside the donut center and align legend labels with exact values and percentages.
- **Data-Ink Ratio:** Remove redundant gridlines, heavy borders, and repetitive axis labels. Ensure sufficient contrast on small subtitles and secondary numbers.

## Workflow for Improving a Dashboard

When given a dashboard screenshot, mockup, or codebase:

1. **Diagnose by Layer:** Evaluate the current screen top-to-bottom across hierarchy, color semantics, typography contrast, and chart types. Point out specific friction points (e.g., weak contrast on subtitles, ambiguous colors, overlapping area curves, or equal visual weight across primary and secondary KPIs).
2. **Define the Semantic Token Map:** Propose a concise color and typography hierarchy tailored to the dashboard's domain metrics.
3. **Restructure the Layout & Charts:** Specify concrete replacements for each section (e.g., converting overlapping area splines into grouped bars, elevating primary KPIs, pairing goal gauges with clear status badges).
4. **Deliver Actionable Output:** Provide either a structured design specification (section-by-section blueprint) or updated frontend code (HTML/Tailwind/React/CSS) depending on what the user needs.

## Gotchas

- **Do not apply a rigid 3-row limit to dense operational dashboards:** When a screen legitimately has 4 or 5 data layers (KPIs, cash flow, annual goal, financial breakdown, service mix), separate layers using clear section headers, subtle surface elevation, and generous vertical spacing (24px-32px) rather than cramming everything together.
- **Watch out for washed-out micro-copy:** Light gray subtitles and muted chart labels become illegible on high-resolution screens. Enforce accessible contrast (>= 4.5:1 for body/labels).
- **Avoid rainbow category palettes:** If a breakdown has multiple neutral items, use monochromatic shades of the primary brand color rather than random unrelated hues.
