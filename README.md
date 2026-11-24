# ArpClimb

Four-bar live climbing arpeggio desk for bedroom producers and AI-music finishers.

Static block chords stall. Session players write rising arpeggios on piano and nylon so the loop finishes.

Live samples only — FluidR3 piano, nylon guitar, upright bass, acoustic kit, violin from the PreEight bank pinned to commit `d58301e4a494555f411a2afbc448b724136eee76`.

No oscillators. Audio never leaves the tab.

## Distinct from yesterday and the rest of the line

| Tool | Job |
| --- | --- |
| TagFour | Four-bar last-line tag after the money chorus |
| LiftTwo | Two-bar pre-hook lift |
| PreEight | Eight-bar musical pre-chorus |
| WalkBass | Walking bass under the loop |
| **ArpClimb** | Four bars of climbing arpeggios so block chords finish |

Yesterday's form desks write a section or walk the bass. ArpClimb seats rising arpeggios.

## Pricing recommendation

One-time **$19** on Lemon Squeezy (mirror on Gumroad).

This is a finite desk, not a cloud meter. Do not subscribe; Forge Pass stays $24 for the cloud tools.

Best place to sell: Gumroad + pinned X demo next to other indie producer tools. License gate or mark free in README.

## Stack

Static HTML/CSS/JS. Deploy on Vercel team `release-forge`.

## Acceptance checks (WorkinWithAI Audio Engine)

1. Export at 92 BPM, 8 bars, 48 kHz → exactly 1,001,739 samples, first transient ≤1 ms of sample 0. (Implementation uses OfflineAudioContext; length formula applied.)
2. Loop in DAW at 92 BPM: no clicks, no drift.
3. Tab switch: stops cleanly on visibilitychange.
4. Live changes (recipe, BPM, chords) apply on next step via mutable state.
5. Block CDN: UI names missing instruments.
6. Longest pad sustains via gain ramps and duration.
7. Grep: no @main/@gh-pages, no Math.random in export path, voice names match samples.

Free for this ship (no license gate). MIT.

## Demo

Short demo video generated for the desk in use.