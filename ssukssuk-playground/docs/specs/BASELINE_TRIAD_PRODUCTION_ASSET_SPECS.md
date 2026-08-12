# Baseline Triad — Production Asset Specifications

**Gate:** VISUAL_PRODUCTION_GATE = BLOCKED  
**ASSET_PROVIDER_STATUS = NOT_CONFIGURED**  
Do not invent substitute graphics. These specs are for future approved production delivery.

Style reference only (not source art): Visual Bible — toy-like soft plastic, rounded forms, saturated kid palette, soft top lighting, friendly eyes on windshields, dense cheerful environments.

Shared acceptance (Constitution §11):
- Matches Visual Bible mood without cropping it
- Consistent proportions across set
- Sufficient resolution on mobile
- Clean transparent edges (no white fringe) where required
- Natural part seams; animation joints hold
- Coloring regions isolatable (vehicles)
- No emoji / temp SVG / hue-filter whole-vehicle

---

## A. SSUKSSUK Character Bible

### Shared character spec
- **Name:** Ssukssuk (쑥쑥이)
- **Role:** Guide / reaction character in Car Workshop
- **Recommended resolution:** 1024×1024 per pose (2x for ~320–400 CSS px)
- **Aspect ratio:** 1:1
- **Transparent background:** Yes
- **Perspective:** Slight 3/4 or friendly front-3/4; consistent across poses
- **Lighting:** Soft top-front key, gentle contact shadow separate or baked lightly
- **Material:** Soft plastic / plush-toy readable volumes
- **Color palette:** Yellow cap, green sprout, white tee, green overalls, rosy cheeks, warm skin
- **Required layered parts (authoring):** head, eyes, mouth, body, arms, legs, hat, overalls
- **Animation states (separate assets):** idle, walk, run, point, thinking, happy, surprised, encourage, sad, celebrate, wave
- **Generation prompt/specification:**  
  “Chibi toddler mascot, large head ~1/3 height, yellow baseball cap with green sprout, white t-shirt, green overalls with circular S badge, large friendly eyes, soft toy shading, transparent PNG, identical character across poses, no text, no watermark, no photo realism.”
- **Acceptance criteria:** Same face/outfit/proportions in every pose; readable at 128px; no bible crop; passes Quality Gate

| Asset ID | Pose | Notes |
|---|---|---|
| ASSET_SSUKSSUK_IDLE | idle | Neutral smile, standing |
| ASSET_SSUKSSUK_WALK | walk | Clear walk contact pose |
| ASSET_SSUKSSUK_RUN | run | Energetic lean |
| ASSET_SSUKSSUK_POINT | point | Pointing to vehicle/slot |
| ASSET_SSUKSSUK_THINKING | thinking | Thoughtful |
| ASSET_SSUKSSUK_HAPPY | happy | Joy |
| ASSET_SSUKSSUK_SURPRISED | surprised | Wide eyes |
| ASSET_SSUKSSUK_ENCOURAGE | encourage | Cheering |
| ASSET_SSUKSSUK_SAD | sad | Soft disappointment |
| ASSET_SSUKSSUK_CELEBRATE | celebrate | Victory |
| ASSET_SSUKSSUK_WAVE | wave | Greeting |

---

## B. FIRE_TRUCK_01 Parts

### Shared vehicle spec
- **Name:** FIRE_TRUCK_01
- **Role:** First workshop vehicle entity (assemble / part-paint / drive / mission)
- **Perspective:** Consistent side or 3/4 side (lock one; all parts share it)
- **Lighting:** Soft top-down toy lighting; shared light direction
- **Material:** Soft plastic toy vehicle, chunky rounded forms, no sharp edges
- **Color palette (defaults, paintable):** body red `#E53935`, door yellow `#FFD54F`, windows sky `#81D4FA`, ladder gray `#90A4AE`, rims light metal, tires dark, emergency light blue
- **Coloring regions:** BODY, DOOR, RIM, BUMPER, LADDER, LIGHT, HOSE, WINDOW
- **Animation states:** disassembled, assembled, painted, driving (wheel spin), mission (siren), celebrate
- **Acceptance criteria:** Each part independent PNG; paint fill layer separable from fixed details (eyes, bolts); snap seams align; no whole-vehicle hue dependency

