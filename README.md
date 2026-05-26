# Habit Loop Lab

Habit Loop Lab is an identity-first habit tracker that helps habits move from conscious effort to automatic, context-triggered behavior.

It is built as a portfolio-ready static web app using vanilla HTML, CSS, and JavaScript.

## Preview

Screenshots should be saved in `docs/screenshots/` after the first manual capture pass.

Suggested captures:

- `onboarding.png`
- `daily-loop.png`
- `habit-stacking.png`
- `relapse-reframer.png`
- `automaticity.png`

See [Screenshot Guide](docs/SCREENSHOT_GUIDE.md).

## Why This Project Exists

Most habit trackers ask only one question: "Did you do it?"

Habit Loop Lab asks a better product question: "How do we help a behavior become easier, more identity-consistent, and less dependent on motivation?"

The app is based on behavioral design concepts such as:

- Cue, craving, response, reward.
- Identity-based habits.
- Implementation intentions.
- Habit stacking.
- Two-minute rule.
- Never miss twice.
- Cognitive restructuring after lapses.
- Variable rewards and immediate celebration.
- Automaticity and reminder fading.

## Core Features

- Stage-of-change onboarding with readiness and confidence rulers.
- Identity statement for each habit.
- Mandatory if-then planning: "After X, I will Y."
- Habit limit of three active habits.
- Daily loop focused on the anticipated state change.
- One-tap micro-vote logging.
- Lapse logging without shame.
- Never-miss-twice recovery panel.
- Variable RPE-inspired feedback.
- Self-induced celebration prompt.
- Chronotype-aware scheduling suggestions.
- Automaticity score based on ease, consistency, and habit age.
- Reminder fading as habits become more automatic.
- Local-first persistence with `localStorage`.
- Optional Supabase authentication with automatic cloud pull after login.

## Behavioral Coherence

| Model requirement | Product implementation |
| --- | --- |
| Cue, craving, response, reward | The daily focus screen shows the full loop and highlights the anticipated state before logging. |
| Craving as motivation | Every habit stores a desired state, and the main action asks the user to anticipate that state before the micro-action. |
| Law of least effort | Completion is a one-tap micro-vote; the action is designed around the two-minute rule. |
| Identity over motivation | Habits are framed as micro-votes for an identity instead of outcome-only goals. |
| Stage of Change | Onboarding diagnoses readiness and confidence with 0-10 rulers and adapts guidance by stage. |
| If-then planning | Every habit requires an anchor routine and action: "After X, I will Y." |
| Habit limit | The app limits active habits to three to avoid motion/planning traps. |
| Streak risk and AVE | The UI avoids streak worship and reframes missed days as learning data. |
| Never miss twice | A lapse panel appears after missed days and prioritizes repair before analysis. |
| Reward Prediction Error | Rewards are variable, immediate, and identity-based instead of fixed points or badges. |
| Shine effect | Each habit includes a self-induced celebration as the immediate reward. |
| Chronotype adaptation | Difficult habits are nudged toward morning slots; chronotype still personalizes timing. |
| Reminder fading | Notifications are scheduled at the trigger time and fade as automaticity rises. |
| Subcortical transition | The app tracks 0-21, 21-66, and 66-335 day phases plus an automaticity score. |

## Product Flow

1. Complete onboarding.
2. Define the desired identity.
3. Create one tiny if-then habit.
4. Move through the daily action flow one step at a time: identity, craving, plan, registration, signals.
5. Anticipate the desired state attached to the cue.
6. Emit a daily micro-vote, choose the minimum version, or log a lapse without shame.
7. If a strong impulse appears, use the urge-surfing panel before acting.
8. Review the automaticity dashboard after the vote instead of starting with analytics.

## Tech Stack

- HTML
- CSS
- JavaScript
- Node.js static server for local development
- `localStorage` for local-first persistence
- Supabase for optional cross-device sync
- GitHub Pages deployment workflow

The published app is already wired to the configured Supabase project. To enable real sync, run the SQL in [Supabase Setup](docs/SUPABASE_SETUP.md).

## Run Locally

```bash
npm run start
```

Open:

```text
http://127.0.0.1:5173
```

Keep the terminal open while using the local server.

## Test

```bash
npm test
```

The test script checks JavaScript syntax and runs a smoke test against the local static server.

## Deploy To GitHub Pages

This repository includes a GitHub Actions workflow at `.github/workflows/pages.yml`.

After pushing to a `main` branch:

1. Go to the repository settings on GitHub.
2. Open **Pages**.
3. Select **GitHub Actions** as the source.
4. Run or push to trigger the workflow.

## Documentation

- [Product Brief](docs/PRODUCT_BRIEF.md)
- [Screenshot Guide](docs/SCREENSHOT_GUIDE.md)
- [Supabase Setup](docs/SUPABASE_SETUP.md)

## Portfolio Notes

This project demonstrates:

- Product thinking.
- Behavioral UX design.
- Local-first state management.
- Responsive interface design.
- Accessible form-driven interactions.
- Static deployment readiness.
- Clear technical documentation.

This is not a clinical tool. The neuroscience and behavioral concepts are used as product design inspiration, not medical advice.
