"""공통 도구: 비밀번호 해시, 실습용 DB 만들기, 로그 기록.

외부 패키지 없이 Python 기본 기능만 사용합니다.
"""
import hashlib
import hmac
import json
import os
import sqlite3
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

# 해시를 몇 번 반복할지. 숫자가 클수록 공격자가 맞히기 어려워요.
PBKDF2_ITERATIONS = 200_000

# 실습용 계정. alice의 비밀번호는 일부러 약하게 만들었어요 (공격 실습 대상).
SEED_USERS = [
    ("alice", "sunshine", "user"),
    ("bob", "Tr0ub4dor-lab!", "user"),
    ("admin", "admin-lab-2026", "admin"),
]


def hash_password(password: str) -> str:
    """비밀번호를 '소금 + 지문(해시)' 형태로 바꿉니다. 원래 비밀번호는 저장하지 않아요."""
    salt = os.urandom(16)  # 사람마다 다른 소금
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    """입력한 비밀번호가 저장된 지문과 같은지 확인합니다."""
    try:
        _algo, iterations, salt_hex, digest_hex = stored.split("$")
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iterations)
    )
    # compare_digest: 글자가 몇 개 맞는지 시간차로 알아내지 못하게 비교합니다.
    return hmac.compare_digest(digest.hex(), digest_hex)


def reset_database(db_path: Path, hashed: bool) -> None:
    """실습 DB를 새로 만들고 계정을 넣습니다. hashed=False면 비밀번호를 그대로 저장합니다."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    if db_path.exists():
        db_path.unlink()
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            "CREATE TABLE users ("
            "id INTEGER PRIMARY KEY, "
            "username TEXT UNIQUE NOT NULL, "
            "password TEXT NOT NULL, "
            "role TEXT NOT NULL)"
        )
        for username, password, role in SEED_USERS:
            stored = hash_password(password) if hashed else password
            conn.execute(
                "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                (username, stored, role),
            )
        conn.commit()
    finally:
        conn.close()


def write_log(log_path: Path, **fields) -> None:
    """요청 기록을 한 줄씩(JSON) 파일에 남깁니다. 방어자의 '일기장'이에요."""
    log_path.parent.mkdir(parents=True, exist_ok=True)
    fields.setdefault("time", time.time())
    with log_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(fields, ensure_ascii=False) + "\n")
