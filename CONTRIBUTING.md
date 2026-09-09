# Contributing to Jobloom Agent

Thanks for helping improve Jobloom Agent.

## Development setup

1. Use Node.js 22.13 or newer.
2. Install pnpm 11.
3. Run `pnpm install`.
4. Run `pnpm dev` and open `http://localhost:3000`.

Before opening a pull request, run:

```bash
pnpm check
pnpm build
```

## Pull requests

- Keep changes focused and explain the user problem they solve.
- Preserve the local-first privacy default.
- Keep Agent side effects behind an explicit approval step.
- Add or update documentation when changing a tool contract.
- Do not commit API keys, personal resumes, real applicant data, or build output.

## Issues

Bug reports should include the browser, reproduction steps, expected behavior, and actual behavior. Feature requests should explain why the capability belongs in the core product rather than an optional integration.
