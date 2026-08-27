# Interface verification

Verification converts taste into evidence. Use the smallest set that can prove the changed behavior, and disclose every gap.

## Establish the test surface

Record:

- route, component story, prototype file, or native screen;
- viewport and device targets;
- theme and locale variants;
- data fixtures and feature flags;
- commands required to run the surface;
- states changed by the work.

If the interface cannot be rendered, source-only conclusions must remain limited to source-verifiable facts.

## Mechanical checks

Run the project's own commands in this order when available:

1. focused unit or component tests;
2. type checking;
3. linting;
4. production build;
5. broader tests proportional to the change.

Report the exact command and result. Do not replace a failed command with a looser one and call the original concern clear.

## Visual checks

Inspect at:

- the narrowest supported width;
- the widest supported width;
- one width where the layout is close to changing;
- both appearances when light and dark exist;
- default text and enlarged text or 200% zoom.

Check alignment, wrapping, overlap, clipping, scroll reachability, sticky regions, safe-area padding, and focus visibility. Compare screenshots when the project supports stable visual regression testing.

## Content stress

Use fixtures that include:

- empty collections;
- one item and many items;
- long localized strings;
- unbroken identifiers and URLs;
- missing and extreme numeric values;
- slow responses and failures;
- expired permission or authentication;
- broken or absent media.

Do not resize the content to rescue the layout. Let the layout prove it can handle the content.

## Interaction checks

Complete the primary flow with:

- pointer or touch;
- keyboard only;
- rapid repeated activation;
- dismissal and cancellation;
- refresh or remount during a pending or completed state;
- reduced motion;
- back/forward navigation where routing is involved.

For a modal, verify initial focus, trapped focus, Escape, background inertness, scroll containment, and restored focus.

For a form, verify label activation, autocomplete, paste, validation, first-error focus, preserved input, busy state, and successful resubmission.

## Accessibility checks

Automated tests find only a subset. Combine them with:

- accessible name, role, value, and state inspection;
- logical heading and landmark navigation;
- focus order and focus-not-obscured checks;
- rendered foreground/background contrast measurement;
- screen-reader traversal for custom or dynamic controls;
- 200% zoom and 320 CSS pixel reflow where web content is in scope;
- VoiceOver or TalkBack on real hardware for native interaction.

Treat automated success as evidence, not approval.

## Motion and performance

- Replay motion slowly to inspect origin, coordinated properties, and the final frame.
- Interrupt open/close, toggle, drag, and list transitions mid-flight.
- Profile in production or release mode on representative hardware.
- Inspect both the interaction thread and rendering thread when the platform separates them.
- Verify the reduced-motion alternative communicates the same state.

Do not claim smoothness from a development build on a fast laptop.

## Evidence format

Use a compact ledger:

| Check | Scope | Result | Evidence |
| --- | --- | --- | --- |
| `npm run typecheck` | Changed package | Pass | Exit 0 |
| Keyboard flow | Create-project dialog | Pass | Open, complete, cancel, focus restored |
| Screen reader | Dynamic result count | Not verified | Requires target device |

Use `Pass`, `Fail`, or `Not verified`. Never turn “not tested” into “appears fine.”

## Completion gate

The design is ready when:

- the primary task is obvious without explanation;
- every reachable state has a recovery or next step;
- content stress does not break priority or operability;
- keyboard and touch paths complete;
- accessible state is exposed;
- relevant project checks pass;
- remaining runtime gaps are explicit and owned.