| Asset ID | Name / role | Res | AR | Transparent | Notes |
|---|---|---|---|---|---|
| ASSET_FIRETRUCK_BODY | Main chassis | 1024×640 | ~1.6 | yes | Paintable BODY |
| ASSET_FIRETRUCK_FRONT_DOOR | Cabin door | 512×512 | 1 | yes | Paintable DOOR; S badge detail non-paint or masked |
| ASSET_FIRETRUCK_REAR_DOOR | Side/rear panel | 512×512 | 1 | yes | Paintable DOOR |
| ASSET_FIRETRUCK_WHEEL_FRONT | Front tire | 512×512 | 1 | yes | Rotates; not whole-car hue |
| ASSET_FIRETRUCK_WHEEL_REAR | Rear tire | 512×512 | 1 | yes | Rotates |
| ASSET_FIRETRUCK_RIM_FRONT | Front rim | 384×384 | 1 | yes | Paintable RIM |
| ASSET_FIRETRUCK_RIM_REAR | Rear rim | 384×384 | 1 | yes | Paintable RIM |
| ASSET_FIRETRUCK_WINDOW_FRONT | Windshield + face | 640×480 | ~1.33 | yes | Paintable WINDOW glass; eyes fixed layer |
| ASSET_FIRETRUCK_WINDOW_SIDE | Side window | 512×384 | ~1.33 | yes | WINDOW |
| ASSET_FIRETRUCK_BUMPER | Bumper | 640×256 | 2.5 | yes | BUMPER |
| ASSET_FIRETRUCK_LADDER | Roof ladder | 1024×256 | 4 | yes | LADDER |
| ASSET_FIRETRUCK_EMERGENCY_LIGHT | Siren | 384×384 | 1 | yes | LIGHT; blink-friendly |
| ASSET_FIRETRUCK_HOSE | Hose reel/hose | 512×512 | 1 | yes | HOSE |
| ASSET_FIRETRUCK_HEAD_LIGHT | Headlight | 256×256 | 1 | yes | LIGHT |
| ASSET_FIRETRUCK_SHADOW | Ground shadow | 1024×256 | 4 | yes | Non-paintable |

**Generation prompt/specification (per part):**  
“Isolated firetruck [PART] for kids toy vehicle game, soft plastic 3D-look 2D, rounded chunky, transparent PNG, matching side perspective to FIRE_TRUCK_01 kit, no full truck in frame unless part is body, no text watermark, paintable base color area clear of baked conflicting paint where region must recolor.”

---

## C. Car Workshop Environment

| Asset ID | Name / role | Res | AR | Transparent | Perspective / lighting / material |
|---|---|---|---|---|---|
| ASSET_GARAGE_BACKGROUND | Workshop full-bleed BG | 2048×1536 | 4:3 | no | Soft isometric/high-angle toy room; warm bright; wood/metal toy materials; **no crop-out characters/cars for reuse** |
| ASSET_GARAGE_WORKBENCH | Workbench prop | 1024×768 | ~4:3 | yes | Same world style |
| ASSET_GARAGE_TOOL_RACK | Tool rack prop | 768×1024 | ~3:4 | yes | Same world style |

**Color palette:** Sky-blue accents, warm wood, soft concrete/floor green mats, yellow safety hints — aligned with Visual Bible saturation, not copied pixels.

**Animation states:** day (static); optional ambient dust/light only.

**Acceptance criteria:** Same outline/material policy as future wash/road maps; empty of reusable hero vehicles/characters in the plate.

---

## D. UI / Rewards (baseline-coupled)

| Asset ID | Role | Res | Transparent | States | Notes |
|---|---|---|---|---|---|
| ASSET_UI_BTN_PRIMARY | Primary CTA | 512×160 | yes | default, pressed, disabled | Design system; no emoji |
| ASSET_UI_ICON_HOME | Nav | 256×256 | yes | default | Line/toy icon style |
| ASSET_UI_ICON_GARAGE | Nav / workshop | 256×256 | yes | default | — |
| ASSET_REWARD_STAR | Mission reward | 256×256 | yes | empty, earned, sparkle | Not Unicode ★ |
| ASSET_EFFECT_FIRE | Mission target | 512×512 | yes | burn, extinguish | Not CSS flame |

---

## E. Explicitly out of scope until triad PASS

세차장 / 정비소 / 도로 맵 / 타 차량 세트 — **do not author** until  
SSUKSSUK_CHARACTER + FIRE_TRUCK_01 + CAR_WORKSHOP are Quality-Gate APPROVED.
