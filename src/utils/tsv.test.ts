import { describe, it, expect } from 'vitest'
import { parseTsv, generateTsv } from './tsv'
import type { Card } from '../types'

describe('generateTsv', () => {
  it('カードの配列から TSV 文字列を生成する', () => {
    const cards: Card[] = [
      { deckName: '英単語', front: 'apple', back: 'りんご', tags: ['果物'], difficulty: 2, correctCount: 5, incorrectCount: 2, lastStudiedAt: new Date('2026-02-04T10:30:00Z').getTime(), createdAt: 0, updatedAt: 0 },
      { deckName: '英単語', front: 'book', back: '本', tags: [], difficulty: 1, correctCount: 3, incorrectCount: 0, lastStudiedAt: new Date('2026-02-03T15:00:00Z').getTime(), createdAt: 0, updatedAt: 0 },
    ]
    const tsv = generateTsv(cards)
    const lines = tsv.split('\n')
    expect(lines[0]).toBe('front\tback\ttags\tdifficulty\tcorrectCount\tincorrectCount\tlastStudiedAt')
    expect(lines[1]).toBe('apple\tりんご\t果物\t2\t5\t2\t2026-02-04T10:30:00.000Z')
    expect(lines[2]).toBe('book\t本\t\t1\t3\t0\t2026-02-03T15:00:00.000Z')
  })

  it('未学習カードの lastStudiedAt は空文字', () => {
    const cards: Card[] = [
      { deckName: '英単語', front: 'dog', back: '犬', tags: [], difficulty: 1, correctCount: 0, incorrectCount: 0, lastStudiedAt: null, createdAt: 0, updatedAt: 0 },
    ]
    const tsv = generateTsv(cards)
    const lines = tsv.split('\n')
    expect(lines[1]).toBe('dog\t犬\t\t1\t0\t0\t')
  })

  it('空配列ならヘッダ行のみ', () => {
    const tsv = generateTsv([])
    expect(tsv).toBe('front\tback\ttags\tdifficulty\tcorrectCount\tincorrectCount\tlastStudiedAt')
  })

  it('複数タグをカンマ区切りで出力する', () => {
    const cards: Card[] = [
      { deckName: '英単語', front: 'apple', back: 'りんご', tags: ['果物', '食べ物'], difficulty: 1, correctCount: 0, incorrectCount: 0, lastStudiedAt: null, createdAt: 0, updatedAt: 0 },
    ]
    const tsv = generateTsv(cards)
    const lines = tsv.split('\n')
    expect(lines[1]).toBe('apple\tりんご\t果物,食べ物\t1\t0\t0\t')
  })
})

