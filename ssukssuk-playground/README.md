# 쑥쑥놀이터 NEW · 자동차 공방

Style-reference–driven kids workshop app. First production vehicle: **소방차 (firetruck)**.

## Principle

`REFERENCE IMAGE IS NOT A GAME ASSET.`

All playable graphics are independent production assets. Missing content is shown as **Asset Required**.

## Pipeline (firetruck)

1. **선택** — only firetruck is READY; other vehicles are Asset Required  
2. **조립** — drag individual parts onto chassis slots  
3. **색칠** — paint body / door / wheels / ladder independently (not whole-car hue)  
4. **운전** — Vehicle Entity drag move + wheel spin  
5. **미션** — drive to the fire with siren  
6. **보상** — stars + celebrate animation  

## Run

```bash
cd ssukssuk-playground
npm install
npm run dev
```

```bash
npm test
npm run build
```

## Structure

```
src/assets/vehicles/firetruck/   # production part renderers + manifest
src/entity/                      # Vehicle Entity factory + ops
src/components/                  # renderer, stage bar, Asset Required
public/assets/                   # asset slots / docs for future packs
docs/ASSET_POLICY.md
```
