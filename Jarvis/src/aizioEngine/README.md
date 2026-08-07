# AIZIO Core Engine V1.2

Orchestrates **REAL** tools with Provider Registry, structured context, ToolResult, verification, and permissions.

## Loop

`의도 분류 → Session Context → Permission → Provider Registry → ToolResult → Verifier → Reply`

## V1 success criteria (unchanged)

1. Weather (Open-Meteo)  
2. Family places via PlacesProvider (no curated / DEMO)  
3. Ordinal / anaphora select  
4. Calendar write + re-read verify (Local or External)

## Provider Registry

| Interface | Implementations | Availability |
|-----------|-----------------|--------------|
| WeatherProvider | Open-Meteo | READY |
| PlacesProvider | Google Places (key), Photon (no key) | READY / PENDING_EXTERNAL_SETUP |
| CalendarProvider | AIZIO Local, Google Calendar (OAuth) | Local READY; External PENDING until OAuth |

Test doubles (`isTestDouble`) are blocked on Production execution paths.

## REAL Places rules

Requires external provider response + `providerPlaceId` + geo/address + `fetchedAt` + `rawSourceAvailable`.  
`name + mapsQuery + rank` alone is never REAL. Curated/demo/catalog rejected.

## Calendar copy

- Local: 「AIZIO 내부 일정에 저장했습니다」  
- External (verified): 「Google Calendar에 등록했습니다」  
- No connector: 「외부 캘린더가 아직 연결되지 않았습니다」

## Permission

- **0** read/search — weather, places  
- **1** local write — AIZIO 내부 일정  
- **2** external write — only when connector READY  
- **3** sensitive — never without confirm + connector  

## Non-goals

Own LLM · Gmail · flight/hotel booking · payments · UI redesign  
