# Visual system

## Direction

An immersive underwater editorial experience for a live experiment. The opening is a full-screen, black-and-silver scene with a procedural fish-shaped particle cloud and an oversized VLAD wordmark. The live tank, paper portfolio, ledger, and decision rules follow as distinct acts in a continuous story. The fish is the spectacle; every number remains legible and labelled.

The user supplied [Lusion's About page](https://lusion.co/about/) as a visual reference. The design studies its cinematic scale, quiet navigation, monochrome depth, large typography, and scroll pacing. It uses original fish geometry, copy, layout, assets, and product content.

## Tokens

| Role | Color |
| --- | --- |
| Abyss | `#08090b` |
| Charcoal | `#15191b` |
| Mist | `#a6abad` |
| Chalk | `#f0f0ed` |
| White | `#fbfbf8` |
| Fish signal | `#ef8a65` |

Arial/Helvetica carries the immense display type and data. DM Sans carries longer explanations and controls. Most sections use a single strong left alignment and full-width rules. The wordmark and the camera are the only elements that dominate their scenes.

## Layout

```text
DESKTOP                            MOBILE
[wordmark]         [live] [menu]   [wordmark]  [menu]
|  particle fish / full viewport | | fish / full viewport |
|             VLAD.             | |      VLAD.          |
|   premise / one clear sentence | | premise stacked      |
| live camera      signal readout | | live camera          |
| portfolio total / chart / SPY  | | total / chart / SPY  |
| tank map         decision text | | map / readout        |
| holdings / ledger / method     | | stacked records      |
```

## Motion

GSAP ScrollTrigger pins the opening for a three-beat sequence: the VLAD title exits, a fish-decision headline enters, then the ledger headline replaces it. A slim progress rail follows the sequence. Three.js builds the fish silhouette from points; it drifts with the pointer, then changes scale, position, and angle with scroll. Chapter headlines reveal by line, the tank media wipes open, and the portfolio line draws when reached. The menu staggers its links. The field skips rendering while out of view.

Motion is decorative. Reduced-motion users receive a static aquarium visual with no WebGL loop, pinning, or hidden chapter content. Portfolio state, prices, links, and controls work without the animation layer. New paper trades receive a brief, localized highlight.

## Editorial rules

- Mark the default scenario as a preview, with sample prices and trades.
- Keep broadcast state, camera tracking state, and quote state separate.
- Keep stock symbols as paper reference assets; do not call them Pons tokens.
- Use ample whitespace and full-width rules instead of repeated dashboard cards.
- Preserve clear focus, contrast, mobile navigation, and chart/table accessibility.
