<template>
  <div class="about-view">
    <div class="about-container">
      <h1 class="about-title">遊戲規則</h1>
      
      <div class="rules-section">
        <h2 class="section-title">基本概念</h2>
        <p class="section-text">
          花牌（Hanafuda）是一種日本傳統紙牌遊戲，使用48張牌，分為12套，每套代表一個月份。
          「來來」（Koi-Koi）是花牌最受歡迎的玩法之一。
        </p>
      </div>

      <div class="rules-section">
        <h2 class="section-title">牌的種類</h2>
        <div class="card-types">
          <div class="card-type">
            <div class="type-icon bright">光</div>
            <div class="type-info">
              <h3>光札 (Hikari)</h3>
              <p>最高價值的牌，共5張，每張20點</p>
            </div>
          </div>
          <div class="card-type">
            <div class="type-icon animal">種</div>
            <div class="type-info">
              <h3>種札 (Tane)</h3>
              <p>動物圖案的牌，共9張，每張10點</p>
            </div>
          </div>
          <div class="card-type">
            <div class="type-icon ribbon">短</div>
            <div class="type-info">
              <h3>短冊 (Tan)</h3>
              <p>帶有詩句的牌，共10張，每張5點</p>
            </div>
          </div>
          <div class="card-type">
            <div class="type-icon plain">カス</div>
            <div class="type-info">
              <h3>カス札 (Kasu)</h3>
              <p>素牌，共24張，每張1點</p>
            </div>
          </div>
        </div>
      </div>

      <div class="rules-section">
        <h2 class="section-title">遊戲流程</h2>
        <ol class="game-flow">
          <li>雙方各分到8張手牌，場上放8張牌</li>
          <li>輪流出牌，與場上同月份的牌配對</li>
          <li>配對成功則拿取兩張牌</li>
          <li>從牌堆抽一張，同樣嘗試配對</li>
          <li>當有人形成役種時可選擇「來來」或結束</li>
        </ol>
      </div>

      <div class="rules-section">
        <h2 class="section-title">主要役種</h2>
        <div class="yaku-list">
          <div class="yaku-item">
            <span class="yaku-name">五光</span>
            <span class="yaku-points">10點</span>
            <span class="yaku-desc">收集全部5張光札</span>
          </div>
          <div class="yaku-item">
            <span class="yaku-name">四光</span>
            <span class="yaku-points">8點</span>
            <span class="yaku-desc">收集4張光札</span>
          </div>
          <div class="yaku-item">
            <span class="yaku-name">三光</span>
            <span class="yaku-points">5點</span>
            <span class="yaku-desc">收集3張光札</span>
          </div>
          <div class="yaku-item">
            <span class="yaku-name">猪鹿蝶</span>
            <span class="yaku-points">5點</span>
            <span class="yaku-desc">收集萩・紅葉・牡丹的種札</span>
          </div>
          <div class="yaku-item">
            <span class="yaku-name">赤短</span>
            <span class="yaku-points">5點</span>
            <span class="yaku-desc">收集松・梅・櫻的短冊</span>
          </div>
        </div>
      </div>

      <div class="rules-section">
        <h2 class="section-title">「來來」策略</h2>
        <p class="section-text">
          當你形成役種時，可以選擇：
        </p>
        <ul class="strategy-list">
          <li><strong>結束遊戲</strong>：立即獲得當前分數</li>
          <li><strong>宣告「來來」</strong>：繼續遊戲，目標是獲得更多役種，但風險是對手可能逆轉</li>
        </ul>
        <p class="section-text">
          「來來」宣告後，如果最終獲勝，分數會翻倍！
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.about-view {
  min-height: calc(100vh - 80px);
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  padding: 2rem;
}

.about-container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 1rem;
  padding: 3rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.about-title {
  font-size: 2.5rem;
  font-weight: bold;
  color: #1f2937;
  text-align: center;
  margin-bottom: 3rem;
  border-bottom: 3px solid #3b82f6;
  padding-bottom: 1rem;
}

.rules-section {
  margin-bottom: 3rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
  border-left: 4px solid #3b82f6;
  padding-left: 1rem;
}

.section-text {
  color: #4b5563;
  line-height: 1.8;
  margin-bottom: 1rem;
}

.card-types {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.card-type {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.type-icon {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  font-weight: bold;
  font-size: 1.25rem;
  color: white;
}

.type-icon.bright {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
}

.type-icon.animal {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
}

.type-icon.ribbon {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.type-icon.plain {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
}

.type-info h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.type-info p {
  font-size: 0.875rem;
  color: #6b7280;
}

.game-flow {
  padding-left: 2rem;
  color: #4b5563;
  line-height: 2;
}

.game-flow li {
  margin-bottom: 0.5rem;
}

.yaku-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.yaku-item {
  display: grid;
  grid-template-columns: 1fr auto 2fr;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border-left: 4px solid #3b82f6;
}

.yaku-name {
  font-weight: 600;
  color: #1f2937;
}

.yaku-points {
  background: #3b82f6;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-align: center;
}

.yaku-desc {
  color: #6b7280;
  font-size: 0.875rem;
}

.strategy-list {
  padding-left: 2rem;
  color: #4b5563;
  line-height: 1.8;
  margin-bottom: 1rem;
}

.strategy-list li {
  margin-bottom: 0.5rem;
}

@media (max-width: 768px) {
  .about-view {
    padding: 1rem;
  }
  
  .about-container {
    padding: 2rem;
  }
  
  .about-title {
    font-size: 2rem;
  }
  
  .section-title {
    font-size: 1.25rem;
  }
  
  .card-types {
    grid-template-columns: 1fr;
  }
  
  .yaku-item {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    text-align: center;
  }
  
  .yaku-points {
    justify-self: center;
  }
}
</style>
