# AIZIO Mobile Device Test Checklist

Cloud Agent cannot fully verify device OS behavior. Use this on real hardware after deploy.

## iPhone (Safari → 홈 화면 추가)

- [ ] Install PWA / open from home screen
- [ ] Version badge matches deployed build
- [ ] Mic permission allow / deny paths
- [ ] Voice → general chat (“고마워”)
- [ ] Voice → music prepare (gesture play)
- [ ] Voice → “오늘 10분 뒤 알려줘” reminder
- [ ] TTS speak when setting on
- [ ] Notification permission for chat / first reminder
- [ ] **App open** reminder fires near scheduled time
- [ ] **App closed** personal reminder — expect **미확인 / may not fire** without push server
- [ ] Keyboard does not cover composer
- [ ] Safe area (notch / home indicator)
- [ ] Offline: notes / reminders / relationships still work
- [ ] Relaunch: chat + relationships + reminders persist
- [ ] Settings: Hybrid AI key mask / save / delete

## Android (Chrome → 홈 화면 추가)

- Same checklist as iPhone
- [ ] External YouTube / music app open after play gesture
- [ ] Do not treat external open as confirmed in-app “playing”

## Provider (manual, with your keys)

- [ ] No key → local skills OK, free chat guides to settings
- [ ] OpenRouter connect test
- [ ] Bad key → invalid key message (not “quota”)
- [ ] Optional: Gemini / Groq fallback after forced free failure
- [ ] Paid auto-use remains off unless enabled
