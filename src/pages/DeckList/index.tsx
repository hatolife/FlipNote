import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createDeck, getDeckSummaries, type DeckSummary } from '../../db/operations'
import styles from './DeckList.module.css'

export default function DeckList() {
  const [decks, setDecks] = useState<DeckSummary[]>([])
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadDecks()
  }, [])

  async function loadDecks() {
    const result = await getDeckSummaries()
    setDecks(result)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    await createDeck(name)
    setNewName('')
    setShowForm(false)
    navigate(`/v1/deck/${encodeURIComponent(name)}`)
  }

  function formatDate(timestamp: number | null): string {
    if (timestamp === null) return '未学習'
    return new Date(timestamp).toLocaleDateString('ja-JP')
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/v1/" className={styles.back}>← ホーム</Link>
        <h1 className={styles.title}>デッキ一覧</h1>
      </header>

      {decks.length === 0 && !showForm && (
        <p className={styles.empty}>デッキがありません。作成しましょう。</p>
      )}

      <ul className={styles.list}>
        {decks.map((deck) => (
          <li key={deck.name}>
            <Link to={`/v1/deck/${encodeURIComponent(deck.name)}`} className={styles.deckCard}>
              <span className={styles.deckName}>{deck.name}</span>
              <span className={styles.deckMeta}>
                {deck.cardCount}枚 ・ 最終学習: {formatDate(deck.lastStudiedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {showForm ? (
        <form onSubmit={handleCreate} className={styles.form}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="デッキ名"
            autoFocus
            className={styles.input}
          />
          <div className={styles.formActions}>
            <button type="submit" className={styles.btnPrimary}>作成</button>
            <button type="button" onClick={() => setShowForm(false)} className={styles.btnSecondary}>キャンセル</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)} className={styles.addBtn}>
          + 新規デッキ作成
        </button>
      )}
    </div>
  )
}
