export interface Deck {
  name: string
  description: string
  createdAt: number
  updatedAt: number
}

export interface Card {
  deckName: string
  front: string
  back: string
  correctCount: number
  incorrectCount: number
  lastStudiedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface DailyStats {
  deckName: string
  date: string // "YYYY-MM-DD"
  studiedCount: number
  correctCount: number
  incorrectCount: number
}
