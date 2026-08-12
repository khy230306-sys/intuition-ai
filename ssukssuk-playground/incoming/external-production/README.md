# External Production Art — Import Drop Zone

`ASSET_DELIVERY_MODE = EXTERNAL_PRODUCTION_ART`  
`ASSET_PROVIDER_STATUS = NOT_CONFIGURED` (unchanged)

## Drop these three masters first (exact filenames)

1. `SSUKSSUK_CHARACTER_BASE.png`
2. `FIRE_TRUCK_01_MASTER.png`
3. `CAR_WORKSHOP_MASTER.png`

Independent production artwork only. **Never** Style Master crops.

## Then run Quality Gate

```bash
cd ssukssuk-playground
npm run assets:gate
```

Reports → `incoming/external-production/reports/`

**Receipt ≠ APPROVED.** Human visual DNA review still required.

After all three masters pass structural + human gate:

```bash
npm run assets:approve-baseline
```

This writes `BASELINE_VISUAL_APPROVED` and unlocks acceptance of FIRETRUCK_* part PNGs.

## Part filenames (after baseline approved)

See `DELIVERY_CONTRACT.json` → `firetruckPartsAfterBaselineApproved`.
All parts: transparent PNG; assembled result must match `FIRE_TRUCK_01_MASTER`.
