# Interaction and motion

Interaction design is the contract between intent and response. Motion may clarify that contract; it may not delay or replace it.

## Start with the platform

- Use a link for navigation and a button for an action.
- Use native controls or established accessible primitives before rebuilding their keyboard, focus, and screen-reader behavior.
- Keep visible text inside the accessible name.
- Make the whole visible control interactive, including its label and icon.
- Preserve browser and operating-system conventions unless the product gains a measurable benefit from changing them.

Custom semantics create a permanent testing obligation.

## Specify every control state

For each interactive component, define:

| State | Required signal |
| --- | --- |
| Rest | Clear affordance and label |
| Hover | Pointer-only preview, never the only discovery path |
| Focus | Visible keyboard location |
| Active/pressed | Immediate physical or visual response |
| Selected/expanded | Persistent cue plus programmatic state |
| Disabled/unavailable | Legible state and, when useful, a reason |
| Busy | Original action remains identifiable; repeat activation is controlled |
| Error | Problem and recovery are adjacent or directly linked |

Do not disable submit merely to avoid validation. Let the user attempt the action, then locate and explain what must change.

## Size for real input

Use WCAG 2.2's 24 by 24 CSS pixel minimum target requirement where applicable. Aim closer to 44 by 44 for primary touch controls and dense-but-forgiving sizes for desktop tools. A small glyph may sit inside a larger hit box.

Rules:

- Never let expanded hit boxes overlap.
- Keep at least a small visible separation between adjacent controls.
- Test thumb-reachable actions on the actual device class.
- Provide a non-drag alternative for any action that requires a dragging path.

## Define keyboard behavior before decoration

- Keep DOM order aligned with visual order.
- Use Tab to move between components and arrows within composite components.
- Escape closes the most recently opened dismissible layer and returns focus to its trigger.
- Move focus into a modal and restore it when the modal closes.
- Keep destructive confirmation focus on the safe action unless a platform convention says otherwise.
- Never use positive `tabindex` to repair a layout problem.

Use the WAI-ARIA Authoring Practices patterns as behavioral references, not as a substitute for testing the chosen component.

## Decide whether motion earns its cost

Motion belongs when it does at least one job:

- shows where an object came from or went;
- connects two representations of the same object;
- confirms direct manipulation;
- makes a state change legible;
- prevents content from appearing to teleport;
- teaches a rare interaction.

Remove it when it merely decorates a frequent action, repeats on every keystroke, blocks input, or makes data harder to read.

## Motion budgets

Use the project's established timing first. Without one, begin here and tune by rendered feel:

| Interaction | Starting range |
| --- | --- |
| Press feedback | `80–140ms` |
| Hover or color response | `100–160ms` |
| Tooltip or small anchored surface | `120–200ms` |
| Menu or popover | `150–240ms` |
| Dialog or sheet | `200–360ms` |
| Rare explanatory sequence | Longer only while skippable and non-blocking |

Entrances should respond quickly and settle gently. On-screen movement may accelerate and decelerate. Constant progress uses linear timing. Avoid slow-starting easing on user-triggered entrances.

## Preserve origin and continuity

- Open anchored surfaces from the control or edge that caused them.
- Return along a compatible path when dismissed.
- Keep modals centered when they have no spatial anchor.
- Use a small starting scale, never disappearance into a mathematical point.
- Retarget interactive transitions from the current rendered state.
- Hand gesture velocity into the settling animation when the library supports it.

Use transitions or springs for reversible interaction. Reserve keyframes for staged sequences that run from beginning to end.

## Keep the frame budget

- Prefer `transform` and `opacity` for continuous animation.
- Avoid broad `transition: all` declarations.
- Measure before adding compositing hints; too many layers waste memory.
- Keep heavy blur, large shadows, layout animation, and JavaScript-driven per-frame work off busy surfaces unless profiling proves the cost acceptable.
- Test performance in a production or release build on representative hardware.

## Reduced motion is a designed state

Under reduced motion:

- replace large translation, zoom, parallax, and spring overshoot with a short crossfade or instant state change;
- stop autoplaying ambient motion;
- keep focus, color, progress, and concise feedback that do not create vestibular movement;
- ensure the final state remains equally understandable.

Motion is never the only carrier of meaning.

## Gesture rules

- Track the pointer or touch one-to-one after a small intent threshold.
- Capture the pointer so the interaction survives leaving the element bounds.
- Preserve the grab offset; do not snap the object under the finger.
- Add resistance beyond a boundary instead of a sudden invisible wall.
- Decide dismissal from both distance and velocity.
- Support cancellation and interruption at every point.
- Provide an equivalent tap, button, or menu action.

Test gestures on physical hardware. A simulator cannot reproduce reach, friction, missed targets, or platform haptics.

## Primary references

- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WCAG 2.2 target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [WCAG 2.2 dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- [WCAG animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
