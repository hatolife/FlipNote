import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createDeck, getDeckSummaries, addCard, type DeckSummary } from '../../db/operations'
import { parseTsv } from '../../utils/tsv'
import { db } from '../../db'
import styles from './DeckList.module.css'

interface SampleDeck {
  name: string
  description: string
  tsvPath: string
}

const SAMPLE_DECKS: SampleDeck[] = [
  { name: '日本語-韓国語', description: '旅行・日常会話で使える日韓フレーズ集', tsvPath: `${import.meta.env.BASE_URL}samples/japanese-korean.tsv` },
]

export default function DeckList() {
  const [decks, setDecks] = useState<DeckSummary[]>([])
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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
    setError('')
    try {
      await createDeck(name)
      setNewName('')
      setShowForm(false)
      navigate(`/v1/deck/${encodeURIComponent(name)}`)
    } catch {
      setError(`デッキ「${name}」は既に存在します`)
    }
  }

  async function handleLoadSample(sample: SampleDeck) {
    const exists = decks.some((d) => d.name === sample.name)
    if (exists) {
      setError(`デッキ「${sample.name}」は既に存在します`)
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(sample.tsvPath)
      const text = await res.text()
      const parsed = parseTsv(text)

      await createDeck(sample.name, sample.description)

      await db.transaction('rw', db.cards, async () => {
        for (const item of parsed) {
          await addCard(sample.name, item.front, item.back, item.tag, item.difficulty)
          if (item.correctCount || item.incorrectCount || item.lastStudiedAt) {
            await db.cards.update([sample.name, item.front], {
              correctCount: item.correctCount,
              incorrectCount: item.incorrectCount,
              lastStudiedAt: item.lastStudiedAt,
            })
          }
        }
      })

      navigate(`/v1/deck/${encodeURIComponent(sample.name)}`)
    } catch {
      setError('サンプルデッキの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
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

      {error && <p className={styles.error}>{error}</p>}

      {decks.length === 0 && !showForm && (
        <div>
          <p className={styles.empty}>デッキがありません。作成またはサンプルを読み込みましょう。</p>
          <div className={styles.sampleSection}>
            <p className={styles.sampleTitle}>サンプルデッキ</p>
            {SAMPLE_DECKS.map((sample) => (
              <button
                key={sample.name}
                onClick={() => handleLoadSample(sample)}
                className={styles.sampleBtn}
                disabled={loading}
              >
                {sample.name} - {sample.description}
              </button>
            ))}
          </div>
        </div>
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
            onChange={(e) => { setNewName(e.target.value); setError('') }}
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
        <div className={styles.bottomActions}>
          <button onClick={() => setShowForm(true)} className={styles.addBtn}>
            + 新規デッキ作成
          </button>
          {decks.length > 0 && SAMPLE_DECKS.some((s) => !decks.some((d) => d.name === s.name)) && (
            <div className={styles.sampleSection}>
              <p className={styles.sampleTitle}>サンプルデッキ</p>
              {SAMPLE_DECKS.filter((s) => !decks.some((d) => d.name === s.name)).map((sample) => (
                <button
                  key={sample.name}
                  onClick={() => handleLoadSample(sample)}
                  className={styles.sampleBtn}
                  disabled={loading}
                >
                  {sample.name} - {sample.description}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
