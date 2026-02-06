import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './index'
import { addCard, getCardsForDeck } from './operations'
import { importCardsToNewDeck, mergeImportCards } from './import'
import { parseTsv, generateTsv } from '../utils/tsv'
import type { ParsedCard } from '../utils/tsv'

describe('importCardsToNewDeck', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('パース済みカードを一括インポートできる', async () => {
    const parsed: ParsedCard[] = [
      { front: 'こんにちは', back: '안녕하세요', tag: '挨拶', difficulty: 1, correctCount: 0, incorrectCount: 0, lastStudiedAt: null },
      { front: 'ありがとう', back: '감사합니다', tag: '挨拶', difficulty: 2, correctCount: 0, incorrectCount: 0, lastStudiedAt: null },
    ]
    const result = await importCardsToNewDeck('テスト', parsed)

    expect(result.imported).toBe(2)
    expect(result.skipped).toBe(0)

    const cards = await getCardsForDeck('テスト')
    expect(cards).toHaveLength(2)
    expect(cards.find((c) => c.front === 'こんにちは')?.tag).toBe('挨拶')
    expect(cards.find((c) => c.front === 'ありがとう')?.difficulty).toBe(2)
  })

  it('重複する front は最初の1件のみインポートし残りをスキップする', async () => {
    const parsed: ParsedCard[] = [
      { front: 'トイレ', back: '화장실', tag: '場所', difficulty: 1, correctCount: 0, incorrectCount: 0, lastStudiedAt: null },
      { front: 'こんにちは', back: '안녕하세요', tag: '挨拶', difficulty: 1, correctCount: 0, incorrectCount: 0, lastStudiedAt: null },
      { front: 'トイレ', back: '화장실', tag: '単語', difficulty: 2, correctCount: 0, incorrectCount: 0, lastStudiedAt: null },
    ]
    const result = await importCardsToNewDeck('テスト', parsed)

    expect(result.imported).toBe(2)
    expect(result.skipped).toBe(1)

    const cards = await getCardsForDeck('テスト')
    expect(cards).toHaveLength(2)

    const toilet = cards.find((c) => c.front === 'トイレ')!
    expect(toilet.tag).toBe('場所')
    expect(toilet.difficulty).toBe(1)
  })

  it('学習データ (correctCount, incorrectCount, lastStudiedAt) も保持される', async () => {
    const ts = new Date('2026-01-15T12:00:00Z').getTime()
    const parsed: ParsedCard[] = [
      { front: 'apple', back: 'りんご', tag: '果物', difficulty: 3, correctCount: 5, incorrectCount: 2, lastStudiedAt: ts },
    ]
    const result = await importCardsToNewDeck('テスト', parsed)
    expect(result.imported).toBe(1)

    const card = await db.cards.get(['テスト', 'apple'])
    expect(card!.correctCount).toBe(5)
    expect(card!.incorrectCount).toBe(2)
    expect(card!.lastStudiedAt).toBe(ts)
    expect(card!.tag).toBe('果物')
    expect(card!.difficulty).toBe(3)
  })

  it('空配列をインポートしてもエラーにならない', async () => {
    const result = await importCardsToNewDeck('テスト', [])
    expect(result.imported).toBe(0)
    expect(result.skipped).toBe(0)

    const cards = await getCardsForDeck('テスト')
    expect(cards).toHaveLength(0)
  })

  it('全行が同じ front でも最初の1行だけインポートされる', async () => {
    const parsed: ParsedCard[] = [
      { front: 'a', back: '1', tag: '', difficulty: 1, correctCount: 0, incorrectCount: 0, lastStudiedAt: null },
      { front: 'a', back: '2', tag: '', difficulty: 2, correctCount: 0, incorrectCount: 0, lastStudiedAt: null },
      { front: 'a', back: '3', tag: '', difficulty: 3, correctCount: 0, incorrectCount: 0, lastStudiedAt: null },
    ]
    const result = await importCardsToNewDeck('テスト', parsed)
    expect(result.imported).toBe(1)
    expect(result.skipped).toBe(2)

    const card = await db.cards.get(['テスト', 'a'])
    expect(card!.back).toBe('1')
    expect(card!.difficulty).toBe(1)
  })
})

