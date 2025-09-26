<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useLocale } from '@/ui/composables/useLocale'
import LicenseFooter from '../components/LicenseFooter.vue'

const { t } = useLocale()
</script>

<template>
  <div class="home-view min-w-0">
    <div class="hero-section">
      <h1 class="hero-title">{{ t('home.title') }}</h1>
      <h2 class="hero-subtitle">{{ t('home.subtitle') }}</h2>
      <p class="hero-description">
        {{ t('home.description') }}
      </p>
      <div class="hero-actions">
        <RouterLink to="/game" class="play-button">{{ t('home.actions.play') }}</RouterLink>
        <RouterLink to="/about" class="learn-button">{{ t('home.actions.learn') }}</RouterLink>
      </div>
    </div>

    <div class="features-section">
      <h3 class="features-title">{{ t('home.features.title') }}</h3>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">🎴</div>
          <h4 class="feature-name">{{ t('home.features.cards.title') }}</h4>
          <p class="feature-description">{{ t('home.features.cards.description') }}</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🏆</div>
          <h4 class="feature-name">{{ t('home.features.yaku.title') }}</h4>
          <p class="feature-description">{{ t('home.features.yaku.description') }}</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h4 class="feature-name">{{ t('home.features.koikoi.title') }}</h4>
          <p class="feature-description">{{ t('home.features.koikoi.description') }}</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🎯</div>
          <h4 class="feature-name">{{ t('home.features.strategy.title') }}</h4>
          <p class="feature-description">{{ t('home.features.strategy.description') }}</p>
        </div>
      </div>
    </div>

    <!-- 授權聲明區塊 -->
    <LicenseFooter />
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
