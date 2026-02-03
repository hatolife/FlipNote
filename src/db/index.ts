import Dexie, { type Table } from 'dexie'
import type { Deck, Card, DailyStats } from '../types'

class FlipNoteDB extends Dexie {
  decks!: Table<Deck, string>
  cards!: Table<Card, [string, string]>
  dailyStats!: Table<DailyStats, [string, string]>

  constructor() {
    super('FlipNoteDB')
    this.version(1).stores({
      decks: 'name',
      cards: '[deckName+front], deckName',
      dailyStats: '[deckName+date], deckName',
    })
  }
}

export const db = new FlipNoteDB()
