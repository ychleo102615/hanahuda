<script setup lang="ts">
import { useLocale } from '@/ui/composables/useLocale'

const { t } = useLocale()
</script>

<template>
  <div class="about-view">
    <div class="about-container">
      <h1 class="about-title">{{ t('about.title') }}</h1>
      
      <div class="rules-section">
        <h2 class="section-title">{{ t('about.basicConcept.title') }}</h2>
        <p class="section-text">
          {{ t('about.basicConcept.description') }}
        </p>
      </div>

      <div class="rules-section">
        <h2 class="section-title">{{ t('about.cardTypes.title') }}</h2>
        <div class="card-types">
          <div class="card-type">
            <div class="type-icon bright">光</div>
            <div class="type-info">
              <h3>{{ t('about.cardTypes.hikari.name') }}</h3>
              <p>{{ t('about.cardTypes.hikari.description') }}</p>
            </div>
          </div>
          <div class="card-type">
            <div class="type-icon animal">種</div>
            <div class="type-info">
              <h3>{{ t('about.cardTypes.tane.name') }}</h3>
              <p>{{ t('about.cardTypes.tane.description') }}</p>
            </div>
          </div>
          <div class="card-type">
            <div class="type-icon ribbon">短</div>
            <div class="type-info">
              <h3>{{ t('about.cardTypes.tan.name') }}</h3>
              <p>{{ t('about.cardTypes.tan.description') }}</p>
            </div>
          </div>
          <div class="card-type">
            <div class="type-icon plain">カス</div>
            <div class="type-info">
              <h3>{{ t('about.cardTypes.kasu.name') }}</h3>
              <p>{{ t('about.cardTypes.kasu.description') }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="rules-section">
        <h2 class="section-title">{{ t('about.gameFlow.title') }}</h2>
        <ol class="game-flow">
          <li>{{ t('about.gameFlow.steps.0') }}</li>
          <li>{{ t('about.gameFlow.steps.1') }}</li>
          <li>{{ t('about.gameFlow.steps.2') }}</li>
          <li>{{ t('about.gameFlow.steps.3') }}</li>
          <li>{{ t('about.gameFlow.steps.4') }}</li>
        </ol>
      </div>

      <div class="rules-section">
        <h2 class="section-title">{{ t('about.yaku.title') }}</h2>
        <div class="yaku-list">
          <div class="yaku-item">
            <span class="yaku-name">{{ t('about.yaku.gokou.name') }}</span>
            <span class="yaku-points">{{ t('about.yaku.gokou.points') }}</span>
            <span class="yaku-desc">{{ t('about.yaku.gokou.description') }}</span>
          </div>
          <div class="yaku-item">
            <span class="yaku-name">{{ t('about.yaku.shikou.name') }}</span>
            <span class="yaku-points">{{ t('about.yaku.shikou.points') }}</span>
            <span class="yaku-desc">{{ t('about.yaku.shikou.description') }}</span>
          </div>
          <div class="yaku-item">
            <span class="yaku-name">{{ t('about.yaku.sankou.name') }}</span>
            <span class="yaku-points">{{ t('about.yaku.sankou.points') }}</span>
            <span class="yaku-desc">{{ t('about.yaku.sankou.description') }}</span>
          </div>
          <div class="yaku-item">
            <span class="yaku-name">{{ t('about.yaku.inoshikacho.name') }}</span>
            <span class="yaku-points">{{ t('about.yaku.inoshikacho.points') }}</span>
            <span class="yaku-desc">{{ t('about.yaku.inoshikacho.description') }}</span>
          </div>
          <div class="yaku-item">
            <span class="yaku-name">{{ t('about.yaku.akatan.name') }}</span>
            <span class="yaku-points">{{ t('about.yaku.akatan.points') }}</span>
            <span class="yaku-desc">{{ t('about.yaku.akatan.description') }}</span>
          </div>
        </div>
      </div>

      <div class="rules-section">
        <h2 class="section-title">{{ t('about.strategy.title') }}</h2>
        <p class="section-text">
          {{ t('about.strategy.description') }}
        </p>
        <ul class="strategy-list">
          <li>{{ t('about.strategy.options.0') }}</li>
          <li>{{ t('about.strategy.options.1') }}</li>
        </ul>
        <p class="section-text">
          {{ t('about.strategy.bonus') }}
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
