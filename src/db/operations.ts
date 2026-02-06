import { db } from './index'
import type { Card, Difficulty } from '../types'

// --- デッキ管理 ---

export async function createDeck(name: string, description = ''): Promise<void> {
  const now = Date.now()
  await db.decks.add({
    name,
    description,
    createdAt: now,
    updatedAt: now,
  })
}

export async function getAllDecks() {
  return db.decks.toArray()
}

export async function renameDeck(oldName: string, newName: string): Promise<void> {
  await db.transaction('rw', [db.decks, db.cards, db.dailyStats], async () => {
    const deck = await db.decks.get(oldName)
    if (!deck) throw new Error(`Deck "${oldName}" not found`)

    await db.decks.add({ ...deck, name: newName, updatedAt: Date.now() })
    await db.decks.delete(oldName)

    const cards = await db.cards.where('deckName').equals(oldName).toArray()
    for (const card of cards) {
      await db.cards.add({ ...card, deckName: newName })
    }
    await db.cards.where('deckName').equals(oldName).delete()

    const stats = await db.dailyStats.where('deckName').equals(oldName).toArray()
    for (const stat of stats) {
      await db.dailyStats.add({ ...stat, deckName: newName })
    }
    await db.dailyStats.where('deckName').equals(oldName).delete()
  })
}

export async function updateDeckDescription(name: string, description: string): Promise<void> {
  await db.decks.update(name, { description, updatedAt: Date.now() })
}

export interface DeckSummary {
  name: string
  description: string
  cardCount: number
  lastStudiedAt: number | null
  createdAt: number
  updatedAt: number
}

export async function getDeckSummaries(): Promise<DeckSummary[]> {
  const decks = await db.decks.toArray()
  const summaries: DeckSummary[] = []
  for (const deck of decks) {
    const cards = await db.cards.where('deckName').equals(deck.name).toArray()
    const studiedCards = cards.filter((c) => c.lastStudiedAt !== null)
    const lastStudiedAt =
      studiedCards.length > 0
        ? Math.max(...studiedCards.map((c) => c.lastStudiedAt!))
        : null
    summaries.push({
      name: deck.name,
      description: deck.description,
      cardCount: cards.length,
      lastStudiedAt,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
    })
  }
  return summaries
}

export async function deleteDeck(name: string): Promise<void> {
  await db.transaction('rw', [db.decks, db.cards, db.dailyStats], async () => {
    await db.decks.delete(name)
    await db.cards.where('deckName').equals(name).delete()
    await db.dailyStats.where('deckName').equals(name).delete()
  })
}

// --- カード管理 ---

export async function addCard(
  deckName: string,
  front: string,
  back: string,
  tag = '',
  difficulty: Difficulty = 1,
): Promise<void> {
  const now = Date.now()
  await db.cards.add({
    deckName,
    front,
    back,
    tag,
    difficulty,
    correctCount: 0,
    incorrectCount: 0,
    lastStudiedAt: null,
    createdAt: now,
    updatedAt: now,
  })
}

export async function getCardsForDeck(deckName: string): Promise<Card[]> {
  return db.cards.where('deckName').equals(deckName).toArray()
}

export async function updateCard(
  deckName: string,
  front: string,
  updates: Partial<Pick<Card, 'back' | 'tag' | 'difficulty' | 'correctCount' | 'incorrectCount' | 'lastStudiedAt'>>,
): Promise<void> {
  await db.cards.update([deckName, front], { ...updates, updatedAt: Date.now() })
}

export async function updateCardFront(
  deckName: string,
  oldFront: string,
  newFront: string,
): Promise<void> {
  await db.transaction('rw', db.cards, async () => {
    const card = await db.cards.get([deckName, oldFront])
    if (!card) throw new Error(`Card "${oldFront}" not found in deck "${deckName}"`)

    await db.cards.add({ ...card, front: newFront, updatedAt: Date.now() })
    await db.cards.delete([deckName, oldFront])
  })
}

export async function deleteCard(deckName: string, front: string): Promise<void> {
  await db.cards.delete([deckName, front])
}
