import './styles.css'

const FIXED_URL = 'https://aizio-studio.shipstatic.com'

const root = document.getElementById('app')
if (!root) throw new Error('#app missing')

root.innerHTML = `
  <div class="shell">
    <header class="hero">
      <p class="eyebrow">AIZIO STUDIO</p>
      <h1 class="brand">아이지오 스튜디오</h1>
      <p class="lead">
        AIZIO 브랜드의 독립 스튜디오 앱입니다. 쑥쑥놀이터(어린이 자동차 공방)와는
        다른 제품입니다.
      </p>
      <div class="cta-row">
        <a class="btn primary" href="${FIXED_URL}">고정 주소 열기</a>
      </div>
    </header>

    <section class="panel">
      <h2>제품 분리</h2>
      <p>
        이전 작업에서 쑥쑥놀이터와 브랜드가 잘못 합쳐졌습니다. 이 앱은 아이지오 스튜디오만
        담당합니다.
      </p>
      <div class="sep-note">
        쑥쑥놀이터 NEW = <code>ssukssuk-playground</code><br />
        아이지오 스튜디오 = <code>aizio-studio</code> · ${FIXED_URL}
      </div>
    </section>

    <section class="panel">
      <h2>다음</h2>
      <p>
        스튜디오 기능 범위(도구/워크스페이스/모듈)를 이 폴더에서만 이어 갑니다.
        쑥쑥 공방·세차·정비 파이프라인은 쑥쑥놀이터 쪽에서만 유지합니다.
      </p>
    </section>

    <footer class="footer">
      <span>AIZIO STUDIO v0.1.0</span>
      <span>${FIXED_URL}</span>
    </footer>
  </div>
`
