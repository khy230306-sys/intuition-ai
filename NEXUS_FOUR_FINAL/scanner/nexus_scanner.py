#!/usr/bin/env python3
"""NEXUS FOUR FINAL - 로컬 WebSocket 스캐너 (연동 테스트용)

역할:
- 앱(WebSocket 클라이언트)과 프로토콜 연동
- --simulate 시 테스트용 round_result / balance_snapshot 송신
- 실제 카지노 사이트 자동 로그인은 하지 않음 (약관/보안 제외)

사용:
  python3 scanner/nexus_scanner.py --port 8765 --simulate
"""

from __future__ import annotations

import argparse
import asyncio
import json
import random
import time
from typing import Any, Set

try:
    import websockets
    from websockets.server import WebSocketServerProtocol
except ImportError as e:
    raise SystemExit(
        "필요 패키지가 없습니다. `pip3 install --user websockets` 후 실행하세요."
    ) from e


CLIENTS: Set[Any] = set()


def now_ms() -> int:
    return int(time.time() * 1000)


async def broadcast(msg: dict) -> None:
    dead = []
    raw = json.dumps(msg, ensure_ascii=False)
    for ws in list(CLIENTS):
        try:
            await ws.send(raw)
        except Exception:
            dead.append(ws)
    for ws in dead:
        CLIENTS.discard(ws)


async def handler(websocket: WebSocketServerProtocol) -> None:
    CLIENTS.add(websocket)
    table_id = "LOCAL"
    await websocket.send(
        json.dumps(
            {
                "type": "scanner_status",
                "tableId": table_id,
                "status": "CONNECTED",
                "timestamp": now_ms(),
            },
            ensure_ascii=False,
        )
    )

    try:
        async for raw in websocket:
            try:
                msg = json.loads(raw)
            except Exception:
                continue

            mtype = msg.get("type")
            if mtype == "heartbeat":
                await websocket.send(
                    json.dumps({"type": "heartbeat", "timestamp": now_ms()}, ensure_ascii=False)
                )
            elif mtype == "auto_bet_cmd":
                # 실제 클릭은 하지 않고 ACK만 반환 (안전 구조)
                await websocket.send(
                    json.dumps(
                        {
                            "type": "auto_bet_result",
                            "tableId": msg.get("tableId", table_id),
                            "timestamp": now_ms(),
                            "ok": True,
                            "message": "stub-ack (실제 사이트 클릭 없음)",
                        },
                        ensure_ascii=False,
                    )
                )
            elif mtype == "subscribe":
                table_id = str(msg.get("tableId") or table_id)
                await websocket.send(
                    json.dumps(
                        {
                            "type": "table_changed",
                            "tableId": table_id,
                            "timestamp": now_ms(),
                        },
                        ensure_ascii=False,
                    )
                )
    finally:
        CLIENTS.discard(websocket)


async def simulate_loop(table_id: str, interval_sec: float) -> None:
    """테스트용 라운드/밸런스 데이터를 주기적으로 브로드캐스트."""
    round_id = 0
    round_index = 0
    while True:
        await asyncio.sleep(interval_sec)
        if not CLIENTS:
            continue

        round_id += 1
        round_index += 1
        open_at = now_ms()
        close_at = open_at + int(interval_sec * 700)

        await broadcast(
            {
                "type": "betting_open",
                "tableId": table_id,
                "timestamp": open_at,
            }
        )

        # 배팅 구간 중 밸런스 스냅샷 몇 개
        player = random.randint(8000, 40000)
        banker = random.randint(8000, 40000)
        for i in range(3):
            player += random.randint(-1500, 2500)
            banker += random.randint(-1500, 2500)
            await broadcast(
                {
                    "type": "balance_snapshot",
                    "tableId": table_id,
                    "roundIndex": round_index,
                    "timestamp": now_ms(),
                    "playerTotal": max(0, player),
                    "bankerTotal": max(0, banker),
                    "tieTotal": random.randint(100, 2000),
                    "meta": {
                        "source": "simulate",
                        "trustScore": 0.4,
                        "bettingOpenAt": open_at,
                        "bettingCloseAt": close_at,
                        "note": "테스트 데이터(실제 사이트 금액 아님)",
                    },
                }
            )
            await asyncio.sleep(interval_sec / 6)

        await broadcast(
            {
                "type": "betting_closed",
                "tableId": table_id,
                "timestamp": close_at,
            }
        )

        result = random.choices(["PLAYER", "BANKER", "TIE"], weights=[45, 45, 10], k=1)[0]
        await broadcast(
            {
                "type": "round_result",
                "tableId": table_id,
                "roundId": round_id,
                "roundIndex": round_index,
                "timestamp": now_ms(),
                "result": result,
            }
        )


async def main_async(args: argparse.Namespace) -> None:
    async with websockets.serve(handler, args.host, args.port, ping_interval=20, ping_timeout=20):
        print(f"[nexus_scanner] ws://{args.host}:{args.port}")
        print(f"[nexus_scanner] simulate={args.simulate} tableId={args.table_id}")
        tasks = []
        if args.simulate:
            tasks.append(asyncio.create_task(simulate_loop(args.table_id, args.interval)))
        if tasks:
            await asyncio.gather(*tasks)
        else:
            await asyncio.Future()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--table-id", default="LOCAL")
    parser.add_argument("--simulate", action="store_true", help="테스트용 라운드 자동 송신")
    parser.add_argument("--interval", type=float, default=8.0, help="시뮬레이션 라운드 간격(초)")
    args = parser.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