describe('mergeImportCards', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('空のデッキにインポートすると全て新規追加になる', async () => {
    const parsed: ParsedCard[] = [
      { front: 'こんにちは', back: '안녕하세요', tag: '挨拶', difficulty: 1, correctCount: 0, incorrectCount: 0, lastStudiedAt: null },
      { front: 'ありがとう', back: '감사합니다', tag: '挨拶', difficulty: 2, correctCount: 0, incorrectCount: 0, lastStudiedAt: null },
    ]
    const result = await mergeImportCards('テスト', parsed)
    expect(result.added).toBe(2)
    expect(result.updated).toBe(0)

    const cards = await getCardsForDeck('テスト')
    expect(cards).toHaveLength(2)
  })

  it('既存カードがある場合は上書き更新される', async () => {
    await addCard('テスト', 'こんにちは', '안녕', '挨拶', 1)

    const parsed: ParsedCard[] = [
      { front: 'こんにちは', back: '안녕하세요', tag: '挨拶・基本', difficulty: 3, correctCount: 10, incorrectCount: 2, lastStudiedAt: null },
    ]
    const result = await mergeImportCards('テスト', parsed)
    expect(result.added).toBe(0)
    expect(result.updated).toBe(1)

    const card = await db.cards.get(['テスト', 'こんにちは'])
    expect(card!.back).toBe('안녕하세요')
    expect(card!.tag).toBe('挨拶・基本')
    expect(card!.difficulty).toBe(3)
    expect(card!.correctCount).toBe(10)
  })

  it('新規と既存が混在する場合、それぞれ追加と更新が行われる', async () => {
    await addCard('テスト', 'こんにちは', '안녕', '挨拶', 1)
    await addCard('テスト', 'さようなら', '안녕히 가세요', '挨拶', 1)

    const parsed: ParsedCard[] = [
      { front: 'こんにちは', back: '안녕하세요', tag: '挨拶', difficulty: 2, correctCount: 0, incorrectCount: 0, lastStudiedAt: null },
      { front: 'ありがとう', back: '감사합니다', tag: '挨拶', difficulty: 1, correctCount: 0, incorrectCount: 0, lastStudiedAt: null },
      { front: '水', back: '물', tag: '単語', difficulty: 1, correctCount: 0, incorrectCount: 0, lastStudiedAt: null },
    ]
    const result = await mergeImportCards('テスト', parsed)
    expect(result.added).toBe(2)
    expect(result.updated).toBe(1)

    const cards = await getCardsForDeck('テスト')
    expect(cards).toHaveLength(4)

    const updated = cards.find((c) => c.front === 'こんにちは')!
    expect(updated.back).toBe('안녕하세요')
    expect(updated.difficulty).toBe(2)

    const untouched = cards.find((c) => c.front === 'さようなら')!
    expect(untouched.back).toBe('안녕히 가세요')
  })

  it('学習データ付きの新規カードも correctCount/incorrectCount が反映される', async () => {
    const ts = new Date('2026-01-20T10:00:00Z').getTime()
    const parsed: ParsedCard[] = [
      { front: 'dog', back: '犬', tag: '', difficulty: 1, correctCount: 8, incorrectCount: 3, lastStudiedAt: ts },
    ]
    const result = await mergeImportCards('テスト', parsed)
    expect(result.added).toBe(1)

    const card = await db.cards.get(['テスト', 'dog'])
    expect(card!.correctCount).toBe(8)
    expect(card!.incorrectCount).toBe(3)
    expect(card!.lastStudiedAt).toBe(ts)
  })

  it('空配列のマージインポートはエラーにならない', async () => {
    await addCard('テスト', 'apple', 'りんご')
    const result = await mergeImportCards('テスト', [])
    expect(result.added).toBe(0)
    expect(result.updated).toBe(0)

    const cards = await getCardsForDeck('テスト')
    expect(cards).toHaveLength(1)
  })
})

describe('TSV ラウンドトリップ (generate → parse → import)', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('エクスポート → パース → インポートでデータが保持される', async () => {
    await addCard('元デッキ', 'こんにちは', '안녕하세요', '挨拶', 2)
    await addCard('元デッキ', 'ありがとう', '감사합니다', '挨拶', 1)
    await db.cards.update(['元デッキ', 'こんにちは'], { correctCount: 5, incorrectCount: 1, lastStudiedAt: Date.now() })

    const original = await getCardsForDeck('元デッキ')
    const tsv = generateTsv(original)
    const parsed = parseTsv(tsv)
    await importCardsToNewDeck('コピー先', parsed)

    const copied = await getCardsForDeck('コピー先')
    expect(copied).toHaveLength(2)

    const hello = copied.find((c) => c.front === 'こんにちは')!
    expect(hello.back).toBe('안녕하세요')
    expect(hello.tag).toBe('挨拶')
    expect(hello.difficulty).toBe(2)
    expect(hello.correctCount).toBe(5)
    expect(hello.incorrectCount).toBe(1)
    expect(hello.lastStudiedAt).toBeTypeOf('number')

    const thanks = copied.find((c) => c.front === 'ありがとう')!
    expect(thanks.tag).toBe('挨拶')
    expect(thanks.difficulty).toBe(1)
    expect(thanks.correctCount).toBe(0)
    expect(thanks.lastStudiedAt).toBeNull()
  })

  it('tag と difficulty が空/デフォルトでもラウンドトリップ可能', async () => {
    await addCard('元デッキ', 'apple', 'りんご')
    const original = await getCardsForDeck('元デッキ')
    const tsv = generateTsv(original)
    const parsed = parseTsv(tsv)
    await importCardsToNewDeck('コピー先', parsed)

    const card = await db.cards.get(['コピー先', 'apple'])
    expect(card!.tag).toBe('')
    expect(card!.difficulty).toBe(1)
  })
})

