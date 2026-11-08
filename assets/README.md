# Assets

Hand-authored SVG. No raster source, no tracing step, no upstream artwork.

## Files

| File | viewBox | Used for |
|---|---|---|
| `hero.svg` | `0 0 1280 480` | README top banner (8:3). Shows the whole promise in one frame: a ChatGPT subscription card, an OAuth sign-in capsule, a DeepSeek Harness card, and four capability chips. |
| `icon.svg` | `0 0 512 512` | Square mark; must stay readable at 32×32 |
| `wordmark.svg` | `0 0 760 160` | Bubble mark plus the product name |

## Palette

| Token | Value | Role |
|---|---|---|
| Base | `#0F172A` | Background field, knocked-out strokes |
| Primary | `#10B981` | Speech bubble |
| Accent | `#38BDF8` | Terminal window, prompt bar |
| Neutral | `#E2E8F0` | Signal lines, nodes, wordmark text |

Four values only, no gradients, no shadows, no effects. Keep it that way: the artwork is
line-and-fill geometry, and every added effect makes the files heavier without adding meaning.

## Editing rules

- Edit the `path` data; do not swap in an exported raster.
- `icon.svg` has no text at all, so it survives any locale.
- `wordmark.svg` renders its label with a system font stack, because a hand-authored SVG
  cannot embed a font legally or reliably. The wordmark therefore shifts slightly between
  platforms. If a byte-identical lockup is ever required, the text must be converted to paths
  by whoever owns the type design.
- Do not reuse OpenAI, ChatGPT, Codex, DeepSeek, or DeepSeek Harness logos, wordmarks, or
  lookalikes in these files.

## Notice

This project is an independent community Alpha. It is not affiliated with, sponsored by, or
endorsed by OpenAI, ChatGPT, Codex, DeepSeek, or DeepSeek Harness. The artwork above is
original to this repository and is distributed under the same licence as the repository
(Apache-2.0; see [../LICENSE](../LICENSE) and [../NOTICE](../NOTICE)).

## Packaging

These files are referenced from `README.md`, so `assets` must be listed in the `files`
whitelist of `package.json`. A relative link to a file outside the published tarball cannot
resolve on the npm package page.
