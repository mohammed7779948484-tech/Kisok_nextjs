# Color and surfaces

Color assigns meaning and priority. Surfaces explain containment and depth. Use both sparingly enough that their signals remain legible.

## Preserve the system before extending it

Inspect the project's semantic tokens and rendered states. Reuse a role token when it already owns the meaning. If a role is missing, add the role; do not borrow another token because its current value looks close.

Prefer names such as:

```css
--surface-canvas
--surface-raised
--surface-overlay
--text-primary
--text-secondary
--border-subtle
--border-strong
--accent-solid
--accent-contrast
--status-danger
--status-warning
--status-success
--focus-ring
```

Keep raw palette values behind semantic roles. Components consume roles, not `blue-600` because “blue looks right.”

## Give each color a job

- Reserve the primary accent for interaction, selection, or the single emphasized action in the current decision context.
- Keep danger, warning, and success tied to their status meanings.
- Add a text label, icon, shape, or position cue when status matters; color cannot carry the message alone.
- Keep decorative color from impersonating links, selected states, or alerts.
- Use neutral hierarchy for secondary actions so primary emphasis remains scarce.

If two peer actions both look primary, the design has not made a decision.

## Measure rendered pairs

Contrast belongs to a foreground/background pair, not to a color in isolation. Measure the pair in every state and appearance where it renders, including translucent surfaces over their lightest and darkest possible content.

For formal accessibility decisions, use the project's required standard. WCAG 2.2 retains the familiar WCAG 2 contrast thresholds, including 4.5:1 for normal text and 3:1 for large text and many non-text UI boundaries. Treat those as requirements where applicable, not as a recipe for attractive hierarchy.

Do not silently recolor a brand system during unrelated work. Report a failing pair with its measured value and change it when remediation is in scope.

## Build light and dark appearances independently

Dark mode is not a reversed light scale.

1. Map semantic roles, not palette step numbers.
2. Reduce glare by avoiding pure white body text on pure black for large reading areas unless the product explicitly chooses that contrast.
3. Rebalance elevation: dark surfaces often need lighter edge separation and smaller luminance steps.
4. Retest muted text, disabled states, charts, images, and translucent overlays.
5. Keep status meaning stable while adjusting lightness and chroma for the new background.

Verify both appearances after every semantic token change.

## Use surfaces to explain containment

Choose the lightest mechanism that makes the relationship clear:

1. Space for ordinary grouping.
2. A subtle background change for a shared region.
3. A border for structure, selection, input boundaries, or dense separation.
4. Shadow for actual elevation above another layer.
5. Scrim for a modal layer that blocks interaction behind it.

Avoid “card soup”: wrapping every heading, metric, and paragraph in its own rounded rectangle destroys hierarchy.

## Keep radii coherent

Use a small radius vocabulary tied to component scale and layer. For visibly nested rounded surfaces, the outer curve should account for both the inner radius and the inset between them. Judge the visible curve, especially with unequal padding; mathematical equality is only a starting point.

Do not apply large friendly radii to dense controls merely because the page uses them on hero surfaces. Radius carries personality and scale.

## Build believable elevation

- Use multiple low-opacity shadow layers rather than one dark blur.
- Keep the contact shadow tight and the ambient shadow broad.
- Reduce shadow strength in dark mode and add a quiet light edge when the surface otherwise disappears.
- Keep menus, popovers, and dialogs on a consistent elevation ladder.
- Do not add shadow to a flat structural region merely to make it feel “designed.”

Test elevation over more than one background. A shadow tuned only on white often turns muddy on tinted or image-backed surfaces.

## Treat media as content

- Preserve aspect ratio and define the crop intentionally with `object-fit` and `object-position`.
- Provide a credible missing-image state.
- Add a subtle neutral inner edge when light or dark media can disappear into the surrounding surface.
- Keep text off unpredictable imagery unless a stable overlay or dedicated text region guarantees contrast.
- Never use a decorative gradient as a substitute for hierarchy.

## Focus and selection

Use one verified focus treatment across the system. It must remain visible against the control, its surrounding surface, and forced-color modes. Prefer a two-layer ring when a single brand color cannot survive varied backgrounds.

Selection, hover, pressed, and focus states must be distinguishable from one another. Do not rely on a slight tint shift for every state.

## Reject these patterns

| Pattern | Why it fails |
| --- | --- |
| Raw color value repeated in components | Prevents themes and semantic changes |
| Accent used for links, decoration, and status | Destroys meaning |
| Several filled primary buttons in one decision context | Removes priority |
| Dark palette generated by reversing step numbers | Produces weak or glaring pairs |
| Shadow on every container | Flattens the elevation hierarchy |
| Translucent text surface tested over one background | Contrast changes with scrolled content |
| Color-only error or selected state | Excludes users and becomes ambiguous |

## Primary references

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Understanding WCAG contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Understanding non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
