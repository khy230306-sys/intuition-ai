# HOME v2 Default Migration

**Version:** 1.15.4  
**Status:** HOME v2 is the default home for new / unset preferences.

## Behavior

| Case | Result |
|------|--------|
| No stored preference | **HOME v2** |
| `?home=v2` | HOME v2 |
| `?home=legacy` | Legacy home |
| Stored `legacy` | Legacy (respected) |
| Stored `v2` | HOME v2 |
| Boot default unset | v2 |
| Boot default `legacy` | Legacy |

## Preservation

- `renderChat()` and the classic home widget remain in the codebase.
- Users can switch anytime: Settings → **홈 화면 · 디자인 전환**, or chrome buttons, or `?home=legacy`.

## Fallback

If HOME v2 render throws:

1. Preference forced to `legacy` for this device  
2. Flash: “새 홈 화면을 불러오지 못해 기존 홈으로 전환했습니다.”  
3. Error code recorded via diagnostics (`home_v2_fallback:…`) without PII  

## Recovery

1. Open `/?home=legacy`  
2. Or Settings → 기존 홈 보기  
3. Or reset home prefs (초기화) then set boot default  

## Production

Code defaults to v2, but this agent run does **not** execute `deploy:web`. Production domain remains unchanged until the user explicitly promotes a Preview.
