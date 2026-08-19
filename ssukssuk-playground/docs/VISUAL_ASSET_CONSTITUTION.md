# 쑥쑥놀이터 NEW — VISUAL ASSET CONSTITUTION V1

이 규칙은 쑥쑥놀이터 NEW 프로젝트의 **모든 개발 작업보다 우선**하는 그래픽 제작 규칙이다.

첨부 Visual Bible 이미지는 **STYLE REFERENCE ONLY**이다.  
캐릭터·자동차·건물·버튼·배경을 잘라 실제 앱에 사용하는 것을 **절대 금지**한다.

## 1. 절대 금지

최종 제품 그래픽으로 사용 금지:

- Emoji / Unicode pictogram
- 임시 SVG 그림
- CSS로 만든 가짜 캐릭터·자동차
- 단색 사각형 placeholder
- 외부 무료 아이콘 임의 혼합
- 스크린샷 crop / Visual Bible crop
- AI 이미지 일부를 잘라 UI 요소로 사용
- 한 장짜리 자동차 + 색상 필터(hue)만으로 색칠
- 서로 다른 화풍 혼합
- 저해상도 확대
- 이미지 부재를 이유로 한 임의 그림 삽입

Emoji(예: 소방차·자동차·별)는 개발 화면에서도 실제 게임 오브젝트 대신 사용하지 않는다.

## 2. Visual Bible의 역할

참고만 허용: 색감, 밝기, 캐릭터 비율, 둥근 형태, 친근한 표정, 자동차 디자인 방향, 배경 밀도, UI 부드러움, 어린이 분위기, 세계관 통일성.

**REFERENCE ≠ ASSET**

## 3. Production Asset은 독립 제작

`characters/`, `vehicles/`, `buildings/`, `environment/`, `props/`, `ui/`, `effects/`, `stickers/`, `rewards/`  
각 에셋은 명확한 ID와 용도를 가진다.

## 4. 캐릭터 규칙

쑥쑥이는 하나의 Character Bible을 따른다.  
최소 상태: idle, walk, run, point, thinking, happy, surprised, encourage, sad, celebrate, wave  
상태가 달라도 동일 캐릭터로 보여야 한다. 장면마다 재생성 금지.

## 5. 자동차 규칙

한 장짜리 그림 금지. 예: `FIRE_TRUCK_01` 파츠 분리  
(body, doors, wheels, rims, windows, bumper, ladder, lights, hose, shadow 등)  
파츠별 이동·회전·스케일·색상·조립·애니메이션·충돌 가능해야 한다.

## 6. 색칠 시스템

차량 전체 CSS filter / hue rotation 금지.  
영역 단위 색 상태(BODY, DOOR, RIM …).  
아이 디자인은 저장되어 운전·미션에 동일하게 사용된다.

## 7. 배경

공방·세차장·정비소·도로·마을의 perspective / lighting / saturation / shape language / material / outline 정책을 통일한다.  
배경 속 자동차·캐릭터 crop 재사용 금지.

## 8. UI

단일 Design System. 큰 터치 영역, 둥근 형태, 눌림 상태, 구분 가능한 아이콘, 동일 그림자·입체감·화풍.  
아이콘 필요 시 Emoji 사용 금지.

## 9. Asset Registry

모든 그래픽은 중앙 Registry로만 참조한다.  
코드에 임의 이미지 경로 하드코딩 금지.

## 10. Asset이 없는 경우

임시 그림으로 최종 구현하지 않는다. 상태 = `ASSET_REQUIRED`.  
필요 Asset / 사용 위치 / 크기 / 투명 배경 / 파츠 구조 / 상태 / 애니메이션 요구를 기록한다.  
이미지 생성 시스템이 없으면 임의 대체 그래픽을 만들지 않는다.

## 11. Asset Quality Gate

화풍·비율·해상도·투명 배경·흰 테두리·파츠 경계·모바일 선명도·색칠 영역 분리·애니메이션 연결부 —  
하나라도 실패하면 Production 승인 금지.

## 12. 첫 번째 기준 Asset

한꺼번에 제작하지 않는다. 먼저 확정:

1. 쑥쑥이  
2. `FIRE_TRUCK_01`  
3. 자동차 공방  

승인 후에만 굴착기·덤프·구급차·경찰차·크레인 등으로 확장한다.

## 최상위 원칙

**그래픽이 준비되지 않았으면, 없는 상태가 잘못된 그래픽보다 낫다.**

목표는 Prototype처럼 보이는 웹페이지가 아니라  
App Store / Google Play 판매 가능한 상용 어린이 앱 Visual System이다.
