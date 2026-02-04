import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { addCard, updateCard, updateCardFront } from '../../db/operations'
import { db } from '../../db'
import styles from './CardEdit.module.css'

export default function CardEdit() {
  const { deckName: rawDeckName, front: rawFront } = useParams<{ deckName: string; front?: string }>()
  const deckName = decodeURIComponent(rawDeckName ?? '')
  const editingFront = rawFront ? decodeURIComponent(rawFront) : null
  const isNew = editingFront === null

  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (editingFront) {
      db.cards.get([deckName, editingFront]).then((card) => {
        if (card) {
          setFront(card.front)
          setBack(card.back)
        }
      })
    }
  }, [deckName, editingFront])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedFront = front.trim()
    const trimmedBack = back.trim()
    if (!trimmedFront || !trimmedBack) return
    setError('')

    try {
      if (isNew) {
        const existing = await db.cards.get([deckName, trimmedFront])
        if (existing) {
          setError(`「${trimmedFront}」は既に存在します`)
          return
        }
        await addCard(deckName, trimmedFront, trimmedBack)
      } else {
        if (trimmedFront !== editingFront) {
          const existing = await db.cards.get([deckName, trimmedFront])
          if (existing) {
            setError(`「${trimmedFront}」は既に存在します`)
            return
          }
          await updateCardFront(deckName, editingFront!, trimmedFront)
        }
        await updateCard(deckName, trimmedFront, { back: trimmedBack })
      }
      navigate(`/v1/deck/${encodeURIComponent(deckName)}`)
    } catch {
      setError('カードの保存に失敗しました')
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to={`/v1/deck/${encodeURIComponent(deckName)}`} className={styles.back}>← 戻る</Link>
        <h1 className={styles.title}>{isNew ? 'カード追加' : 'カード編集'}</h1>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <p className={styles.error}>{error}</p>}
        <label className={styles.label}>
          表面（問題）
          <input
            type="text"
            value={front}
            onChange={(e) => { setFront(e.target.value); setError('') }}
            className={styles.input}
            autoFocus
          />
        </label>
        <label className={styles.label}>
          裏面（答え）
          <input
            type="text"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            className={styles.input}
          />
        </label>
        <div className={styles.actions}>
          <button type="submit" className={styles.btnPrimary}>保存</button>
          <Link to={`/v1/deck/${encodeURIComponent(deckName)}`} className={styles.btnSecondary}>
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  )
}
