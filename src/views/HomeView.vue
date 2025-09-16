<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="home-view">
    <div class="hero-section">
      <h1 class="hero-title">花牌遊戲「来来」</h1>
      <h2 class="hero-subtitle">Hanafuda Koi-Koi</h2>
      <p class="hero-description">
        體驗傳統日本花牌遊戲的魅力，在這個數位化的來來遊戲中與對手比拼技巧與運氣。
      </p>
      <div class="hero-actions">
        <RouterLink to="/game" class="play-button">
          開始遊戲
        </RouterLink>
        <RouterLink to="/about" class="learn-button">
          了解規則
        </RouterLink>
      </div>
    </div>
    
    <div class="features-section">
      <h3 class="features-title">遊戲特色</h3>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">🎴</div>
          <h4 class="feature-name">傳統花牌</h4>
          <p class="feature-description">48張精美花牌，12個月份各具特色</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🏆</div>
          <h4 class="feature-name">役種系統</h4>
          <p class="feature-description">光札、種札、短冊等多種組合</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h4 class="feature-name">來來宣言</h4>
          <p class="feature-description">刺激的風險決策，加倍得分機會</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🎯</div>
          <h4 class="feature-name">策略對戰</h4>
          <p class="feature-description">考驗記憶力與判斷力的智慧遊戲</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-view {
  min-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
}

.hero-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 4rem 2rem;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%);
}

.hero-title {
  font-size: 3rem;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 0.5rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.hero-subtitle {
  font-size: 1.5rem;
  color: #6b7280;
  margin-bottom: 1.5rem;
  font-weight: 300;
}

.hero-description {
  font-size: 1.125rem;
  color: #4b5563;
  max-width: 600px;
  line-height: 1.8;
  margin-bottom: 2rem;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.play-button,
.learn-button {
  padding: 0.875rem 2rem;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 600;
  font-size: 1.1rem;
  transition: all 0.3s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.play-button {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}

.play-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(59, 130, 246, 0.3);
}

.learn-button {
  background: white;
  color: #3b82f6;
  border: 2px solid #3b82f6;
}

.learn-button:hover {
  background: #3b82f6;
  color: white;
  transform: translateY(-2px);
}

.features-section {
  padding: 4rem 2rem;
  background: white;
}

.features-title {
  font-size: 2rem;
  font-weight: bold;
  color: #1f2937;
  text-align: center;
  margin-bottom: 3rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 1rem;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  transition: all 0.3s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.75rem;
}

.feature-description {
  color: #6b7280;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }
  
  .hero-subtitle {
    font-size: 1.25rem;
  }
  
  .hero-description {
    font-size: 1rem;
  }
  
  .hero-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .play-button,
  .learn-button {
    width: 100%;
    max-width: 300px;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>
