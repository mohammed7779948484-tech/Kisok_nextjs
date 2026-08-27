# Layout and type

Use layout to explain relationships before color, borders, or motion. Use type to control reading order, not to decorate it.

## Start from constraints

Record the real constraints before composing:

- minimum and maximum supported width;
- persistent chrome and safe areas;
- longest plausible labels and values;
- localization and text expansion;
- touch, pointer, keyboard, and screen-reader input;
- user-configured text size and zoom;
- content that can be missing, delayed, or unbounded.

Do not optimize the first pass for a single screenshot width.

## Build a stable reading path

Use this order:

1. Put the page's identity and primary status first.
2. Put the next required action next to the information it affects.
3. Keep repeated content on shared leading and trailing edges.
4. Move supporting metadata away from the primary scan line.
5. Keep escape, cancel, and recovery paths visible without giving them equal emphasis.

If the user must scan diagonally to connect a label, value, and control, restructure the group.

## Express grouping with distance

Use fewer, more legible spacing relationships:

- Keep the gap inside a group smaller than the gap between groups.
- Start the between-group gap at roughly twice the within-group gap.
- Introduce a filled container only when the items act as one object.
- Introduce a separator only when density makes space too expensive or the boundary carries meaning.
- Never combine a strong separator, large gap, new background, and heading merely to say the same thing four times.

Choose values from the project's spacing scale. When no scale exists, begin with a 4px base and a small set such as 4, 8, 12, 16, 24, 32, 48. Add a value only when an optical or platform constraint cannot be expressed by the set.

## Align deliberately

- Choose a small number of vertical axes and reuse them across the page.
- Align text by its glyph edge, not by the transparent bounds of a poorly drawn icon.
- Right-align numeric columns to the trailing edge and use tabular numerals for changing or comparable values.
- Use optical correction for asymmetric symbols, but fix the icon asset or primitive once instead of sprinkling offsets through consumers.
- Use logical properties for direction-dependent placement: inline start/end, block start/end, and `text-align: start`.

Test the same layout with `dir="rtl"`. Do not reverse physical media controls, clocks, logos, or other symbols whose meaning is not tied to reading direction.

## Let components adapt to their container

Break when content fails, not when a device name changes.

For each adaptive component:

1. Define the minimum width where the expanded structure remains readable.
2. Collapse only the relationship that stopped fitting.
3. Keep action priority and reading order unchanged.
4. Prefer a container query when the component can appear in differently sized regions.
5. Test immediately below and above the chosen threshold.

Avoid fixed heights around text. Use `min-height` for touch or rhythm requirements and let content grow.

## Use a role-based type system

Define roles before sizes. A compact product can start with:

| Role | Starting size | Line height | Typical weight |
| --- | --- | --- | --- |
| Display | `2.25rem` | `1.05–1.15` | `600–700` |
| Page title | `1.5rem` | `1.15–1.25` | `600–700` |
| Section title | `1.125rem` | `1.25–1.35` | `600` |
| Body | `1rem` | `1.45–1.6` | `400` |
| UI label | `0.875rem` | `1.3–1.45` | `500` |
| Caption | `0.75–0.8125rem` | `1.35–1.5` | `400–500` |

These are starting points, not a replacement for the project's established scale. Judge the actual face: x-height and stroke contrast can make equal CSS sizes read differently.

Rules:

- Keep body text near the browser default unless product density clearly demands otherwise.
- Use tighter leading only for short headings. Any text expected to wrap needs breathing room.
- Tighten tracking slightly on large display text; add modest tracking to small uppercase labels; leave body copy near normal.
- Load only the weights and styles the interface uses. Do not rely on synthetic bold or italic when the design depends on their shape.
- Prefer `woff2` for web font delivery and keep a credible fallback stack.
- Apply tabular numerals to timers, balances, tables, counters, and any value that updates in place.

## Control line length and wrapping

- Keep long-form reading near 60–75 characters per line.
- Use balanced wrapping for short headlines when supported.
- Use improved last-line wrapping for short descriptions, not long articles.
- Allow URLs, identifiers, and user-generated strings to break before they escape.
- Keep compact labels on one line only when the full value remains available and the container can grow horizontally.
- Treat truncation as data hiding. Provide a tooltip, expansion, detail view, or accessible name when the hidden portion matters.

## Stress cases

Verify with:

- a title twice as long as the design sample;
- a single unbroken identifier;
- a four-digit badge count;
- negative, zero, and very large numeric values;
- an empty optional field beside full neighbors;
- 200% zoom or increased system text;
- RTL direction and a mixed-direction identifier;
- the narrowest supported container.

The layout passes when priority and operability survive, not merely when nothing overlaps.

## Reject these patterns

| Pattern | Why it fails |
| --- | --- |
| Uniform gap everywhere | Removes group hierarchy |
| Different padding on sibling cards without a content reason | Creates noisy scan lines |
| Fixed card height around variable copy | Clips under localization and zoom |
| Breakpoints copied from a framework default without testing | Adaptation does not match content failure |
| Type size used as the only hierarchy cue | Produces oversized, shallow structure |
| Placeholder text as the only field label | Disappears during use |
| Truncated primary action | Hides the task at the moment it is needed |
