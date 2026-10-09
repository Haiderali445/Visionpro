# Contributing to VisionCheck Pro

VisionCheck Pro is proprietary closed-source software. Do not submit, publish, or distribute changes unless you have explicit authorization from the project owner. See [LICENSE.md](./LICENSE.md).

## Before making a change

- Confirm the task and the files you are authorized to modify.
- Keep changes focused; avoid including build output (`dist/`, `release/`), dependencies, local `.env` files, printer data, cheque scans, or credentials.
- Never put a Supabase service-role key, signing certificate, or signing password in source control. The Supabase anon/publishable key is client-visible and must still be protected by appropriate database access controls.
- For a behavior change, trace all affected UI, persistence, renderer/preload/main-process, and packaging surfaces before editing.

## Implementation expectations

- Follow the existing TypeScript, React, Electron, and CSS patterns.
- Keep the renderer isolated from Node APIs. Expose any required native functionality through the narrow `contextBridge` API in `preload.cjs`, with a corresponding type in `src/electronBridge.ts`.
- Keep template geometry in millimetres and verify print output against the target printer/stock. Screen preview scale is only a layout preview, not a hardware calibration guarantee.
- Preserve clear error reporting; do not silently convert failed remote saves or print operations into success.
- Update the README when setup, data flow, commands, supported behavior, or release instructions change.

## Validation

Run the checks relevant to the change:

```powershell
npm ci
npm run lint
npm run typecheck
npm run build
```

For a Windows desktop, printer, Electron IPC, or installer change, also run:

```powershell
npm run electron:dev
npm run dist:win
```

There is no dedicated automated test suite configured at present. Manually exercise the affected workflow; for print changes, test with a harmless page before using actual cheque stock or transaction data.

## Change submission

Submit changes only through the project's authorized private review process. Include:

- A concise summary of the change and its motivation.
- Relevant validation commands and results.
- Any manual print/device checks performed, including printer model/driver details that are safe to disclose.
- Screenshots for visible UI changes, with all names, amounts, account data, and other sensitive details removed.

Do not include customer data, scan images, secrets, generated installers, or unapproved third-party code in a change.
