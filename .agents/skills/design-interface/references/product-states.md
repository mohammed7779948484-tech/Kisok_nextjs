# Product states

The quality of a product is visible at the edges of the happy path. Design state transitions as carefully as the settled screen.

## Build the state inventory

Use only the rows the feature can actually reach:

| State | The interface must answer |
| --- | --- |
| Initial | What is this and what can I do? |
| Loading | What is happening, and can I continue elsewhere? |
| Empty | Why is it empty, and how do I create or find the first item? |
| Partial | What is usable now, and what is still unavailable? |
| Success | What changed, and what is the next useful step? |
| Validation error | Which field failed and how do I fix it? |
| Request failure | Was work preserved, and can I retry safely? |
| Permission denied | What access is missing and who can grant it? |
| Offline | Which data is current, queued, or unavailable? |
| Conflict | Whose change wins, and can either version be recovered? |
| Disabled/unavailable | Why can I not act yet? |
| Destructive pending | What will be lost, and can I undo or cancel? |

Never use a spinner as the entire state model.

## Loading

Choose the treatment from what the user knows:

- Use a skeleton when the shape is stable and the wait is short.
- Use a progress indicator when completion can be estimated.
- Keep existing data visible while refreshing; mark it as updating instead of replacing it with blank chrome.
- Show a labeled busy state on the action that initiated the request.
- Prevent duplicate submissions without erasing the button's identity.
- Announce meaningful async changes without stealing focus.

Do not fabricate a precise progress percentage from an indeterminate operation.

## Empty

Distinguish three different conditions:

1. **First use** — explain the value and offer the first constructive action.
2. **No search or filter results** — name the query or filter and offer a way back.
3. **No permission or unavailable source** — explain the boundary instead of pretending nothing exists.

An empty state contains only the context needed to move forward. Do not turn it into a marketing page inside the product.

## Error and recovery

- Keep user input and local edits whenever retry is possible.
- Put field errors next to their field and connect them programmatically.
- Focus the first invalid field after an attempted submit.
- State what failed, what is safe, and the next action.
- Make retry idempotent or explain duplicate risk.
- Preserve diagnostics for support without exposing secrets or internal stack traces.
- Use a full-page error only when the full page is genuinely unusable.

“Something went wrong” is not recovery guidance.

## Optimistic changes

Use optimism only when:

- success is likely;
- rollback is understandable;
- duplicate attempts are safe;
- the user does not need server confirmation before continuing.

Show the pending state when the distinction matters. If the request fails, restore the previous value, explain the failure, and retain a retry path. Do not silently leave a local state that the server rejected.

## Destructive actions

Scale friction to consequence:

| Consequence | Pattern |
| --- | --- |
| Easily reversible | Perform immediately and offer undo |
| Recoverable but disruptive | Explain the effect and confirm once |
| Irreversible or broad | Name the exact object, consequence, and scope; require deliberate confirmation |
| Repeated high-risk operation | Add safer defaults, preview, permissions, or workflow controls instead of endless dialogs |

The confirmation action repeats the consequence: “Delete workspace,” not “Yes.” Put the safe escape in the predictable location and keep it keyboard reachable.

## Offline and stale data

- Distinguish cached, current, queued, and failed data.
- Display the last successful sync when staleness affects decisions.
- Queue only actions that can replay safely.
- Let users inspect or cancel pending work.
- Reconcile conflicts explicitly; do not overwrite silently.
- Restore connectivity without forcing the user to rebuild context.

## Permission boundaries

Ask for access at the moment its value is clear. Explain:

- what capability is requested;
- why this action needs it;
- what remains possible without it;
- how to recover after denial.

Never show a dead control with no explanation when the user could request access or choose an alternative path.

## State transition check

For every async or destructive interaction, trace:

```text
rest → intent → pending → success
                    ↘ failure → retry/cancel
                    ↘ conflict → resolve
```

At each arrow, verify focus, announcement, preserved data, repeated input, navigation away, and refresh behavior.
