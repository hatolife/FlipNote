import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './index'
import { addCard } from './operations'
import { recordAnswer, getDailyStats } from './study'

describe('学習ロジック', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await addCard('英単語', 'apple', 'りんご')
    await addCard('英単語', 'book', '本')
  })

  it('正解を記録すると Card の correctCount が増える', async () => {
    await recordAnswer('英単語', 'apple', 'correct')
    const card = await db.cards.get(['英単語', 'apple'])
    expect(card!.correctCount).toBe(1)
    expect(card!.incorrectCount).toBe(0)
    expect(card!.lastStudiedAt).toBeTypeOf('number')
  })

  it('不正解を記録すると Card の incorrectCount が増える', async () => {
    await recordAnswer('英単語', 'apple', 'incorrect')
    const card = await db.cards.get(['英単語', 'apple'])
    expect(card!.correctCount).toBe(0)
    expect(card!.incorrectCount).toBe(1)
  })

  it('複数回学習するとカウントが累積する', async () => {
    await recordAnswer('英単語', 'apple', 'correct')
    await recordAnswer('英単語', 'apple', 'correct')
    await recordAnswer('英単語', 'apple', 'incorrect')
    const card = await db.cards.get(['英単語', 'apple'])
    expect(card!.correctCount).toBe(2)
    expect(card!.incorrectCount).toBe(1)
  })

  it('学習を記録すると DailyStats が更新される', async () => {
    await recordAnswer('英単語', 'apple', 'correct')
    await recordAnswer('英単語', 'book', 'incorrect')

    const today = new Date().toISOString().slice(0, 10)
    const stats = await db.dailyStats.get(['英単語', today])
    expect(stats).toBeDefined()
    expect(stats!.studiedCount).toBe(2)
    expect(stats!.correctCount).toBe(1)
    expect(stats!.incorrectCount).toBe(1)
  })

  it('同じ日に追加学習すると DailyStats が加算される', async () => {
    await recordAnswer('英単語', 'apple', 'correct')
    await recordAnswer('英単語', 'apple', 'correct')

    const today = new Date().toISOString().slice(0, 10)
    const stats = await db.dailyStats.get(['英単語', today])
    expect(stats!.studiedCount).toBe(2)
    expect(stats!.correctCount).toBe(2)
    expect(stats!.incorrectCount).toBe(0)
  })

  it('getDailyStats でデッキの日別統計を取得できる', async () => {
    await recordAnswer('英単語', 'apple', 'correct')
    const stats = await getDailyStats('英単語')
    expect(stats.length).toBeGreaterThanOrEqual(1)
    expect(stats[0].deckName).toBe('英単語')
  })
})
