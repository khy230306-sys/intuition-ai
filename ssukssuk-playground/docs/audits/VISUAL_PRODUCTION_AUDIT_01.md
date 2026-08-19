# Visual Production Audit — Production Prototype 01

**Date:** 2026-08-12  
**Scope:** `ssukssuk-playground` only  
**Rule:** VISUAL ASSET CONSTITUTION V1 supersedes tests/build green  
**No new features/vehicles added in this audit.**

---

## 1. Visual Asset Audit (render classification)

| Item | Actual render implementation | Classification |
|---|---|---|
| 쑥쑥이 | No bitmap/pose sheet. UI shows `<AssetRequired>` text panel from registry (`ASSET_SSUKSSUK_*`). Slots under `public/assets/characters/ssukssuk/*/.asset-required` only. | **ASSET_REQUIRED** |
| 소방차 body | No image file. Registry ID `ASSET_FIRETRUCK_BODY` status `ASSET_REQUIRED`. `VehicleRenderer` returns AssetRequired panel. Entity holds color string only in `createFiretruck.ts`. | **ASSET_REQUIRED** |
| door (front/rear) | Same — registry + entity state only; no graphic. | **ASSET_REQUIRED** |
| wheels | Same | **ASSET_REQUIRED** |
| rims | Same | **ASSET_REQUIRED** |
| windows | Same | **ASSET_REQUIRED** |
| bumper | Same | **ASSET_REQUIRED** |
| ladder | Same | **ASSET_REQUIRED** |
| emergency light | Same | **ASSET_REQUIRED** |
| hose | Same | **ASSET_REQUIRED** |
| 자동차 공방 배경 | No environment art. Page shell uses CSS gradients in `src/styles.css` `body` (sky/grass). Registry `ASSET_GARAGE_BACKGROUND` = ASSET_REQUIRED. | **ASSET_REQUIRED** (game bg) + **CSS_DRAWING** (app chrome gradient only) |
| 세차장 배경 | Not implemented (no route/stage/asset). | **ASSET_REQUIRED** |
| 정비소 배경 | Not implemented. | **ASSET_REQUIRED** |
| 도로/미션 배경 | Not implemented in current App (dead CSS classes `.drive-canvas` remain unused). | **ASSET_REQUIRED** |
| UI buttons | HTML `<button>` + CSS gradients/shadows (`.btn`, `.btn.ghost`, stage chips). No button art in registry as APPROVED. `ASSET_UI_BTN_PRIMARY` = ASSET_REQUIRED. | **CSS_DRAWING** (chrome) / **ASSET_REQUIRED** (production UI art) |
| UI icons | No icon bitmaps. Stage numbers are text. `ASSET_UI_ICON_*` = ASSET_REQUIRED. | **ASSET_REQUIRED** |
| rewards | No star art. `ASSET_REWARD_STAR` / `ASSET_EFFECT_FIRE` = ASSET_REQUIRED panels. No ★ rendered in App. | **ASSET_REQUIRED** |

**None of the above are PRODUCTION_ASSET or GENERATED_PRODUCTION_ASSET.**

---

## 2. Forbidden implementation scan

| Check | Result | Location |
|---|---|---|
| Emoji / Unicode pictogram as game object | **None in runtime UI** | Mention of `★` only in docs/comments (`uiAndRewards.ts` forbids it) |
| Inline SVG game art | **None in React components** | Deleted prior `parts.tsx` |
| CSS shape cars/characters | **None active** | — |
| Canvas temp characters/cars | **None** | — |
| Placeholder rectangles as vehicles | **None as vehicle art**; AssetRequired panels use dashed CSS boxes as *status UI*, not vehicle art | `AssetRequired.tsx`, `.asset-required` |
| Temporary asset folders | Marker files only | `public/assets/**/.asset-required` |
| Screenshot / Visual Bible crop | **None found in repo** | No Visual Bible image file in `ssukssuk-playground` |
| External image URL for art | **None** | Fonts only: Google Fonts in `index.html` |
| Free icon packs | **None** | — |
| CSS filter / hue-rotate whole-car paint | **None** | `filter: drop-shadow(...)` leftover unused CSS only (`styles.css` ~502–506) — not vehicle hue |
| base64 embedded image | **None** | — |
| Single vehicle image as multi-object fake | **None** | Entity is part-structured; graphics missing |
| **Favicon SVG firetruck drawing** | **FOUND → neutralized in audit** | Was `public/favicon.svg` SVG firetruck drawing. Replaced with non-vehicle brand mark (circle) so no SVG car ships as chrome art. Still **not** a Production game asset. |

---

## 3. `createFiretruck.ts` focus

**Role:** Data factory for `VehicleEntity` (parts map, slot positions, assemble flags, paint region colors, mission/animation state, design export).

**Does NOT:**
- Register production bitmaps
- Draw SVG/Canvas/CSS vehicle art
- Load image files

**Verdict:** Keep as **logic/entity factory**.  
`assetStatus` is hard-coded `'ASSET_REQUIRED'`.  
Default hex colors are **data defaults**, not rendered graphics in current App.  
**Not a Production Asset source.**

---

## 4. Asset Registry inventory

Registry source: `src/assets/registry/*`  
`productionApproved` ≡ `status === 'APPROVED'` **and** real file at `path`.

