import argparse
import asyncio
import json
import time

try:
    import websockets
except ImportError as e:
    raise SystemExit(
        "필요 패키지가 없습니다. 로컬 테스트용으로 `pip install websockets` 후 실행하세요."
    ) from e


async def handler(websocket):
    async def send_heartbeat():
        while True:
            await asyncio.sleep(5)
            try:
                msg = {"type": "heartbeat", "timestamp": int(time.time() * 1000)}
                await websocket.send(json.dumps(msg))
            except Exception:
                return

    hb_task = asyncio.create_task(send_heartbeat())
    try:
        async for raw in websocket:
            try:
                msg = json.loads(raw)
            except Exception:
                continue

            mtype = msg.get("type")
            if mtype == "auto_bet_cmd":
                # 안전 구조: ACK만 반환(실제 클릭/자동 입력은 하지 않음)
                resp = {
                    "type": "auto_bet_result",
                    "timestamp": int(time.time() * 1000),
                    "ok": True,
                    "message": "stub-ack",
                }
                try:
                    await websocket.send(json.dumps(resp))
                except Exception:
                    pass
            # round_result / balance_snapshot 등은 본 스텁에서 임의 생성하지 않습니다.
            # 실제 데이터는 외부 소스로부터 전달되어야 합니다.
    finally:
        hb_task.cancel()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    async def run():
        async with websockets.serve(handler, args.host, args.port):
            print(f"[nexus_scanner stub] ws://{args.host}:{args.port}")
            await asyncio.Future()

    asyncio.run(run())


if __name__ == "__main__":
    main()