describe('parseTsv', () => {
  it('ヘッダ付き TSV をパースして front/back を取得する', () => {
    const tsv = 'front\tback\napple\tりんご\nbook\t本'
    const result = parseTsv(tsv)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ front: 'apple', back: 'りんご', tags: [], difficulty: 1, correctCount: 0, incorrectCount: 0, lastStudiedAt: null })
    expect(result[1]).toEqual({ front: 'book', back: '本', tags: [], difficulty: 1, correctCount: 0, incorrectCount: 0, lastStudiedAt: null })
  })

  it('学習列付き TSV をパースして学習情報も取得する', () => {
    const tsv = 'front\tback\ttags\tdifficulty\tcorrectCount\tincorrectCount\tlastStudiedAt\napple\tりんご\t果物\t3\t5\t2\t2026-02-04T10:30:00.000Z'
    const result = parseTsv(tsv)
    expect(result).toHaveLength(1)
    expect(result[0].tags).toEqual(['果物'])
    expect(result[0].difficulty).toBe(3)
    expect(result[0].correctCount).toBe(5)
    expect(result[0].incorrectCount).toBe(2)
    expect(result[0].lastStudiedAt).toBe(new Date('2026-02-04T10:30:00.000Z').getTime())
  })

  it('tags と difficulty がない旧形式 TSV もパースできる', () => {
    const tsv = 'front\tback\tcorrectCount\tincorrectCount\tlastStudiedAt\napple\tりんご\t5\t2\t2026-02-04T10:30:00.000Z'
    const result = parseTsv(tsv)
    expect(result).toHaveLength(1)
    expect(result[0].tags).toEqual([])
    expect(result[0].difficulty).toBe(1)
    expect(result[0].correctCount).toBe(5)
    expect(result[0].incorrectCount).toBe(2)
  })

  it('lastStudiedAt が空なら null', () => {
    const tsv = 'front\tback\ttags\tdifficulty\tcorrectCount\tincorrectCount\tlastStudiedAt\ndog\t犬\t\t1\t0\t0\t'
    const result = parseTsv(tsv)
    expect(result[0].lastStudiedAt).toBeNull()
  })

  it('ヘッダなし（front/back を含まない1行目）の場合は1列目=front, 2列目=back として扱う', () => {
    const tsv = 'apple\tりんご\nbook\t本'
    const result = parseTsv(tsv)
    expect(result).toHaveLength(2)
    expect(result[0].front).toBe('apple')
    expect(result[0].back).toBe('りんご')
    expect(result[0].tags).toEqual([])
    expect(result[0].difficulty).toBe(1)
  })

  it('空行は無視する', () => {
    const tsv = 'front\tback\napple\tりんご\n\nbook\t本\n'
    const result = parseTsv(tsv)
    expect(result).toHaveLength(2)
  })

  it('空文字列なら空配列を返す', () => {
    const result = parseTsv('')
    expect(result).toEqual([])
  })

  it('pronunciation 列がある旧形式 TSV でもパースできる（pronunciation は無視）', () => {
    const tsv = 'front\tback\tpronunciation\tcorrectCount\tincorrectCount\tlastStudiedAt\napple\tりんご\t/ˈæp.əl/\t5\t2\t2026-02-04T10:30:00.000Z'
    const result = parseTsv(tsv)
    expect(result).toHaveLength(1)
    expect(result[0].front).toBe('apple')
    expect(result[0].back).toBe('りんご')
    expect(result[0].correctCount).toBe(5)
    expect(result[0].incorrectCount).toBe(2)
    expect(result[0].tags).toEqual([])
  })

  it('tags 列付き TSV をパースできる', () => {
    const tsv = 'front\tback\tcorrectCount\tincorrectCount\tlastStudiedAt\ttags\napple\tりんご\t0\t0\t\t果物,食べ物\nbook\t本\t0\t0\t\t'
    const result = parseTsv(tsv)
    expect(result).toHaveLength(2)
    expect(result[0].tags).toEqual(['果物', '食べ物'])
    expect(result[1].tags).toEqual([])
  })

  it('tag 列（単数形）でもパースできる（後方互換）', () => {
    const tsv = 'front\tback\ttag\napple\tりんご\t果物\nbook\t本\t'
    const result = parseTsv(tsv)
    expect(result).toHaveLength(2)
    expect(result[0].tags).toEqual(['果物'])
    expect(result[1].tags).toEqual([])
  })

  it('tags 列なしの旧 TSV でも後方互換でパースできる', () => {
    const tsv = 'front\tback\tcorrectCount\tincorrectCount\tlastStudiedAt\napple\tりんご\t5\t2\t2026-02-04T10:30:00.000Z'
    const result = parseTsv(tsv)
    expect(result[0].tags).toEqual([])
  })

  it('difficulty が範囲外の場合は 1 にフォールバックする', () => {
    const tsv = 'front\tback\ttags\tdifficulty\napple\tりんご\t\t0\nbook\t本\t\t6'
    const result = parseTsv(tsv)
    expect(result[0].difficulty).toBe(1)
    expect(result[1].difficulty).toBe(1)
  })
})