**APPROVED with file: 0**  
**ASSET_REQUIRED entries: all registered IDs**

| assetId | source | file path | dimensions (spec) | format | transparent | parts / regions / states | productionApproved |
|---|---|---|---|---|---|---|---|
| ASSET_SSUKSSUK_IDLE … WAVE (11) | registry spec only | *(missing)* | 1024×1024 | *(none)* | yes | Character Bible states | **false** |
| ASSET_FIRETRUCK_BODY | registry | *(missing)* | 1024×640 | *(none)* | yes | FIRE_TRUCK_01 parts; paint BODY… | **false** |
| ASSET_FIRETRUCK_FRONT_DOOR | registry | *(missing)* | 512×512 | *(none)* | yes | DOOR region | **false** |
| ASSET_FIRETRUCK_REAR_DOOR | registry | *(missing)* | 512×512 | *(none)* | yes | DOOR | **false** |
| ASSET_FIRETRUCK_WHEEL_FRONT/REAR | registry | *(missing)* | 512×512 | *(none)* | yes | wheel spin states | **false** |
| ASSET_FIRETRUCK_RIM_FRONT/REAR | registry | *(missing)* | 384×384 | *(none)* | yes | RIM paint | **false** |
| ASSET_FIRETRUCK_WINDOW_FRONT/SIDE | registry | *(missing)* | 640×480 / 512×384 | *(none)* | yes | WINDOW | **false** |
| ASSET_FIRETRUCK_BUMPER | registry | *(missing)* | 640×256 | *(none)* | yes | BUMPER | **false** |
| ASSET_FIRETRUCK_LADDER | registry | *(missing)* | 1024×256 | *(none)* | yes | LADDER | **false** |
| ASSET_FIRETRUCK_EMERGENCY_LIGHT | registry | *(missing)* | 384×384 | *(none)* | yes | LIGHT / siren | **false** |
| ASSET_FIRETRUCK_HOSE | registry | *(missing)* | 512×512 | *(none)* | yes | HOSE | **false** |
| ASSET_FIRETRUCK_HEAD_LIGHT | registry | *(missing)* | 256×256 | *(none)* | yes | LIGHT | **false** |
| ASSET_FIRETRUCK_SHADOW | registry | *(missing)* | 1024×256 | *(none)* | yes | — | **false** |
| ASSET_GARAGE_BACKGROUND | registry | *(missing)* | 2048×1536 | *(none)* | no | day | **false** |
| ASSET_GARAGE_WORKBENCH | registry | *(missing)* | 1024×768 | *(none)* | yes | — | **false** |
| ASSET_GARAGE_TOOL_RACK | registry | *(missing)* | 768×1024 | *(none)* | yes | — | **false** |
| ASSET_UI_BTN_PRIMARY | registry | *(missing)* | 512×160 | *(none)* | yes | default/pressed/disabled | **false** |
| ASSET_UI_ICON_HOME / GARAGE | registry | *(missing)* | 256×256 | *(none)* | yes | — | **false** |
| ASSET_REWARD_STAR | registry | *(missing)* | 256×256 | *(none)* | yes | empty/earned/sparkle | **false** |
| ASSET_EFFECT_FIRE | registry | *(missing)* | 512×512 | *(none)* | yes | burn/extinguish | **false** |
| ASSET_*_SET (excavator/dump/ambulance/police/crane) | registry placeholders | *(missing)* | — | — | — | expansion blocked | **false** |

---

## 5. Visual Bible protection

- No Visual Bible image file present under `ssukssuk-playground/`.
- No `background-image` / `<img>` referencing bible/crop.
- App copy states Style Ref Only.

**Result: PASS (not reused as asset).**

---

## 6. Production Gate

| Gate | Judgment | Reason |
|---|---|---|
| SSUKSSUK_CHARACTER | **ASSET_REQUIRED** | Zero pose bitmaps; text gate only |
| FIRE_TRUCK_01 | **ASSET_REQUIRED** | Zero part bitmaps; entity logic only |
| CAR_WORKSHOP | **ASSET_REQUIRED** | No garage art; CSS page chrome ≠ workshop environment |

**VISUAL_PRODUCTION_GATE = BLOCKED**

(Unit/e2e green ≠ visual PASS.)

---

## 7. Screen readiness (Prototype 01 runtime)

| Screen | Runnable now? | What user sees |
|---|---|---|
| 1. 자동차 공방 | Yes (shell) | Constitution banner + BaselineGate + ASSET_REQUIRED catalog |
| 2. 소방차 조립 | **No** | Blocked — no APPROVED parts |
| 3. 부분 색칠 | **No** | Blocked |
| 4. 세차 | **No** | Stage not implemented |
| 5. 정비 | **No** | Stage not implemented |
| 6. 운전 | **No** | Blocked / not mounted |
| 7. 화재 미션 | **No** | Blocked / not mounted |
| 8. 보상 | **No** | Blocked; reward art ASSET_REQUIRED |

---

## 8. Asset provider

**ASSET_PROVIDER_STATUS = NOT_CONFIGURED**

No image-generation API/provider wiring in `ssukssuk-playground` (no env keys, no provider module).  
Do not assume generation or fabricate outputs.
