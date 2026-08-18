# Development workflow (live users on `master`)

This project serves live Telegram users from code deployed from `master`. Develop and test on short-lived feature branches so production is untouched until you deliberately merge and redeploy.

## Feature branches

Keep `master` clean. Name branches by work:

- `feature/...` — new behavior
- `fix/...` — bug fixes
- `chore/...` — docs, tooling, workflow

```bash
git checkout master
git pull origin master
git checkout -b feature/my-feature
```

Commit and push only on that branch:

```bash
git push -u origin feature/my-feature
```

`master` does not change until you merge. Creating a branch alone does not affect live users.

## Test isolation (required for safe testing)

A Git branch only isolates code history. The process currently running the bot keeps serving users until you redeploy from an updated `master`.

| Environment | Telegram token | Database | Git branch |
| ----------- | -------------- | -------- | ---------- |
| Production  | Live bot token | Live DB  | `master` (deployed) |
| Feature test | Separate BotFather bot (e.g. FinanceBot Dev) | Separate / test DB | `feature/...` |

1. Keep the production bot process running from `master`. Do not restart it from a feature branch.
2. Create a second bot with [@BotFather](https://t.me/botfather) for local testing.
3. Copy [`.env.example`](.env.example) to `.env` and point it at the **dev** token and a **test** database.
4. Run `npm run dev` against that `.env` while production continues on the live token/DB.

If you only have one token and one DB, any process you start with that `.env` **is** the live bot. Avoid long downtime and never run experimental Prisma migrations against production without a backup and a plan.

## Ship a finished feature

1. Push the feature branch.
2. Open a pull request into `master` (`gh pr create` or GitHub UI).
3. Review and merge.
4. Update local `master`:

```bash
git checkout master
git pull origin master
```

5. **Redeploy production** from the updated `master` (rebuild/restart the process that serves live users). Until this step, users still run the old code.

Optional cleanup:

```bash
git branch -d feature/my-feature
git push origin --delete feature/my-feature
```

## Do not

- Commit experimental work directly on `master` while users depend on it.
- Run untested Prisma migrations against the live database from a feature branch.
- Force-push `master`.
