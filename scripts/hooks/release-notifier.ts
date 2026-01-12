/**
 * Release Notifier Interface
 *
 * 預留的通知介面，用於在 release 完成後發送通知。
 * 未來可實作不同的 notifier：Slack、Discord、Email、GitHub Release 等。
 *
 * 使用方式：
 * 1. 實作 ReleaseNotifier 介面
 * 2. 在 notifiers 陣列中註冊
 * 3. /release skill 會自動呼叫所有已註冊的 notifier
 */

export interface CommitInfo {
  hash: string
  message: string
  type: 'feat' | 'fix' | 'perf' | 'refactor' | 'style' | 'docs' | 'test' | 'chore' | 'other'
  scope?: string
  breaking: boolean
}

export interface ReleaseInfo {
  version: string
  previousVersion: string
  date: string
  changelog: string
  commits: CommitInfo[]
  stats: {
    features: number
    fixes: number
    refactors: number
    others: number
  }
  repositoryUrl?: string
  releaseUrl?: string
}

export interface ReleaseNotifier {
  /** Notifier 名稱，用於日誌輸出 */
  name: string

  /** 是否啟用此 notifier */
  enabled: boolean

  /** 發送通知 */
  notify(info: ReleaseInfo): Promise<void>
}

// =============================================================================
// 範例實作（未啟用）
// =============================================================================

/**
 * Console Notifier - 僅輸出到 console，用於測試
 */
export const consoleNotifier: ReleaseNotifier = {
  name: 'Console',
  enabled: false, // 設為 true 以啟用

  async notify(info: ReleaseInfo): Promise<void> {
    console.log('='.repeat(60))
    console.log(`Release ${info.version} Published!`)
    console.log('='.repeat(60))
    console.log(`Previous: ${info.previousVersion}`)
    console.log(`Date: ${info.date}`)
    console.log(`Features: ${info.stats.features}`)
    console.log(`Fixes: ${info.stats.fixes}`)
    console.log(`Refactors: ${info.stats.refactors}`)
    console.log('='.repeat(60))
  },
}

/**
 * Slack Notifier - 發送到 Slack（需要設定 SLACK_WEBHOOK_URL）
 */
// export const slackNotifier: ReleaseNotifier = {
//   name: 'Slack',
//   enabled: false,
//
//   async notify(info: ReleaseInfo): Promise<void> {
//     const webhookUrl = process.env.SLACK_WEBHOOK_URL
//     if (!webhookUrl) {
//       console.warn('SLACK_WEBHOOK_URL not set, skipping Slack notification')
//       return
//     }
//
//     await fetch(webhookUrl, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         text: `New Release: ${info.version}`,
//         blocks: [
//           {
//             type: 'header',
//             text: { type: 'plain_text', text: `Release ${info.version}` }
//           },
//           {
//             type: 'section',
//             text: {
//               type: 'mrkdwn',
//               text: `*Changes:*\n• ${info.stats.features} features\n• ${info.stats.fixes} fixes`
//             }
//           }
//         ]
//       })
//     })
//   }
// }

// =============================================================================
// Notifier Registry
// =============================================================================

/**
 * 已註冊的 notifiers
 * 新增 notifier 時，在此陣列中加入即可
 */
export const notifiers: ReleaseNotifier[] = [
  consoleNotifier,
  // slackNotifier,
  // discordNotifier,
  // emailNotifier,
]

/**
 * 執行所有已啟用的 notifiers
 */
export async function notifyAll(info: ReleaseInfo): Promise<void> {
  const enabledNotifiers = notifiers.filter((n) => n.enabled)

  if (enabledNotifiers.length === 0) {
    console.log('No notifiers enabled, skipping notifications')
    return
  }

  console.log(`Sending notifications via ${enabledNotifiers.length} notifier(s)...`)

  const results = await Promise.allSettled(enabledNotifiers.map((n) => n.notify(info)))

  results.forEach((result, index) => {
    const notifier = enabledNotifiers[index]
    if (result.status === 'fulfilled') {
      console.log(`✓ ${notifier.name}: sent`)
    } else {
      console.error(`✗ ${notifier.name}: failed -`, result.reason)
    }
  })
}
