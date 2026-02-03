import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getCardsForDeck, addCard, deleteCard, deleteDeck, renameDeck, updateDeckDescription } from '../../db/operations'
import { generateTsv, parseTsv } from '../../utils/tsv'
import type { Card } from '../../types'
import { db } from '../../db'
import styles from './DeckDetail.module.css'

export default function DeckDetail() {
  const { deckName: rawDeckName } = useParams<{ deckName: string }>()
  const deckName = decodeURIComponent(rawDeckName ?? '')
  const [cards, setCards] = useState<Card[]>([])
  const [editing, setEditing] = useState(false)
  const [newDeckName, setNewDeckName] = useState(deckName)
  const [description, setDescription] = useState('')
  const [editingDesc, setEditingDesc] = useState(false)
  const [newDescription, setNewDescription] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadDeck()
  }, [deckName])

  async function loadDeck() {
    const deck = await db.decks.get(deckName)
    if (deck) {
      setDescription(deck.description)
      setNewDescription(deck.description)
    }
    const result = await getCardsForDeck(deckName)
    setCards(result)
  }

  async function loadCards() {
    const result = await getCardsForDeck(deckName)
    setCards(result)
  }

  async function handleDeleteDeck() {
    if (!confirm(`デッキ「${deckName}」を削除しますか？`)) return
    await deleteDeck(deckName)
    navigate('/v1/decks')
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    const name = newDeckName.trim()
    if (!name || name === deckName) {
      setEditing(false)
      return
    }
    await renameDeck(deckName, name)
    navigate(`/v1/deck/${encodeURIComponent(name)}`, { replace: true })
  }

  async function handleDeleteCard(front: string) {
    if (!confirm(`「${front}」を削除しますか？`)) return
    await deleteCard(deckName, front)
    await loadCards()
  }

  function handleExport() {
    const tsv = generateTsv(cards)
    const blob = new Blob([tsv], { type: 'text/tab-separated-values' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${deckName}.tsv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const parsed = parseTsv(text)
    const now = Date.now()

    await db.transaction('rw', db.cards, async () => {
      for (const item of parsed) {
        const existing = await db.cards.get([deckName, item.front])
        if (existing) {
          await db.cards.update([deckName, item.front], {
            back: item.back,
            correctCount: item.correctCount,
            incorrectCount: item.incorrectCount,
            lastStudiedAt: item.lastStudiedAt,
            updatedAt: now,
          })
        } else {
          await addCard(deckName, item.front, item.back)
          if (item.correctCount || item.incorrectCount || item.lastStudiedAt) {
            await db.cards.update([deckName, item.front], {
              correctCount: item.correctCount,
              incorrectCount: item.incorrectCount,
              lastStudiedAt: item.lastStudiedAt,
            })
          }
        }
      }
    })

    if (fileInputRef.current) fileInputRef.current.value = ''
    await loadCards()
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/v1/decks" className={styles.back}>← デッキ一覧</Link>
        {editing ? (
          <form onSubmit={handleRename} className={styles.renameForm}>
            <input
              type="text"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              autoFocus
              className={styles.renameInput}
            />
            <button type="submit" className={styles.btnSmall}>保存</button>
            <button type="button" onClick={() => setEditing(false)} className={styles.btnSmallSec}>取消</button>
          </form>
        ) : (
          <h1 className={styles.title} onClick={() => setEditing(true)}>
            {deckName} <span className={styles.editHint}>✎</span>
          </h1>
        )}
      </header>

      {editingDesc ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            await updateDeckDescription(deckName, newDescription)
            setDescription(newDescription)
            setEditingDesc(false)
          }}
          className={styles.descForm}
        >
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="デッキの説明（任意）"
            autoFocus
            className={styles.descInput}
          />
          <div className={styles.formActions}>
            <button type="submit" className={styles.btnSmall}>保存</button>
            <button type="button" onClick={() => setEditingDesc(false)} className={styles.btnSmallSec}>取消</button>
          </div>
        </form>
      ) : (
        <p
          className={styles.description}
          onClick={() => { setNewDescription(description); setEditingDesc(true) }}
        >
          {description || '説明を追加...'}
        </p>
      )}

      <div className={styles.actions}>
        <Link to={`/v1/deck/${encodeURIComponent(deckName)}/study`} className={styles.studyBtn}>
          学習を始める
        </Link>
        <Link to={`/v1/deck/${encodeURIComponent(deckName)}/card/new`} className={styles.btnPrimary}>
          + カード追加
        </Link>
      </div>

      <div className={styles.ioActions}>
        <button onClick={handleExport} className={styles.btnSecondary} disabled={cards.length === 0}>
          TSV エクスポート
        </button>
        <label className={styles.btnSecondary}>
          TSV インポート
          <input
            ref={fileInputRef}
            type="file"
            accept=".tsv,.txt"
            onChange={handleImport}
            hidden
          />
        </label>
      </div>

      {cards.length === 0 ? (
        <p className={styles.empty}>カードがありません。追加またはインポートしてください。</p>
      ) : (
        <ul className={styles.cardList}>
          {cards.map((card) => (
            <li key={card.front} className={styles.cardItem}>
              <Link
                to={`/v1/deck/${encodeURIComponent(deckName)}/card/${encodeURIComponent(card.front)}/edit`}
                className={styles.cardContent}
              >
                <span className={styles.cardFront}>{card.front}</span>
                <span className={styles.cardBack}>{card.back}</span>
              </Link>
              <button
                onClick={() => handleDeleteCard(card.front)}
                className={styles.deleteBtn}
                aria-label={`${card.front}を削除`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <button onClick={handleDeleteDeck} className={styles.dangerBtn}>
        デッキを削除
      </button>
    </div>
  )
}
