# External Production Art — Import Drop Zone

`ASSET_DELIVERY_MODE = EXTERNAL_PRODUCTION_ART`  
`ASSET_PROVIDER_STATUS = NOT_CONFIGURED` (unchanged)

## Absolute drop path (Cloud Agent VM)

```text
/workspace/ssukssuk-playground/incoming/external-production/
```

**Note:** Chat image attachments do **not** appear on this VM disk. Place real PNG bytes at the paths below (git LFS, `scp`, workspace file upload, or commit to a delivery branch), then ask the agent to run the gate.

Correct folder spelling: `ssukssuk-playground` (not `sukssuk-playground`).

## Drop these three masters first (exact filenames)

1. `SSUKSSUK_CHARACTER_BASE.png` — character only, transparent RGBA  
2. `FIRE_TRUCK_01_MASTER.png` — firetruck only, transparent RGBA (independent master; **never** crop Style Master / composite sheets)  
3. `CAR_WORKSHOP_MASTER.png` — workshop only (opaque OK; independent master; **never** crop sheets)

## Then run Quality Gate

```bash
cd /workspace/ssukssuk-playground
npm run assets:gate
```

Reports → `incoming/external-production/reports/`

**Receipt ≠ APPROVED.** Human visual DNA review still required.

After all three masters pass structural + human DNA review:

```bash
npm run assets:stage
npm run assets:approve-baseline -- --i-reviewed-dna
```

This writes `BASELINE_VISUAL_APPROVED` and unlocks acceptance of FIRETRUCK_* part PNGs.

## Part filenames (after baseline approved)

See `DELIVERY_CONTRACT.json` → `firetruckPartsAfterBaselineApproved`.
All parts: transparent PNG; assembled result must match `FIRE_TRUCK_01_MASTER`.
