# Contributing

Use this workflow for every feature, fix, or documentation change.

## Before starting

Update your local `main` branch:

```bash
git switch main
git pull origin main
```

Create a branch from the updated `main` branch:

```bash
git switch -c feature/short-description
```

Use `feature/`, `fix/`, `docs/`, or `chore/` as the branch prefix.

## While working

- Keep each branch focused on one task.
- Never commit `.env`, database credentials, JWT secrets, or access tokens.
- Run `npm run check` before committing.
- Test affected API requests in Postman when implementation begins.
- Pull updates from `main` before opening a pull request if the branch is behind.

## Commit messages

Use a short conventional commit message:

```text
feat: add interview booking endpoint
fix: reject more than three bookings
docs: clarify local setup
chore: update repository configuration
```

## Pull requests

1. Push the branch to GitHub.
2. Open a pull request into `main`.
3. Explain what changed and how it was checked.
4. Ask at least one teammate to review it.
5. Resolve review comments before merging.
6. Prefer **Squash and merge** to keep `main` history concise.
7. Delete the branch after the pull request is merged.

Do not commit directly to `main` after the initial repository setup.
