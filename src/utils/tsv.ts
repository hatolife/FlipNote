import type { Card, Difficulty } from '../types'

const HEADER = 'front\tback\ttag\tdifficulty\tcorrectCount\tincorrectCount\tlastStudiedAt'

export function generateTsv(cards: Card[]): string {
  const lines = [HEADER]
  for (const card of cards) {
    const lastStudied = card.lastStudiedAt
      ? new Date(card.lastStudiedAt).toISOString()
      : ''
    lines.push(`${card.front}\t${card.back}\t${card.tag}\t${card.difficulty}\t${card.correctCount}\t${card.incorrectCount}\t${lastStudied}`)
  }
  return lines.join('\n')
}

function parseDifficulty(value: string): Difficulty {
  const n = Number(value)
  if (n >= 1 && n <= 5) return n as Difficulty
  return 1
}

export interface ParsedCard {
  front: string
  back: string
  tag: string
  difficulty: Difficulty
  correctCount: number
  incorrectCount: number
  lastStudiedAt: number | null
}

export function parseTsv(tsv: string): ParsedCard[] {
  const lines = tsv.split('\n').filter((line) => line.trim() !== '')
  if (lines.length === 0) return []

  const firstLine = lines[0]
  const hasHeader = firstLine.includes('front') && firstLine.includes('back')
  const dataLines = hasHeader ? lines.slice(1) : lines

  if (hasHeader) {
    const headers = firstLine.split('\t')
    const frontIdx = headers.indexOf('front')
    const backIdx = headers.indexOf('back')
    const tagIdx = headers.indexOf('tag')
    const difficultyIdx = headers.indexOf('difficulty')
    const correctIdx = headers.indexOf('correctCount')
    const incorrectIdx = headers.indexOf('incorrectCount')
    const lastStudiedIdx = headers.indexOf('lastStudiedAt')

    return dataLines.map((line) => {
      const cols = line.split('\t')
      return {
        front: cols[frontIdx] ?? '',
        back: cols[backIdx] ?? '',
        tag: tagIdx >= 0 ? (cols[tagIdx] ?? '') : '',
        difficulty: difficultyIdx >= 0 ? parseDifficulty(cols[difficultyIdx] ?? '') : 1,
        correctCount: correctIdx >= 0 ? Number(cols[correctIdx]) || 0 : 0,
        incorrectCount: incorrectIdx >= 0 ? Number(cols[incorrectIdx]) || 0 : 0,
        lastStudiedAt:
          lastStudiedIdx >= 0 && cols[lastStudiedIdx]
            ? new Date(cols[lastStudiedIdx]).getTime()
            : null,
      }
    })
  }

  return dataLines.map((line) => {
    const [front = '', back = ''] = line.split('\t')
    return {
      front,
      back,
      tag: '',
      difficulty: 1 as Difficulty,
      correctCount: 0,
      incorrectCount: 0,
      lastStudiedAt: null,
    }
  })
}
