"""실습 검증 테스트: 취약한 서버는 뚫리고, 보안 서버는 막히는지 자동으로 확인합니다.

실행: python -m unittest -v test_lab   (이 폴더에서)
"""
import tempfile
import threading
import unittest
from pathlib import Path

import log_monitor
import secure_app
import vulnerable_app
from attack_sqli import send
from common import hash_password, verify_password


def start(server):
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{server.server_address[1]}"


class PasswordHashTest(unittest.TestCase):
    def test_hash_roundtrip(self):
        stored = hash_password("correct horse")
        self.assertTrue(verify_password("correct horse", stored))
        self.assertFalse(verify_password("wrong", stored))

    def test_plaintext_not_stored(self):
        stored = hash_password("sunshine")
        self.assertNotIn("sunshine", stored)


class VulnerableServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp())
        cls.log = cls.tmp / "vuln.log"
        cls.server = vulnerable_app.make_server(0, cls.tmp / "vuln.db", cls.log)
        cls.base = start(cls.server)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def test_login_bypass_with_comment_trick(self):
        status, body = send(self.base, "POST", "/login",
                            data={"username": "admin' -- ", "password": "x"})
        self.assertEqual(status, 200)
        self.assertIn("로그인 성공", body)

    def test_union_leaks_passwords(self):
        status, body = send(self.base, "GET", "/search",
                            params={"q": "' UNION SELECT username, password FROM users --"})
        self.assertEqual(status, 200)
        self.assertIn("sunshine", body)  # 비밀번호가 그대로 보임

    def test_bruteforce_is_not_limited(self):
        for _ in range(6):
            status, _ = send(self.base, "POST", "/login",
                             data={"username": "bob", "password": "nope"})
            self.assertEqual(status, 401)  # 계속 시도해도 잠기지 않음

    def test_monitor_detects_attacks(self):
        events = log_monitor.load_events(self.log)
        alerts = log_monitor.analyze(events)
        self.assertTrue(any("SQL 인젝션" in a for a in alerts))
        self.assertTrue(any("무차별 대입" in a for a in alerts))


class SecureServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp())
        cls.server = secure_app.make_server(0, cls.tmp / "secure.db", cls.tmp / "secure.log")
        cls.base = start(cls.server)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def test_correct_login_works(self):
        status, body = send(self.base, "POST", "/login",
                            data={"username": "alice", "password": "sunshine"})
        self.assertEqual(status, 200)
        self.assertIn("로그인 성공", body)

    def test_login_bypass_blocked(self):
        status, body = send(self.base, "POST", "/login",
                            data={"username": "admin' -- ", "password": "x"})
        self.assertNotEqual(status, 200)

    def test_union_blocked_and_no_leak(self):
        status, body = send(self.base, "GET", "/search",
                            params={"q": "' UNION SELECT username, password FROM users --"})
        self.assertEqual(status, 400)
        self.assertNotIn("sunshine", body)


class RateLimitTest(unittest.TestCase):
    """요청 제한은 IP별 상태를 쓰므로, 다른 테스트와 섞이지 않게 따로 서버를 띄웁니다."""

    def test_rate_limit_blocks_after_five_failures(self):
        tmp = Path(tempfile.mkdtemp())
        log = tmp / "secure.log"
        server = secure_app.make_server(0, tmp / "secure.db", log)
        base = start(server)
        try:
            for _ in range(secure_app.MAX_FAILURES):
                status, _ = send(base, "POST", "/login",
                                 data={"username": "alice", "password": "wrong"})
                self.assertEqual(status, 401)

            # 맞는 비밀번호여도 차단되어야 합니다.
            status, _ = send(base, "POST", "/login",
                             data={"username": "alice", "password": "sunshine"})
            self.assertEqual(status, 429)

            alerts = log_monitor.analyze(log_monitor.load_events(log))
            self.assertTrue(any("차단 발생" in a for a in alerts))
        finally:
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    unittest.main()