describe('TSV パース → DB インポート統合テスト', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('サンプルデッキ形式の TSV をパース＆インポートできる', async () => {
    const tsv = [
      'front\tback\ttag\tdifficulty\tcorrectCount\tincorrectCount\tlastStudiedAt',
      'こんにちは\t안녕하세요\t挨拶\t1\t0\t0\t',
      'はじめまして\t처음 뵙겠습니다\t挨拶\t2\t0\t0\t',
      '食堂\t식당\t場所\t1\t0\t0\t',
      '友達\t친구\t単語\t1\t0\t0\t',
    ].join('\n')

    const parsed = parseTsv(tsv)
    expect(parsed).toHaveLength(4)

    const result = await importCardsToNewDeck('日韓', parsed)
    expect(result.imported).toBe(4)
    expect(result.skipped).toBe(0)

    const cards = await getCardsForDeck('日韓')
    expect(cards).toHaveLength(4)

    const greetings = cards.filter((c) => c.tag === '挨拶')
    expect(greetings).toHaveLength(2)

    const place = cards.find((c) => c.tag === '場所')!
    expect(place.front).toBe('食堂')
    expect(place.back).toBe('식당')
  })

  it('重複 front を含むサンプル TSV でも最初の1件だけインポートされる', async () => {
    const tsv = [
      'front\tback\ttag\tdifficulty\tcorrectCount\tincorrectCount\tlastStudiedAt',
      'トイレ\t화장실\t場所\t1\t0\t0\t',
      'こんにちは\t안녕하세요\t挨拶\t1\t0\t0\t',
      'トイレ\t화장실\t単語\t1\t0\t0\t',
    ].join('\n')

    const parsed = parseTsv(tsv)
    expect(parsed).toHaveLength(3)

    const result = await importCardsToNewDeck('テスト', parsed)
    expect(result.imported).toBe(2)
    expect(result.skipped).toBe(1)

    const card = await db.cards.get(['テスト', 'トイレ'])
    expect(card!.tag).toBe('場所')
  })

  it('旧形式 TSV (tag/difficulty なし) からのインポートもデフォルト値が設定される', async () => {
    const tsv = [
      'front\tback\tcorrectCount\tincorrectCount\tlastStudiedAt',
      'apple\tりんご\t5\t2\t2026-02-04T10:30:00.000Z',
      'book\t本\t0\t0\t',
    ].join('\n')

    const parsed = parseTsv(tsv)
    await importCardsToNewDeck('テスト', parsed)

    const apple = await db.cards.get(['テスト', 'apple'])
    expect(apple!.tag).toBe('')
    expect(apple!.difficulty).toBe(1)
    expect(apple!.correctCount).toBe(5)

    const book = await db.cards.get(['テスト', 'book'])
    expect(book!.tag).toBe('')
    expect(book!.difficulty).toBe(1)
    expect(book!.correctCount).toBe(0)
  })

  it('ヘッダなし TSV からのインポートでもカードが作成される', async () => {
    const tsv = 'こんにちは\t안녕하세요\nありがとう\t감사합니다'

    const parsed = parseTsv(tsv)
    const result = await importCardsToNewDeck('テスト', parsed)
    expect(result.imported).toBe(2)

    const cards = await getCardsForDeck('テスト')
    expect(cards).toHaveLength(2)
    expect(cards.every((c) => c.tag === '')).toBe(true)
    expect(cards.every((c) => c.difficulty === 1)).toBe(true)
  })

  it('マージインポートで既存タグと難易度が上書きされる', async () => {
    await addCard('テスト', 'こんにちは', '안녕', '挨拶', 1)

    const tsv = 'front\tback\ttag\tdifficulty\tcorrectCount\tincorrectCount\tlastStudiedAt\nこんにちは\t안녕하세요\t基本挨拶\t4\t0\t0\t'
    const parsed = parseTsv(tsv)
    const result = await mergeImportCards('テスト', parsed)
    expect(result.updated).toBe(1)
    expect(result.added).toBe(0)

    const card = await db.cards.get(['テスト', 'こんにちは'])
    expect(card!.back).toBe('안녕하세요')
    expect(card!.tag).toBe('基本挨拶')
    expect(card!.difficulty).toBe(4)
  })
})
