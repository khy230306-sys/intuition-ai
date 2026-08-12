# Asset Policy — 쑥쑥놀이터 NEW

## Core rule

**REFERENCE IMAGE IS NOT A GAME ASSET.**

Visual Bible / style-reference images may inform color, proportion, lighting, and mood only.

## Forbidden

- Cropping Visual Bible images into UI/game graphics
- Screenshot slices used as buttons, cars, characters, or backgrounds
- One large PNG with transparent click overlays
- Whole-vehicle hue filters as “coloring”
- CSS `background-image` of sample art pretending to be finished UI
- Emoji / low-quality placeholder SVG marked as final art

## Required

- Independent production assets under `assets/` (and `src/assets/` for vector parts)
- Part-level vehicle structure (color / rotate / move / animate / collide per part)
- Missing art must surface as **Asset Required**, never fake-complete

## Expansion gate

Ship and harden **one firetruck workshop pipeline** first:

select → assemble → paint(parts) → drive → mission → reward

Only after that vehicle passes the commercial quality bar, expand to excavator, dump truck, crane, ambulance, etc.
