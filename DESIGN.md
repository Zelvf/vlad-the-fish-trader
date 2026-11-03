# Visual system

## Direction

An aquarium observation deck crossed with a transparent paper-trading journal. The fish and live camera are the memorable element; numbers are set in calm, readable editorial blocks. The interface should feel curious and precise, without imitating a brokerage app or turning the fish into an emoji mascot.

## Tokens

| Role | Color |
| --- | --- |
| Deep tank | `#082732` |
| Midwater | `#103c45` |
| Signal teal | `#2fc2ad` |
| Sea glass | `#95efce` |
| Page paper | `#f4f7f2` |
| Warm fish accent | `#f4a46d` |

Space Grotesk carries the title and large values; DM Sans carries explanations and controls. The layout begins with a wide tank viewport and a decisive headline, then opens into asymmetrical chart, benchmark and zone panels. The journal returns to dark water so the public record feels like a distinct act rather than another card row.

## Motion

GSAP runs one coordinated page entrance and highlights a newly recorded trade. Three.js renders a restrained decorative water field behind the hero. Neither motion source conveys portfolio data; numbers and states update through React. `prefers-reduced-motion` disables the WebGL loop and entrance animation while preserving status changes and controls. The live YouTube iframe is never animated or overlaid with a misleading real-time tracking marker.

## Editorial rules

- Call every order **paper** or **simulated** in context.
- Separate stream status from tracker status.
- Label scenario prices and sample trades explicitly.
- Keep stock symbols as reference assets; do not call them Pons tokens.
- Prefer direct sentences to financial hype.
