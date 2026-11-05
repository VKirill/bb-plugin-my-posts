---
title: MyPosts — three workspace prototypes
status: for owner review
date: 2026-11-05
author: design-lead (Lane Pilot specialist)
---

# MyPosts: three workspace prototypes

Three clickable, self-contained HTML prototypes of the MyPosts workspace (a BB plugin that learns an author's style and writes posts in it). Open [index.html](index.html) by double-click and pick a variant. No network, no build: CSS and JS are inline in each file.

> [!NOTE]
> These are design prototypes, not product code. They emulate the BB pane and the Pokecut theme tokens so they open outside BB. In the real plugin, BB supplies the host tokens, the chat is the SDK `ThreadChat`, and the profile/post data comes from plugin storage.

```
prototypes/
├── index.html       launcher: three cards, links, how to look
├── variant-a.html   A · Studio in three columns
├── variant-b.html   B · Content board
├── variant-c.html   C · Document + assistant  (recommended)
└── README.md        this file
```

## How to look at them

The dashed bar at the top of every prototype is prototype chrome and is not part of the plugin:

| Control | What it does |
| --- | --- |
| States 1–6 | Empty · Switcher open · New profile (portrait being built) · Profile home · New X post EN+RU · Telegram post iterated with the copywriter |
| Pane: Wide / 1200 / 900 / 420 | Resizes the BB workspace pane; the layout reacts through container queries, as it would inside BB |
| Language | RU ↔ EN. Interface strings come from one dictionary with the same keys; the bar shows `i18n: EN and RU keys match` or lists missing keys |
| Dark | Pokecut dark palette |

URL parameters work too: `variant-c.html?w=420&lang=en&theme=dark#x`. Add `check=1` to run the built-in layout self-check (see [Verification](#verification)).

User content (posts, chat messages, voice traits) stays in the author's language when the interface language changes; only interface labels are translated. That is the intended product behaviour.

## Shared ground (all three variants)

All three use the same fake data, so the comparison is about layout and flow only:

- **Profiles**: «Мой голос» (Telegram channel, 146 posts, ready), «Анна Ветрова — tech» (Dzen), «B2B без воды» (6 files, `Too few texts` warning — `style-portrait` needs at least 8 texts of 80+ words).
- **Portrait** follows the `style-portrait` skill's three layers: **A · Measured** (script metrics: sentence length, median post length, emoji per post, share of posts opening with a question), **B · Voice** (interpreted traits), **C · Writing rules** (instructions for `writing-in-style`, including taboo words), plus the skill's "content leak" note.
- **Platforms**: Telegram, X, Dzen, VK now; LinkedIn, Threads, Instagram shown as `soon`; «Add platform» slot. The new-post picker has a Post / Article switch (X is disabled for articles).
- **Platform rules** shown as a quiet chip next to the draft: Telegram 4096 chars and formatting; X 280 per tweet and every tweet in EN and RU; Dzen article with title, cover, H2; VK post with attachments.
- **X twins**: every tweet is a pair EN + RU with its own live counter and ring. Editing EN marks RU `RU is behind EN` and the copywriter offers «Update RU from EN».
- **Copywriter chat**: tool rows (`writing-in-style`, `telegram-rules`, `x-twins`), a Before/After proposal with Apply/Reject, quick chips (Shorter, More hooks, Check taboo words), a composer with the model chip `Claude Opus`. Typing and ⌘↵ sends a message and gets a canned reply.

### Spacing (concrete px, never `var(--spacing)`)

BB's Tailwind v4 `--spacing` is 4px, so paddings and gaps are written as concrete px. The prototypes declare these tokens on `.mp-app` and use the same values:

| Token | px | Where |
| --- | --- | --- |
| `--mp-s1` | 4 | Inside a group: icon ↔ label in pills, panel inner padding, list row gaps |
| `--mp-s2` | 8 | Rows and toolbars: button groups, nav rows, chip rows, header items |
| `--mp-s3` | 12 | Cards in one column, panel body padding, rail padding, chat log gaps (narrow) |
| `--mp-gap` | 16 | Between sections and grid columns; chat log padding; page padding on a narrow pane |
| `--mp-card-pad` | 20 | Card padding: editor card, voice/hero card, empty state card |
| `--mp-page-pad` | 24 | Page padding on a wide pane; header bars' horizontal padding |

| Size | px |
| --- | --- |
| Button / input | 32 (small 28) |
| Nav row / list row | 32–36 / 52–56 |
| Header bar (pane, draft, split) | 44–56 |
| Rail (A) | 248, 232 below 1280 |
| Copywriter column (B) | 360–420; 340 below 1100 |
| Preview / assistant (C) | 380 / 360; 340 below 1280 |

Radii follow `docs/DESIGN.md`: 8 rows, buttons, inputs · 6 segment in a 9 track · 12 inner cards, bubbles, popovers · 14 single cards and strips · 16 panels · 20 dialogs · full for pills and avatars.

### Mapping to native BB components

| Prototype piece | Build it with |
| --- | --- |
| Profile switcher | `@bb/popover` + `@bb/command` (search + list), rows styled `mp-nav-item` |
| Platform tabs, Post/Article, EN/RU/Both, Text/Preview | `@bb/toggle-group` or `@bb/tabs` with `mp-seg` / `mp-seg-item` |
| Board columns, cards (B) | `mp-panel` well + white cards; list mode via `@bb/table` |
| Every chat (style agent, copywriter, assistant) | SDK `ThreadChat` (`variant: "compact"`), one BB thread per profile / per post; never a custom composer |
| Portrait pinned in the chat (A) | `ThreadChat` `leadingContent` |
| Model chip | `experimental_ProviderModelPicker` (Claude Opus preselected) |
| Create-profile wizard (B) | `@bb/dialog` via `responsive-overlay` (drawer on phone) |
| Before/After proposal | `messageActions` on the agent message, or a small card in `Markdown` |
| Statuses | `mp-pill-*` only: draft = muted, agent writing = info, ready = success, published = neutral, too few texts / RU behind = warning, over limit = danger |
| Empty states | One card: what is here, how it appears, one `mp-accent` action |

Exactly one gradient (`mp-accent`) action per screen: «New post» / «New document» on lists, «Create profile» on empty, «Save profile» in creation, «Mark ready» (B) or «Copy for Telegram/X» (C) in the editor.

## Variant A · Studio in three columns

**Concept.** The owner's own picture: the profile is a place with its own chat; posts are listed on the left; a new post opens a third column with the draft and its own copywriter.

```
┌────────────────┬──────────────────────────┬──────────────────────────────────┐
│ [МГ Мой голос ▾]│ [Overview|Style chat] ⟳  │ ✈ Почему я перестал…  ●writing ⧉ ✕│
│ [+ New post   ] │                          │ ✈ up to 4096 · bold, links…       │
│ PLATFORMS       │  style agent chat        │ ┌──────────────────────────────┐ │
│  ≡ All      12  │  (refine the profile:    │ │ draft text (contenteditable) │ │
│  ✈ Telegram  5  │   taboo words, why       │ │ B I 🔗 🖼        461/4096 ✓  │ │
│  X X         3  │   "irony", …)            │ └──────────────────────────────┘ │
│  ✦ Dzen      2  │                          │ ─────────── splitter ─────────── │
│  VK          2  │                          │ Copywriter · Мой голос           │
│ POSTS           │                          │  user / agent / Before→After     │
│  ✈ Почему… ●    │  [composer]              │  [Shorter][More hooks][Taboo]    │
│  X Тред…   ●    │                          │  [composer]                      │
└────────────────┴──────────────────────────┴──────────────────────────────────┘
 < 1280: style chat column hides while a draft is open (rail + draft)
 ≤ 720 : one column + tabs [Posts | Voice | Draft]; draft title moves to its own line
```

**Main flows.**
1. Empty → «Create profile» → centre turns into the style-agent chat; the portrait is a sticky, collapsible card at the top of the chat with A ✓ / B running / C waiting; «Save profile» unlocks after layer C.
2. Profile home → Overview: header strip, portrait (A/B/C), platform list with counts and rules, recent posts. «Style chat» tab: the profile's own conversation.
3. «New post» → platform picker → the draft column opens on the right with the copywriter under the text.
4. Rail → platform filter → post → the same draft column.

**Strengths.** Matches the owner's mental model 1:1. The post list is always visible, switching posts is one click. The profile has a visible home and its own chat for tuning the voice.

**Weaknesses.** Two chats and two composers on screen at once: easy to type into the wrong one. Needs ≥ 1280px for three columns; in a normal BB pane (900–1200) the style chat disappears and A turns into "rail + draft" anyway. The draft's text and chat share one column, so both get short. No preview of how the post will look on the platform.

## Variant B · Content board

**Concept.** A content plan: every post of the profile on a board by status (Drafts · Agent writing · Ready · Published), filtered by platform tabs. A post opens in a split view (text + copywriter). A new profile is a guided wizard with a live portrait.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [МГ Мой голос ▾] [All 12|✈ 5|X 3|✦ 2|VK 2|+]          🔍 [▦|≡] [+ New post] │
│ Voice: (Conversational)(Irony w/o sarcasm)(…)                    ✦ Portrait › │
│ ┌─Draft 4──────┐ ┌─Agent writing 1┐ ┌─Ready 3──────┐ ┌─Published 4──┐        │
│ │ X  today     │ │ ✈ today        │ │ ✈ yesterday  │ │ ✈ Nov 1      │        │
│ │ Тред: …      │ │ Почему я…      │ │ 5 инструм…   │ │ Итоги окт…   │        │
│ │ 3 × EN+RU    │ │ 461 chars      │ │ 940 chars    │ │ 1 610 chars  │        │
│ │ [+ New post] │ └────────────────┘ └──────────────┘ └──────────────┘        │
└──────────────────────────────────────────────────────────────────────────────┘
 Open a post:
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Board / ✈ Telegram ●writing                        [⧉ Copy] [✓ Mark ready] │
│ ┌──────── editor (max 760, centred) ─────────┐ ┌──── Copywriter 360–420 ────┐│
│ │ Title / rules chip / text card / counter   │ │ thread + chips + composer  ││
│ │ X: [Both|EN|RU] tweets as EN│RU columns    │ │                            ││
│ └────────────────────────────────────────────┘ └────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
 Create profile: dialog over the board — steps Source ✓ › Analysis › Review › Save;
 left: style-agent chat; right: Live portrait 45% with A/B/C filling in.
 ≤ 900: split view becomes tabs [Text | Copywriter]
 ≤ 720: platform tabs wrap to their own row, board → status segment + one column,
        wizard goes full-screen with the portrait collapsed to a 52px summary bar
```

**Main flows.**
1. Empty → ghost board + one card «Create profile» → wizard; Cancel returns to the board.
2. Board → platform tab → card → split view; «← Board» returns.
3. «New post» (header, column «+», or the dashed card) → platform picker → split view.
4. X post: `Both` shows EN│RU columns per tweet, `EN` or `RU` shows one language for focused editing.

**Strengths.** Best overview: what is in progress, what is ready, what was published, per platform. The split view gives the text and the chat full height. The wizard makes profile creation feel finite (steps, progress, a clear Save). Folds cleanly to a narrow pane.

**Weaknesses.** A board pays off with volume; for one author with a handful of posts a week it is mostly empty columns. The profile's voice is only a strip and a «Portrait» link; tuning the voice later has no home. Status columns imply a workflow (drag between columns) that the plugin may not need. Still no platform preview.

## Variant C · Document + assistant (recommended)

**Concept.** Writing first. One idea is one document; the document has **versions per platform** (Telegram, X EN+RU, later Dzen…), switched by a target segment in the top bar. Next to the text there is a live preview of how it lands on the platform; the assistant (the copywriter `ThreadChat`) is a side panel you open and close. Select a sentence and an inline toolbar offers Shorter · Sharper · In profile voice · Ask…. The profile is a **voice card**.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ (МГ Мой голос ▾) › Documents › Почему я…   [✈ Telegram|X EN+RU|+] [✦ Assistant] [⧉ Copy for Telegram] │
├───────────────────────────────────┬──────────────────────┬───────────────────────┤
│  Почему я перестал делать роадмапы │ Preview              │ Assistant · Мой голос✕│
│  ●writing ✈ Telegram · 461/4096 …  │ ┌ Без фильтров ────┐ │ user / agent          │
│  Полгода без роадмапа — …          │ │ bubble with the  │ │ Before → After        │
│    [Shorter|Sharper|In voice|Ask…] │ │ formatted post   │ │ [Apply] [Reject]      │
│  Вот что произошло. ▒selected▒ …   │ │      👁 — 12:40  │ │ [chips]               │
│  …                                 │ └──────────────────┘ │ [composer]            │
├───────────────────────────────────┴──────────────────────┴───────────────────────┤
│ X version: same document, tweets as EN │ RU twins; preview = X cards with EN/RU   │
└──────────────────────────────────────────────────────────────────────────────────┘
 Home: voice card (traits, 4 measured numbers, «Open portrait») + Documents list,
       each row shows its target platforms (the roadmap doc carries ✈ and X).
 Create: the voice card *is* the document — source chip, layers A/B/C fill in,
         style-agent chat in the side panel, preview shows the card being built.
 < 1280 with the assistant open: preview moves behind [Text | Preview] in the doc
 ≤ 720: one column + [Text | Preview | Assistant]; crumb hides, targets get a row
```

**Main flows.**
1. Empty → «Create profile» → the voice document: link chip (157 found, 146 by the author, 11 forwards dropped), layers fill in, assistant shows the analysis; «Save profile» unlocks after layer C.
2. Home → document row → editor on its last platform version. Target segment switches Telegram ↔ X; «+» adds a version for another platform.
3. Select text → inline toolbar → the request lands in the assistant (which opens if closed).
4. X version: «Derived from the Telegram version · edit freely»; EN│RU twins with counters; preview toggles EN/RU and shows the thread 1/3 … 3/3.
5. «Copy for Telegram / for X» is the primary action until publishing exists.

**Strengths.** Focus on the text, with the chat only when wanted: one composer on screen at most. The preview answers "how will it look" (Telegram bubble, X cards with the thread), which A and B never show. One document → many platform versions matches real cross-posting and makes the X EN+RU rule natural. Inline selection actions shorten the iterate loop. Reads as a native BB side panel, generic enough for the marketplace.

**Weaknesses.** Least overview of the three (the list is a separate home page). Changes the owner's hierarchy from *Profile → Platform → Posts* to *Profile → Document → Platform versions* (see open question 1). The preview is approximate and has to be built per platform (Telegram and X first, Dzen later). Three columns need ≥ 1280px; below that preview and assistant take turns.

## Comparison

| | A · Studio | B · Board | C · Document |
| --- | --- | --- | --- |
| Closest to the owner's description | ✅ | ◐ | ◐ |
| Focus while writing | ◐ two chats visible | ✅ | ✅ one chat, on demand |
| Overview of many posts | ◐ rail list | ✅ board by status | ◐ separate home list |
| How it will look on the platform | ✗ | ✗ | ✅ live preview |
| X EN+RU twins | stacked | Both / EN / RU | side by side + preview EN/RU |
| Same idea to several platforms | separate posts | separate posts | ✅ versions of one document |
| Typical BB pane 900–1200 | degrades to rail + draft | ✅ | ✅ (preview ⇄ assistant) |
| Narrow pane 420 | tabs, OK | ✅ cleanest | tabs, OK |
| Build cost | medium | medium-high (board, wizard) | medium-high (previews) |

## Recommendation

**Take C as the base.** MyPosts is a writing tool, and C is the only variant that keeps the text in front, shows the result as the reader will see it, and keeps a single conversation on screen. Its document-with-versions model turns the hardest platform rule (every X tweet in EN and RU) and cross-posting (Telegram + X + Dzen from one idea) into one structure instead of parallel posts. It also degrades best to the pane widths BB actually gives a plugin.

Borrow two things:

1. From **B**, the creation wizard's discipline: a visible progress (A ✓ / B / C) and a Save that unlocks only after layer C. C already shows the layers filling in; add the progress bar.
2. From **A**, an optional document rail on wide panes (≥ 1440px) so switching between drafts is one click, collapsed by default.

If the owner's real use is a content plan with many posts per week across platforms, choose **B** instead; A is the weakest at BB pane widths because its three columns collapse to two below 1280px.

## Open questions for the owner

1. **Hierarchy.** C stores *Profile → Document → Platform versions*; the brief says *Profile → Platform → Posts*. C's home still filters by platform. Accept versions, or keep one post per platform?
2. **X source of truth.** Is EN the original and RU derived (the prototype marks RU as behind after an EN edit), or are both edited independently?
3. **Threads.** `ThreadChat` needs a BB thread: one per profile (style agent) and one per document (copywriter)? Should these threads be hidden from the BB sidebar?
4. **Telegram ingest.** Public channel link only, or also a Telegram JSON export (needed for private channels and full history)?
5. **Counting.** The prototype counts code points. X counts a link as 23 and some emoji as 2; Telegram counts the formatted text. Confirm the rules for the writer.
6. **Model.** Fixed Claude Opus, or the BB model picker with Opus preselected?

## Verification

Done in this run, on Mac mini with headless Google Chrome:

- [x] Built-in self-check `?check=1` walks all 6 states and measures real element boxes against the pane, plus whether titles are clipped. Run for 3 variants × 4 pane widths (wide, 1200, 900, 420) × 2 languages = 24 runs: **0 issues** after fixes. Before the fixes it caught a chat 5–6px wider than the pane (A and B), the B voice strip overflowing at 900, the C selection toolbar overflowing at 420 and the A draft title clipped at 1200 (the A three-column threshold was moved to 1280).
- [x] The C selection toolbar is positioned from the measured box of the selected sentence, not from a fixed offset.
- [x] Screenshots checked: light and dark, RU and EN, wide / 1200 / 900 / 420.
- [x] i18n: EN and RU dictionaries have the same keys (shown in the prototype bar).
- [x] No network: no `http(s)` resources in the files (checked at build).

Not done: the live BB checklist from `docs/DESIGN.md` (Pokecut and Default themes inside BB, keyboard focus walk) — that applies to the built plugin, not to static prototypes.

For a browser QA run after the owner picks: open `variant-<x>.html` at viewports **420, 768, 900, 1280, 1600**; cases: switch profile from the switcher; create profile from the empty state; open a Telegram post and Apply the proposal (text changes, counter updates); open the X post, edit an EN tweet (counter and ring update, over 280 turns red); in C toggle the assistant and use the selection toolbar; switch RU/EN and dark.

## Next steps (for the PM)

- Owner picks a variant (or C with the two borrowings).
- design-lead turns the pick into `UI-SPEC.md` (states, components, copy keys) and the plugin's `DESIGN.md`.
- A writer builds it; the prototype's `mp-` classes are already prefixed and token-based, so they can move into the plugin's `app.css` almost as they are (without the host-emulation block).

## A2 · Studio: post + chat (owner's pick, iteration 2)

> [!NOTE]
> The owner picked **A** as the base and asked: *when I open a post it must be [post here] [chat here]*. A2 keeps A's profile level and turns the post level into two columns. Files: [variant-a2.html](variant-a2.html) (self-contained, same prototype bar, same fake data) and screenshots `screens/a2-*.png`. A, B and C are unchanged.

### What changed vs A

| | A | A2 |
| --- | --- | --- |
| Profile level (empty, switcher, create, home) | rail + overview / style chat | **same as A** (rail, switcher top-left, «New post», platforms, posts; overview / style chat) |
| Opening a post | third column on the right; draft on top, copywriter chat below it | **workspace switches to two columns: [post │ chat]**; rail and style chat are gone |
| Chats on screen while in a post | two (style chat + copywriter) | **one** (copywriter) |
| Way back to the profile | rail always visible | crumb bar: `←` · `Мой голос › ✈ Telegram › title` · «Posts ▾» quick switcher |
| Text vs chat height | share one column, both short | each has full height |
| Platform preview | none | **Editor │ Preview** toggle in the post column (from C): Telegram bubble, X cards with EN/RU |
| Selection actions | none | **Shorter · Sharper · In profile voice · Ask…** above the selection (from C); the request and the proposal land in the chat |
| Primary action | «New post» on every screen | «New post» on the profile level, **«Mark ready»** inside a post (one gradient per screen) |
| Column width | fixed | **draggable divider** (pointer and ←/→ keys, double-click resets); chat 320–640px, post never below 480px |
| Typical BB pane 900–1200 | style chat hides, A degrades to rail + draft | 1200: post 809 + chat 380; ≤ 900: tabs |
| Narrow pane | tabs Posts │ Voice │ Draft | profile: Posts │ Voice (as A); post: **Post │ Chat** with a pending-proposals badge |

### Screens

Profile level is A's and is not redrawn here (see Variant A above).

**Post, wide pane (Telegram, Editor).** States 5 and 7.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ←  (МГ) Мой голос  ›  ✈ Telegram  ›  Почему я перестал делать роадмапы          [≡ Posts ▾]   │ crumb bar 48
├────────────────────────────────────────────────────────────┬┬────────────────────────────────┤
│        ✈ Telegram  ● Agent writing        [Editor│Preview] ││ AI Copywriter · Мой голос    ⋯ │
│        Почему я перестал делать роадмапы   (title, wraps)  ││ ┌ Before ────────────────────┐ │
├────────────────────────────────────────────────────────────┤│ │ ~~old first line~~         │ │
│        (✈ up to 4096 · bold, italic, links · preview)      ││ │ After                      │ │
│        ┌ editor card, text column 712px, centred ───────┐  ┃│ │ new first line   ✓ Done    │ │
│        │ Полгода без роадмапа — …                       │  ┃│ └────────────────────────────┘ │
│        │      [Shorter|Sharper|In profile voice|Ask…]   │  ┃│ ✓ telegram-rules 4096 · md Done│
│        │ Вот что произошло. ▒selected sentence▒ …       │  ││ 461 of 4096 — no need to cut…  │
│        │ …                                              │  ││ ┌ After ─────────────────────┐ │
│        │ ─────────────────────────────────────────────  │  ││ │ …по датам или по ставкам?  │ │
│        │ B I 🔗 🖼                        461 / 4 096 ◔ │  ││ │ [✓ Apply] [Reject]         │ │
│        └────────────────────────────────────────────────┘  ││ └────────────────────────────┘ │
│                                                            ││ [Shorter][More hooks][Taboo]   │
├────────────────────────────────────────────────────────────┤│ ┌ composer ──────────────────┐ │
│        ✓ Saved · 12:40          [⧉ Copy] [✓ Mark ready]    ││ │ 📎 Claude Opus ▾      ⌘↵ ↑ │ │
└────────────────────────────────────────────────────────────┴┴────────────────────────────────┘
  post column = rest (min 480)                       divider 9 ┃  chat 400 (380 below 1280), 320–640
```

- Head, text column and footer share one 712px text column, centred in the post column, so title, editor and actions line up at any width.
- The footer mirrors the chat composer: both columns end with their actions at the bottom.
- The crumb title shows only at ≥ 1280px; below that the post's own title is the only one.
- «Posts ▾» opens the profile's post list as a popover, so switching posts does not need a trip back to the profile.

**Post in Preview mode (state 7).** The editor card is replaced by the platform preview; the chat stays.

```
│        ✈ Telegram  ● Agent writing        [Editor│Preview●]││ chat (unchanged)               │
│        ┌ Без фильтров · 2 140 subscribers ───── ✈ ┐        ││                                │
│        │ ┌ bubble: current text, formatted ─────┐ │        ││                                │
│        │ │ …                         👁 — 12:40  │ │        ││                                │
│        │ └──────────────────────────────────────┘ │        ││                                │
│        └──────────────────────────────────────────┘        ││                                │
│        Preview approximates the platform …                 ││                                │
```

**X post (state 6).** Every tweet is an EN + RU pair inside the post column: side by side when the post column is ≥ 700px, EN above RU below that (a container query on the post column, not on the pane).

```
│  X  ● Draft                               [Editor│Preview] ││ AI Copywriter                  │
│  Тред: роадмапы против ставок                              ││ ✓ writing-in-style  Done       │
│  (X 280 per tweet · every tweet in EN and RU · thread ≤25) ││ ✓ x-twins EN → RU, 3 × 2 Done  │
│  Thread 3 × EN+RU                  (◉ Keep versions in sync)││ ↻ You edited EN in tweet 2 —   │
│  ┌ Tweet 2 ───────────────────────────────────────────── ⋯┐││   RU is behind [Update RU from │
│  │ EN            118 / 280 ◔ │ RU  RU is behind EN 107/280◔│││   EN]                          │
│  │ One page. Three bets …    │ Одна страница. Три ставки… │││                                │
│  │                           │ EN was edited after this RU│││                                │
│  │                           │        [↻ Update RU from EN]│││                                │
│  └────────────────────────────────────────────────────────┘││                                │
```

- Editing an EN tweet marks its RU twin `RU is behind EN` at once; «Update RU from EN» on the tweet or in the chat rewrites RU (in the profile voice, not literally) and logs an `x-twins` step in the chat.
- Preview for X: tweet cards with an EN │ RU switch.

**Narrow pane ≤ 900px (states 5–8 at 900 and 420).** BB's content threshold is 880px; A2 switches at 900 so the 900 pane already gets tabs. Below that width two columns would leave the post under 480px, so they never squeeze side by side.

```
 900 / 420                                   420, Chat tab (state 8)
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│ ← (МГ) › ✈   [Post│Chat ①]  [≡▾] │        │ ← (МГ) › ✈   [Post│Chat●①] [≡▾] │
├──────────────────────────────────┤        ├──────────────────────────────────┤
│ ✈ Telegram ●Writing [Edit│Prev] │        │ AI Copywriter · Мой голос      ⋯ │
│ Почему я перестал делать          │        │ Before → After  ✓ Done           │
│ роадмапы (wraps)                  │        │ ✓ telegram-rules …               │
├──────────────────────────────────┤        │ After … [✓ Apply] [Reject]       │
│ editor card / X twins stacked     │        │ [Shorter][More hooks][Taboo]     │
│ [Shorter|Sharper|In voice|Ask…]   │        │ ┌ composer ─────────────────────┐│
├──────────────────────────────────┤        │ │ 📎 Claude Opus ▾        ⌘↵ ↑ ││
│                 [⧉] [✓ Mark ready] │        │ └───────────────────────────────┘│
└──────────────────────────────────┘        └──────────────────────────────────┘
```

- The badge on «Chat» counts what waits for the author: open Apply/Reject proposals, and on an X post the RU twins that are behind.
- A selection action (Shorter, Sharper, In profile voice) switches to the Chat tab, where the request and then the proposal appear; Apply changes the post. «Ask…» puts the quoted selection into the composer.
- At 900 the crumb keeps profile and platform names and the Posts button loses its label; at ≤ 720 the crumb keeps only avatar and platform icon, Copy becomes an icon, «Saved» hides.
- Profile level at ≤ 720 is A's: tabs Posts │ Voice.

### States in the prototype bar

1 Empty · 2 Switcher · 3 New profile · 4 Profile (as A) · 5 Telegram [post │ chat] · 6 X EN+RU [post │ chat] · 7 TG preview · 8 Narrow: chat (sets the pane to 420 on the Chat tab; the next state restores the previous width).

### Trade-offs chosen

1. **Rail hidden, not an icon strip.** The owner asked for exactly two columns. A 52px icon strip would be a third column and cost the post 52px at 900–1200. The way back is the crumb (profile, platform) and «Posts ▾» for post-to-post switching. If switching between posts turns out to be frequent, the strip can be added at ≥ 1440px only.
2. **Tabs, not a bottom sheet, below 900px.** A sheet over the text hides what the chat is talking about; tabs give each side full height, and the badge says when the chat has something to apply.
3. **Actions in a footer, not in the header.** With the Editor/Preview toggle and the title in the header, Copy + Mark ready would squeeze the title into a narrow strip at 1200. The footer also lines up with the chat composer.
4. **Style chat is not reachable from inside a post.** Voice tuning stays on the profile level (one composer on screen at a time). The copywriter still follows the portrait rules and says so in its replies.

### Contract for the writer (A2)

| Piece | Build it with |
| --- | --- |
| Crumb bar | `mp-btn ghost` back, crumb rows `mp-nav-item`-like buttons, «Posts ▾» `@bb/popover` + `@bb/command` |
| Post │ Chat split | CSS grid `minmax(0,1fr) 9px var(--mp-chat-w)`; divider `role="separator"` with `aria-valuenow`, pointer + ←/→; width saved per user in plugin settings |
| Post │ Chat tabs, Editor │ Preview, EN │ RU | `@bb/toggle-group` with `mp-seg` / `mp-seg-item` |
| Chat column | SDK `ThreadChat` `variant: "compact"`, one BB thread per post; proposals as `messageActions` (Apply / Reject) |
| Model | `experimental_ProviderModelPicker`, Claude Opus preselected |
| Selection toolbar | small popover positioned from the selection's client rect, clamped to the editor card |
| Statuses | `mp-pill-*`: Agent writing = info, Draft = muted, Ready = success, RU is behind EN = warning |
| Breakpoints | container queries on the plugin root: 1280 (chat 380, crumb title hides), 900 (tabs), 720 (profile tabs, compact crumb); post column container query 700 for X twins |

New i18n keys (EN and RU, same keys) live in the `a2.*` group of the prototype dictionary; the prototype bar shows `i18n: EN and RU keys match`.

### Verification (A2)

Done on Mac mini, headless Google Chrome:

- [x] Built-in self-check `?check=1`, now also walking states 7 and 8 and checking that the post column is ≥ 480px and the chat ≥ 320px whenever both are visible, that tabs exist when they are not, that the selection toolbar stays inside the editor card, and that the crumb bar and post footer do not overflow: 4 pane widths × RU/EN = 8 runs, **0 issues**.
- [x] Click-through over the DevTools protocol, 8 cases, all pass: selection «Shorter» → proposal → Apply replaces the sentence and updates the counter; Reject clears the badge; Preview shows the edited text; divider ←16px by keyboard and clamps at 640 by drag with the post still ≥ 480; X EN edit marks RU stale (badge 2) and both «Update RU from EN» buttons clear it; at 420 tabs replace the divider and a selection action jumps to Chat; state 8 sets 420 and restores 1200; crumb «Telegram» returns to the profile with the Telegram filter.
- [x] Title measured in the browser, not guessed: «Почему я перестал делать роадмапы» renders 393px in a 712px text column (wide, 1200, 900) and 346px in 386px at 420, one line in every case; the X title is 326px / 288px. Post column 1109px wide, 809px at 1200; chat 400 / 380px.
- [x] Screenshots checked: light and dark, RU and EN, wide / 1200 / 900 / 420.

For a browser QA run: open `variant-a2.html` at viewports **420, 768, 900, 1280, 1600**; cases: open a post from the rail and return by `←` and by the crumb; select a sentence and use Shorter, then Apply; drag the divider both ways; toggle Editor │ Preview; on the X post edit an EN tweet and press «Update RU from EN»; at 420 switch Post │ Chat and watch the badge; switch RU/EN and dark.
