import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './index'
import type { Deck, Card, DailyStats } from '../types'

describe('DB スキーマ', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('decks テーブルに Deck を保存・取得できる', async () => {
    const deck: Deck = {
      name: '英単語',
      description: '基本的な英単語',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await db.decks.add(deck)
    const result = await db.decks.get('英単語')
    expect(result).toEqual(deck)
  })

  it('decks テーブルで同じ名前のデッキは追加できない', async () => {
    const deck: Deck = {
      name: '英単語',
      description: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await db.decks.add(deck)
    await expect(db.decks.add({ ...deck })).rejects.toThrow()
  })

  it('cards テーブルに Card を保存・取得できる', async () => {
    const card: Card = {
      deckName: '英単語',
      front: 'apple',
      back: 'りんご',
      correctCount: 0,
      incorrectCount: 0,
      lastStudiedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await db.cards.add(card)
    const result = await db.cards.get(['英単語', 'apple'])
    expect(result).toEqual(card)
  })

  it('cards テーブルで同じデッキ内の同じ表面は追加できない', async () => {
    const card: Card = {
      deckName: '英単語',
      front: 'apple',
      back: 'りんご',
      correctCount: 0,
      incorrectCount: 0,
      lastStudiedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await db.cards.add(card)
    await expect(db.cards.add({ ...card, back: '林檎' })).rejects.toThrow()
  })

  it('cards テーブルで異なるデッキなら同じ表面を追加できる', async () => {
    const now = Date.now()
    const card1: Card = {
      deckName: '英単語',
      front: 'apple',
      back: 'りんご',
      correctCount: 0,
      incorrectCount: 0,
      lastStudiedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    const card2: Card = {
      deckName: 'IT用語',
      front: 'apple',
      back: 'テクノロジー企業',
      correctCount: 0,
      incorrectCount: 0,
      lastStudiedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    await db.cards.add(card1)
    await db.cards.add(card2)
    const result1 = await db.cards.get(['英単語', 'apple'])
    const result2 = await db.cards.get(['IT用語', 'apple'])
    expect(result1?.back).toBe('りんご')
    expect(result2?.back).toBe('テクノロジー企業')
  })

  it('dailyStats テーブルに DailyStats を保存・取得できる', async () => {
    const stats: DailyStats = {
      deckName: '英単語',
      date: '2026-02-04',
      studiedCount: 10,
      correctCount: 8,
      incorrectCount: 2,
    }
    await db.dailyStats.add(stats)
    const result = await db.dailyStats.get(['英単語', '2026-02-04'])
    expect(result).toEqual(stats)
  })

  it('cards を deckName で絞り込める', async () => {
    const now = Date.now()
    await db.cards.bulkAdd([
      { deckName: '英単語', front: 'apple', back: 'りんご', correctCount: 0, incorrectCount: 0, lastStudiedAt: null, createdAt: now, updatedAt: now },
      { deckName: '英単語', front: 'book', back: '本', correctCount: 0, incorrectCount: 0, lastStudiedAt: null, createdAt: now, updatedAt: now },
      { deckName: 'IT用語', front: 'API', back: 'インターフェース', correctCount: 0, incorrectCount: 0, lastStudiedAt: null, createdAt: now, updatedAt: now },
    ])
    const cards = await db.cards.where('deckName').equals('英単語').toArray()
    expect(cards).toHaveLength(2)
  })
})
