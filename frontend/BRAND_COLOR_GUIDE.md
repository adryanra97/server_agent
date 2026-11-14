# ServerAgent visual palette — Daylight Blue

**Design direction:** bright Indonesian enterprise technology visual tone, influenced by the MII website screenshot supplied during the UI review. ServerAgent retains its own product identity, logo, functionality and content. The reference is for color atmosphere, not for copying MII's trademarks or page structure.

## Core tokens

| Role | Color | Intended use |
| --- | --- | --- |
| Primary brand | `#096BA8` | Main CTA, active states, significant links |
| Primary hover | `#07527F` | Hover, focused primary actions |
| Heading ink | `#123F61` | Headings on white or pastel blue |
| Body copy | `#355D77` | Explanations and descriptive text |
| Light hero | `#EAF6FD` | Gradient foundation and ambient backgrounds |
| Soft section | `#DDEFFA` | Distinct but quiet section boundaries |
| Page background | `#F5FAFE` | App work area |
| Card background | `#FFFFFF` | Workflows, inputs, data tables |
| Border | `#CFE4F0` | Card/section outlines; never the only focus indicator |

## Legibility checks

- Primary brand on white: approximately **5.71:1**.
- White on primary brand: approximately **5.71:1**.
- Heading ink on sky (`#E7F5FC`): approximately **9.88:1**.
- Descriptive text `#355D77` on `#F0F9FE`: approximately **6.6:1**.

These selected text combinations exceed the **WCAG 2.2 AA 4.5:1 normal-text contrast target**. This is a palette-level check, not a claim that every UI state has passed a full accessibility audit. Interactive controls and meaningful graphics should also target non-text contrast **3:1** and receive keyboard/focus testing.

## NN/g-inspired layout conventions

1. Favor white space and neutral card surfaces for the bulk of the interface; keep strong color for the most important action or status.
2. Use consistent component tokens across homepage, demo login, role workspace, Simulation, API explorer and Engineering Quality.
3. Preserve semantic colors and explicit labels for passed, failed, warning and running states. Do not rely on hue alone.
4. Keep chart data, server visualization and measurements unchanged; palette changes must never modify simulations.
5. Provide visible keyboard focus and respect reduced-motion settings.
6. Technical code editors may retain a medium-blue surface to make JSON and logs distinct from the rest of the interface.

References: [NN/g Visual Hierarchy](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/) and [W3C WCAG 2.2 Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
