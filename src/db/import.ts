import { db } from './index'
import { addCard } from './operations'
import type { ParsedCard } from '../utils/tsv'

/**
 * パース済みカードをデッキにインポートする（新規デッキ向け・重複front自動スキップ）
 */
export async function importCardsToNewDeck(
  deckName: string,
  parsed: ParsedCard[],
): Promise<{ imported: number; skipped: number }> {
  const now = Date.now()
  const seen = new Set<string>()
  let imported = 0
  let skipped = 0

  await db.transaction('rw', db.cards, async () => {
    for (const item of parsed) {
      if (seen.has(item.front)) {
        skipped++
        continue
      }
      seen.add(item.front)
      await db.cards.put({
        deckName,
        front: item.front,
        back: item.back,
        tag: item.tag,
        difficulty: item.difficulty,
        correctCount: item.correctCount,
        incorrectCount: item.incorrectCount,
        lastStudiedAt: item.lastStudiedAt,
        createdAt: now,
        updatedAt: now,
      })
      imported++
    }
  })

  return { imported, skipped }
}

/**
 * パース済みカードを既存デッキにマージインポートする（既存カードは上書き更新）
 */
export async function mergeImportCards(
  deckName: string,
  parsed: ParsedCard[],
): Promise<{ added: number; updated: number }> {
  const now = Date.now()
  let added = 0
  let updated = 0

  await db.transaction('rw', db.cards, async () => {
    for (const item of parsed) {
      const existing = await db.cards.get([deckName, item.front])
      if (existing) {
        await db.cards.update([deckName, item.front], {
          back: item.back,
          tag: item.tag,
          difficulty: item.difficulty,
          correctCount: item.correctCount,
          incorrectCount: item.incorrectCount,
          lastStudiedAt: item.lastStudiedAt,
          updatedAt: now,
        })
        updated++
      } else {
        await addCard(deckName, item.front, item.back, item.tag, item.difficulty)
        if (item.correctCount || item.incorrectCount || item.lastStudiedAt) {
          await db.cards.update([deckName, item.front], {
            correctCount: item.correctCount,
            incorrectCount: item.incorrectCount,
            lastStudiedAt: item.lastStudiedAt,
          })
        }
        added++
      }
    }
  })

  return { added, updated }
}
