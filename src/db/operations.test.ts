import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './index'
import {
  createDeck,
  getAllDecks,
  renameDeck,
  deleteDeck,
  updateDeckDescription,
  getDeckSummaries,
  addCard,
  getCardsForDeck,
  updateCard,
  deleteCard,
  updateCardFront,
} from './operations'

describe('デッキ管理', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('デッキを作成できる', async () => {
    await createDeck('英単語', 'テスト用')
    const deck = await db.decks.get('英単語')
    expect(deck).toBeDefined()
    expect(deck!.name).toBe('英単語')
    expect(deck!.description).toBe('テスト用')
  })

  it('全デッキを取得できる', async () => {
    await createDeck('英単語')
    await createDeck('IT用語')
    const decks = await getAllDecks()
    expect(decks).toHaveLength(2)
  })

  it('デッキ名を変更すると Card と DailyStats も連動更新される', async () => {
    await createDeck('旧名')
    await addCard('旧名', 'apple', 'りんご')
    await db.dailyStats.add({
      deckName: '旧名',
      date: '2026-02-04',
      studiedCount: 5,
      correctCount: 3,
      incorrectCount: 2,
    })

    await renameDeck('旧名', '新名')

    expect(await db.decks.get('旧名')).toBeUndefined()
    expect(await db.decks.get('新名')).toBeDefined()

    const cards = await db.cards.where('deckName').equals('新名').toArray()
    expect(cards).toHaveLength(1)
    expect(cards[0].front).toBe('apple')

    const stats = await db.dailyStats.where('deckName').equals('新名').toArray()
    expect(stats).toHaveLength(1)

    expect(await db.cards.where('deckName').equals('旧名').count()).toBe(0)
    expect(await db.dailyStats.where('deckName').equals('旧名').count()).toBe(0)
  })

  it('デッキの説明を更新できる', async () => {
    await createDeck('英単語', '初期説明')
    await updateDeckDescription('英単語', '更新後の説明')
    const deck = await db.decks.get('英単語')
    expect(deck!.description).toBe('更新後の説明')
  })

  it('getDeckSummaries でカード枚数と最終学習日を取得できる', async () => {
    await createDeck('英単語')
    await createDeck('IT用語')
    await addCard('英単語', 'apple', 'りんご')
    await addCard('英単語', 'book', '本')
    await addCard('IT用語', 'API', 'インターフェース')
    await db.cards.update(['英単語', 'apple'], { lastStudiedAt: new Date('2026-02-04T00:00:00Z').getTime() })
    await db.cards.update(['英単語', 'book'], { lastStudiedAt: new Date('2026-02-03T00:00:00Z').getTime() })

    const summaries = await getDeckSummaries()
    expect(summaries).toHaveLength(2)

    const eigo = summaries.find((s) => s.name === '英単語')!
    expect(eigo.cardCount).toBe(2)
    expect(eigo.lastStudiedAt).toBe(new Date('2026-02-04T00:00:00Z').getTime())

    const it_ = summaries.find((s) => s.name === 'IT用語')!
    expect(it_.cardCount).toBe(1)
    expect(it_.lastStudiedAt).toBeNull()
  })

  it('デッキを削除すると Card と DailyStats も削除される', async () => {
    await createDeck('英単語')
    await addCard('英単語', 'apple', 'りんご')
    await db.dailyStats.add({
      deckName: '英単語',
      date: '2026-02-04',
      studiedCount: 5,
      correctCount: 3,
      incorrectCount: 2,
    })

    await deleteDeck('英単語')

    expect(await db.decks.get('英単語')).toBeUndefined()
    expect(await db.cards.where('deckName').equals('英単語').count()).toBe(0)
    expect(await db.dailyStats.where('deckName').equals('英単語').count()).toBe(0)
  })
})

describe('カード管理', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('カードを追加できる', async () => {
    await addCard('英単語', 'apple', 'りんご')
    const card = await db.cards.get(['英単語', 'apple'])
    expect(card).toBeDefined()
    expect(card!.back).toBe('りんご')
    expect(card!.pronunciation).toBe('')
    expect(card!.correctCount).toBe(0)
    expect(card!.incorrectCount).toBe(0)
    expect(card!.lastStudiedAt).toBeNull()
  })

  it('発音記号付きでカードを追加できる', async () => {
    await addCard('英単語', 'apple', 'りんご', '/ˈæp.əl/')
    const card = await db.cards.get(['英単語', 'apple'])
    expect(card).toBeDefined()
    expect(card!.pronunciation).toBe('/ˈæp.əl/')
  })

  it('デッキのカード一覧を取得できる', async () => {
    await addCard('英単語', 'apple', 'りんご')
    await addCard('英単語', 'book', '本')
    await addCard('IT用語', 'API', 'インターフェース')
    const cards = await getCardsForDeck('英単語')
    expect(cards).toHaveLength(2)
  })

  it('カードの裏面を更新できる', async () => {
    await addCard('英単語', 'apple', 'りんご')
    await updateCard('英単語', 'apple', { back: '林檎' })
    const card = await db.cards.get(['英単語', 'apple'])
    expect(card!.back).toBe('林檎')
  })

  it('カードの発音記号を更新できる', async () => {
    await addCard('英単語', 'apple', 'りんご')
    await updateCard('英単語', 'apple', { pronunciation: '/ˈæp.əl/' })
    const card = await db.cards.get(['英単語', 'apple'])
    expect(card!.pronunciation).toBe('/ˈæp.əl/')
  })

  it('カードの表面を変更できる', async () => {
    await addCard('英単語', 'apple', 'りんご')
    await updateCardFront('英単語', 'apple', 'Apple')
    expect(await db.cards.get(['英単語', 'apple'])).toBeUndefined()
    const card = await db.cards.get(['英単語', 'Apple'])
    expect(card).toBeDefined()
    expect(card!.back).toBe('りんご')
  })

  it('カードを削除できる', async () => {
    await addCard('英単語', 'apple', 'りんご')
    await deleteCard('英単語', 'apple')
    expect(await db.cards.get(['英単語', 'apple'])).toBeUndefined()
  })
})
