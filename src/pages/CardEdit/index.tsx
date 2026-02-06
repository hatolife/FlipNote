import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { addCard, updateCard, updateCardFront, getCardsForDeck, getUniqueTags } from '../../db/operations'
import { db } from '../../db'
import type { Difficulty } from '../../types'
import styles from './CardEdit.module.css'

export default function CardEdit() {
  const { deckName: rawDeckName, front: rawFront } = useParams<{ deckName: string; front?: string }>()
  const deckName = decodeURIComponent(rawDeckName ?? '')
  const editingFront = rawFront ? decodeURIComponent(rawFront) : null
  const isNew = editingFront === null

  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [allDeckTags, setAllDeckTags] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState<Difficulty>(1)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getCardsForDeck(deckName).then((cards) => {
      setAllDeckTags(getUniqueTags(cards))
    })
  }, [deckName])

  useEffect(() => {
    if (editingFront) {
      db.cards.get([deckName, editingFront]).then((card) => {
        if (card) {
          setFront(card.front)
          setBack(card.back)
          setTags(card.tags ?? [])
          setDifficulty(card.difficulty ?? 1)
        }
      })
    }
  }, [deckName, editingFront])

  function addTag(tag: string) {
    const trimmed = tag.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    }
  }

  const suggestedTags = allDeckTags.filter((t) => !tags.includes(t))

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
        await addCard(deckName, trimmedFront, trimmedBack, tags, difficulty)
      } else {
        if (trimmedFront !== editingFront) {
          const existing = await db.cards.get([deckName, trimmedFront])
          if (existing) {
            setError(`「${trimmedFront}」は既に存在します`)
            return
          }
          await updateCardFront(deckName, editingFront!, trimmedFront)
        }
        await updateCard(deckName, trimmedFront, { back: trimmedBack, tags, difficulty })
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
        <div className={styles.label}>
          タグ
          <div className={styles.tagContainer}>
            {tags.map((tag) => (
              <span key={tag} className={styles.tagChip}>
                {tag}
                <button type="button" className={styles.tagRemove} onClick={() => removeTag(tag)}>×</button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="タグを入力（Enter / カンマで追加）"
              className={styles.tagInput}
            />
          </div>
          {suggestedTags.length > 0 && (
            <div className={styles.tagSuggestions}>
              {suggestedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={styles.tagSuggestion}
                  onClick={() => addTag(tag)}
                >
                  + {tag}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={styles.label}>
          難易度
          <div className={styles.difficultyGroup}>
            {([1, 2, 3, 4, 5] as Difficulty[]).map((level) => (
              <button
                key={level}
                type="button"
                className={`${styles.difficultyBtn} ${difficulty === level ? styles.difficultyActive : ''}`}
                onClick={() => setDifficulty(level)}
                aria-label={`難易度 ${level}`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
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
