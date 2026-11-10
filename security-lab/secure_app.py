"""✅ vulnerable_app.py와 같은 기능을 안전하게 고친 서버입니다.

고친 내용 (vulnerable_app.py와 비교해 보세요):
  1. 입력은 '?' 자리에 따로 넣기 (매개변수 쿼리) → SQL 인젝션 차단
  2. 허용된 글자만 받기 (입력 검사)
  3. 비밀번호는 소금 + 해시로 저장하고 비교 → 유출되어도 원래 값을 알기 어려움
  4. 실패가 여러 번이면 잠시 차단 (요청 제한) → 무차별 대입 방어
  5. 오류 메시지는 짧게, 자세한 내용은 기록(로그)에만 남김
  6. 응답에 보안 헤더 추가

실행: python secure_app.py --port 8002
"""
import argparse
import re
import sqlite3
import threading
import time
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from common import DATA_DIR, reset_database, verify_password, write_log

DB_PATH = DATA_DIR / "secure.db"
LOG_PATH = DATA_DIR / "secure.log"

MAX_FAILURES = 5          # 이 횟수만큼 실패하면
WINDOW_SECONDS = 300      # 5분 동안 로그인을 막습니다.
USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{1,32}$")
SEARCH_RE = re.compile(r"^[A-Za-z0-9_]{0,32}$")
MAX_PASSWORD_LEN = 128


class RateLimiter:
    """IP별로 최근 실패 기록을 세고, 기준을 넘으면 차단합니다."""

    def __init__(self, limit: int, window: int):
        self.limit = limit
        self.window = window
        self.failures = defaultdict(deque)
        self.lock = threading.Lock()

    def _prune(self, key, now):
        q = self.failures[key]
        while q and now - q[0] > self.window:
            q.popleft()
        return q

    def is_blocked(self, key) -> bool:
        with self.lock:
            return len(self._prune(key, time.time())) >= self.limit

    def record_failure(self, key) -> None:
        with self.lock:
            self.failures[key].append(time.time())


class SecureHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _send(self, status: int, text: str) -> None:
        body = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")   # 브라우저가 멋대로 해석하지 않게
        self.send_header("Cache-Control", "no-store")            # 민감한 응답을 저장하지 않게
        self.end_headers()
        self.wfile.write(body)

    def _params(self):
        url = urlparse(self.path)
        params = parse_qs(url.query)
        if self.command == "POST":
            length = min(int(self.headers.get("Content-Length", 0)), 4096)  # 너무 큰 입력 차단
            params.update(parse_qs(self.rfile.read(length).decode("utf-8", "replace")))
        return url.path, params

    @staticmethod
    def _get(params, name: str) -> str:
        return params.get(name, [""])[0]

    def do_GET(self):
        self._route()

    def do_POST(self):
        self._route()

    def _route(self):
        path, params = self._params()
        ip = self.client_address[0]
        conn = sqlite3.connect(self.server.db_path)
        try:
            if path == "/login" and self.command == "POST":
                self._login(conn, params, ip)
            elif path == "/search" and self.command == "GET":
                self._search(conn, params, ip)
            else:
                self._send(200, "보안 서버입니다.\nPOST /login  (username, password)\nGET  /search?q=검색어\n")
        except sqlite3.Error:
            # 자세한 오류는 숨기고, 기록에만 남깁니다.
            write_log(self.server.log_path, ip=ip, path=path, status=500)
            self._send(500, "서버 오류가 발생했습니다.\n")
        finally:
            conn.close()

    def _login(self, conn, params, ip):
        username = self._get(params, "username")
        password = self._get(params, "password")

        if self.server.limiter.is_blocked(ip):
            write_log(self.server.log_path, ip=ip, path="/login", status=429)
            self._send(429, "로그인 실패가 너무 많습니다. 잠시 후 다시 시도하세요.\n")
            return

        if not USERNAME_RE.match(username) or len(password) > MAX_PASSWORD_LEN:
            self.server.limiter.record_failure(ip)
            write_log(self.server.log_path, ip=ip, path="/login", status=400, username=username)
            self._send(400, "입력 형식이 올바르지 않습니다.\n")
            return

        # ✅ 입력은 '?' 자리에 따로 넣습니다. 글자는 절대 명령어가 되지 않아요.
        row = conn.execute(
            "SELECT id, username, role, password FROM users WHERE username = ?",
            (username,),
        ).fetchone()

        if row and verify_password(password, row[3]):
            write_log(self.server.log_path, ip=ip, path="/login", status=200, username=username)
            self._send(200, f"로그인 성공! id={row[0]}, username={row[1]}, role={row[2]}\n")
            return

        self.server.limiter.record_failure(ip)
        write_log(self.server.log_path, ip=ip, path="/login", status=401, username=username)
        # ✅ 아이디가 틀렸는지, 비밀번호가 틀렸는지 알려주지 않습니다.
        self._send(401, "아이디 또는 비밀번호가 올바르지 않습니다.\n")

    def _search(self, conn, params, ip):
        raw_q = self._get(params, "q")

        # ✅ 허용된 글자만 받습니다 (영문, 숫자, _ , 최대 32자).
        if not SEARCH_RE.match(raw_q):
            write_log(self.server.log_path, ip=ip, path="/search", status=400, q=raw_q[:200])
            self._send(400, "검색어는 영문, 숫자, _ 만 쓸 수 있어요.\n")
            return

        # ✅ 매개변수 쿼리 + 비밀번호 열은 아예 꺼내지 않습니다.
        rows = conn.execute(
            "SELECT username, role FROM users WHERE username LIKE ?",
            (f"%{raw_q}%",),
        ).fetchall()
        write_log(self.server.log_path, ip=ip, path="/search", status=200, q=raw_q[:200])
        text = "\n".join(f"{name} ({value})" for name, value in rows) or "결과 없음"
        self._send(200, text + "\n")


def make_server(port: int, db_path: Path, log_path: Path, host: str = "127.0.0.1") -> ThreadingHTTPServer:
    reset_database(db_path, hashed=True)  # ✅ 비밀번호는 해시로 저장
    if log_path.exists():
        log_path.unlink()
    server = ThreadingHTTPServer((host, port), SecureHandler)
    server.db_path = db_path
    server.log_path = log_path
    server.limiter = RateLimiter(MAX_FAILURES, WINDOW_SECONDS)
    return server


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="안전하게 만든 실습 서버 (127.0.0.1 전용)")
    parser.add_argument("--port", type=int, default=8002)
    parser.add_argument("--host", default="127.0.0.1",
                        help="기본은 내 컴퓨터만(127.0.0.1). 두 대 실습 때만 0.0.0.0 사용")
    args = parser.parse_args()

    server = make_server(args.port, DB_PATH, LOG_PATH, host=args.host)
    print(f"[보안 서버] http://{args.host}:{args.port} 실행 중 (Ctrl+C로 종료)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n종료합니다.")
    finally:
        server.server_close()
