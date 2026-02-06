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

    this.version(2).stores({
      decks: 'name',
      cards: '[deckName+front], deckName',
      dailyStats: '[deckName+date], deckName',
    }).upgrade((tx) => {
      return tx.table('cards').toCollection().modify((card) => {
        if (!card.tags) card.tags = []
        if (card.difficulty === undefined) card.difficulty = 1
      })
    })
  }
}

export const db = new FlipNoteDB()
