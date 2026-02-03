import { db } from './index'
import type { DailyStats } from '../types'

export async function recordAnswer(
  deckName: string,
  front: string,
  result: 'correct' | 'incorrect',
): Promise<void> {
  const now = Date.now()
  const today = new Date(now).toISOString().slice(0, 10)

  await db.transaction('rw', [db.cards, db.dailyStats], async () => {
    const card = await db.cards.get([deckName, front])
    if (!card) throw new Error(`Card "${front}" not found in deck "${deckName}"`)

    if (result === 'correct') {
      await db.cards.update([deckName, front], {
        correctCount: card.correctCount + 1,
        lastStudiedAt: now,
        updatedAt: now,
      })
    } else {
      await db.cards.update([deckName, front], {
        incorrectCount: card.incorrectCount + 1,
        lastStudiedAt: now,
        updatedAt: now,
      })
    }

    const existing = await db.dailyStats.get([deckName, today])
    if (existing) {
      await db.dailyStats.update([deckName, today], {
        studiedCount: existing.studiedCount + 1,
        correctCount: existing.correctCount + (result === 'correct' ? 1 : 0),
        incorrectCount: existing.incorrectCount + (result === 'incorrect' ? 1 : 0),
      })
    } else {
      await db.dailyStats.add({
        deckName,
        date: today,
        studiedCount: 1,
        correctCount: result === 'correct' ? 1 : 0,
        incorrectCount: result === 'incorrect' ? 1 : 0,
      })
    }
  })
}

export async function getDailyStats(deckName: string): Promise<DailyStats[]> {
  return db.dailyStats.where('deckName').equals(deckName).toArray()
}
