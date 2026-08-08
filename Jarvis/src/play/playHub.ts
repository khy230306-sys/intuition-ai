/** AIZIO PLAY hub — featured games + classic arcade entry. */

export function renderPlayHub(opts: { appVersion: string; questCleared: number }): string {
  return `
    <section class="panel view-scroll play-hub">
      <h2 class="section-title">AIZIO PLAY</h2>
      <p class="hint">오프라인 게임 허브 · v${opts.appVersion}</p>

      <article class="play-feature-card" data-play-card="quest">
        <div class="play-feature-badge">OFFLINE PLAY</div>
        <h3>AIZIO QUEST</h3>
        <p class="hint">퍼즐 × RPG · Match-3 전투 · 성장 · 보스 · 완전 오프라인</p>
        <p class="hint">CHAPTER 1 진행 ${opts.questCleared}/19</p>
        <button type="button" class="primary-btn" data-action="open-aizio-quest">게임 시작</button>
        <button type="button" class="ghost-btn" data-action="prep-quest-offline">오프라인 게임 준비</button>
      </article>

      <article class="play-feature-card play-feature-secondary">
        <h3>클래식 아케이드</h3>
        <p class="hint">스페이스 · 플래피 · 벽돌깨기 · 스윽 · 스페이스2 · 지오대시</p>
        <button type="button" class="ghost-btn" data-action="open-classic-arcade">아케이드 열기</button>
      </article>
    </section>
  `
}
