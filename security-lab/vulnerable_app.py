"""⚠️ 일부러 취약하게 만든 연습용 서버입니다.

- 127.0.0.1(내 컴퓨터)에서만 실행됩니다.
- 인터넷에 공개하거나 남의 서버에 쓰면 안 돼요.
- 코드 안의 '❌ 취약점 #번호' 주석을 찾아보세요. 공부의 시작점입니다.

실행: python vulnerable_app.py --port 8001
"""
import argparse
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from common import DATA_DIR, reset_database, write_log

DB_PATH = DATA_DIR / "vulnerable.db"
LOG_PATH = DATA_DIR / "vulnerable.log"


class VulnerableHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):  # 기본 콘솔 로그는 끕니다 (우리가 직접 기록)
        pass

    def _send(self, status: int, text: str) -> None:
        body = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _params(self):
        url = urlparse(self.path)
        params = parse_qs(url.query)
        if self.command == "POST":
            length = int(self.headers.get("Content-Length", 0))
            params.update(parse_qs(self.rfile.read(length).decode("utf-8")))
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
                self._send(
                    200,
                    "취약한 연습 서버입니다.\n"
                    "POST /login  (username, password)\n"
                    "GET  /search?q=검색어\n",
                )
        finally:
            conn.close()

    def _login(self, conn, params, ip):
        username = self._get(params, "username")
        password = self._get(params, "password")

        # ❌ 취약점 #1 (SQL 인젝션): 사용자가 쓴 글자를 SQL 문장에 그대로 이어 붙입니다.
        query = (
            "SELECT id, username, role FROM users "
            f"WHERE username = '{username}' AND password = '{password}'"
        )
        try:
            row = conn.execute(query).fetchone()
        except sqlite3.Error as e:
            # ❌ 취약점 #2 (정보 노출): 오류 메시지에 SQL 문장 전체를 보여 줍니다.
            write_log(self.server.log_path, ip=ip, path="/login", status=500, username=username)
            self._send(500, f"데이터베이스 오류: {e}\n실행된 SQL: {query}\n")
            return

        if row:
            write_log(self.server.log_path, ip=ip, path="/login", status=200, username=username)
            self._send(200, f"로그인 성공! id={row[0]}, username={row[1]}, role={row[2]}\n")
        else:
            # ❌ 취약점 #3 (무제한 시도): 실패가 몇 번이든 계속 시도하게 둡니다.
            write_log(self.server.log_path, ip=ip, path="/login", status=401, username=username)
            self._send(401, "로그인 실패\n")

    def _search(self, conn, params, ip):
        q = self._get(params, "q")

        # ❌ 취약점 #1 (SQL 인젝션): 검색어도 SQL에 그대로 이어 붙입니다.
        query = f"SELECT username, role FROM users WHERE username LIKE '%{q}%'"
        try:
            rows = conn.execute(query).fetchall()
        except sqlite3.Error as e:
            write_log(self.server.log_path, ip=ip, path="/search", status=500, q=q)
            self._send(500, f"데이터베이스 오류: {e}\n실행된 SQL: {query}\n")
            return

        write_log(self.server.log_path, ip=ip, path="/search", status=200, q=q)
        text = "\n".join(f"{name} ({value})" for name, value in rows) or "결과 없음"
        self._send(200, text + "\n")


def make_server(port: int, db_path: Path, log_path: Path) -> ThreadingHTTPServer:
    reset_database(db_path, hashed=False)  # ❌ 취약점 #4: 비밀번호를 그대로 저장
    if log_path.exists():
        log_path.unlink()
    server = ThreadingHTTPServer(("127.0.0.1", port), VulnerableHandler)
    server.db_path = db_path
    server.log_path = log_path
    return server


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="취약한 연습 서버 (127.0.0.1 전용)")
    parser.add_argument("--port", type=int, default=8001)
    args = parser.parse_args()

    server = make_server(args.port, DB_PATH, LOG_PATH)
    print(f"[취약한 서버] http://127.0.0.1:{args.port} 실행 중 (Ctrl+C로 종료)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n종료합니다.")
    finally:
        server.server_close()
