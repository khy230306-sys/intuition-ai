"""[방어 실습] 로그 감시 도구: 서버 기록(로그)을 읽고 공격 흔적을 찾아 경고합니다.

탐지 규칙 (2가지):
  1. 무차별 대입 의심: 한 IP가 로그인에 5번 이상 실패
  2. SQL 인젝션 의심: 입력에 따옴표(')나 주석(--), UNION, 'OR 1=1' 같은 모양이 있음

사용법:
  python log_monitor.py data/vulnerable.log   # 공격당한 기록 분석
  python log_monitor.py data/secure.log       # 보안 서버 기록 분석

종료 코드: 경고가 있으면 1, 없으면 0 (자동화에 쓰기 좋아요).
"""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

FAILED_LOGIN_THRESHOLD = 5
SQLI_PATTERN = re.compile(
    r"(')|(--)|(\bunion\b)|(\bor\b\s+'?\d'?\s*=\s*'?\d)",
    re.IGNORECASE,
)


def load_events(path: Path) -> list[dict]:
    events = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            print(f"  (경고) {number}번째 줄은 읽을 수 없어서 건너뜁니다.")
    return events


def analyze(events: list[dict]) -> list[str]:
    alerts: list[str] = []
    failed_logins: Counter = Counter()
    blocked: Counter = Counter()

    for e in events:
        ip = e.get("ip", "?")
        if e.get("path") == "/login" and e.get("status") == 401:
            failed_logins[ip] += 1
        if e.get("status") == 429:
            blocked[ip] += 1

        # 사용자가 보낸 글자 중 의심스러운 모양이 있는지 살펴봅니다.
        typed = " ".join(str(e.get(key, "")) for key in ("username", "q"))
        if typed.strip() and SQLI_PATTERN.search(typed):
            alerts.append(f"[SQL 인젝션 의심] ip={ip} 입력={typed.strip()!r} 상태={e.get('status')}")

    for ip, count in failed_logins.items():
        if count >= FAILED_LOGIN_THRESHOLD:
            alerts.append(f"[무차별 대입 의심] ip={ip} 로그인 실패 {count}회")

    for ip, count in blocked.items():
        alerts.append(f"[차단 발생] ip={ip} 요청 {count}회가 차단됨 (방어 작동)")

    return alerts


def main() -> None:
    parser = argparse.ArgumentParser(description="로그 감시 도구 (방어 실습)")
    parser.add_argument("log", type=Path, help="분석할 로그 파일 (JSON 줄 형식)")
    args = parser.parse_args()

    if not args.log.exists():
        sys.exit(f"로그 파일이 없어요: {args.log}  (먼저 서버를 켜고 공격해 보세요)")

    events = load_events(args.log)
    print(f"📄 {args.log} 에서 {len(events)}개의 기록을 읽었어요.")

    alerts = analyze(events)
    if not alerts:
        print("✅ 이상 징후가 없어요.")
        sys.exit(0)

    print(f"🚨 경고 {len(alerts)}건:")
    for alert in alerts:
        print(f"  - {alert}")
    sys.exit(1)


if __name__ == "__main__":
    main()
