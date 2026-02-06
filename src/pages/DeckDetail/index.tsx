import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getCardsForDeck, deleteCard, deleteDeck, renameDeck, updateDeckDescription, getUniqueTags } from '../../db/operations'
import { mergeImportCards } from '../../db/import'
import { generateTsv, parseTsv } from '../../utils/tsv'
import type { Card, Difficulty } from '../../types'
import { db } from '../../db'
import styles from './DeckDetail.module.css'

const DIFFICULTY_LABELS = ['', '1', '2', '3', '4', '5']
const ALL_DIFFICULTIES: Difficulty[] = [1, 2, 3, 4, 5]

export default function DeckDetail() {
  const { deckName: rawDeckName } = useParams<{ deckName: string }>()
  const deckName = decodeURIComponent(rawDeckName ?? '')
  const [cards, setCards] = useState<Card[]>([])
  const [editing, setEditing] = useState(false)
  const [newDeckName, setNewDeckName] = useState(deckName)
  const [description, setDescription] = useState('')
  const [editingDesc, setEditingDesc] = useState(false)
  const [newDescription, setNewDescription] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>([])
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

  const allTags = useMemo(() => getUniqueTags(cards), [cards])

  const usedDifficulties = useMemo(() => {
    const set = new Set<Difficulty>()
    for (const card of cards) {
      set.add(card.difficulty ?? 1)
    }
    return ALL_DIFFICULTIES.filter((d) => set.has(d))
  }, [cards])

  const filteredCards = useMemo(() => {
    let result = cards
    if (selectedTags.length > 0) {
      result = result.filter((card) =>
        (card.tags ?? []).some((tag) => selectedTags.includes(tag))
      )
    }
    if (selectedDifficulties.length > 0) {
      result = result.filter((card) =>
        selectedDifficulties.includes(card.difficulty ?? 1)
      )
    }
    return result
  }, [cards, selectedTags, selectedDifficulties])

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function toggleDifficulty(d: Difficulty) {
    setSelectedDifficulties((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    )
  }

  const hasFilter = selectedTags.length > 0 || selectedDifficulties.length > 0

  function clearFilters() {
    setSelectedTags([])
    setSelectedDifficulties([])
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
    await mergeImportCards(deckName, parsed)

    if (fileInputRef.current) fileInputRef.current.value = ''
    await loadCards()
  }

  const studyLink = useMemo(() => {
    const base = `/v1/deck/${encodeURIComponent(deckName)}/study`
    const params = new URLSearchParams()
    if (selectedTags.length > 0) {
      params.set('tags', selectedTags.join(','))
    }
    if (selectedDifficulties.length > 0) {
      params.set('difficulties', selectedDifficulties.join(','))
    }
    const query = params.toString()
    return query ? `${base}?${query}` : base
  }, [deckName, selectedTags, selectedDifficulties])

  const studyButtonText = hasFilter
    ? `${filteredCards.length}枚を学習する`
    : '学習を始める'

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

      <p className={styles.cardCount}>
        {hasFilter
          ? `${filteredCards.length} / ${cards.length}枚のカード`
          : `${cards.length}枚のカード`
        }
      </p>

      {(allTags.length > 0 || usedDifficulties.length > 1) && (
        <div className={styles.filterSection}>
          {allTags.length > 0 && (
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>タグ</span>
              <div className={styles.filterChips}>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    className={`${styles.filterChip} ${selectedTags.includes(tag) ? styles.filterChipActive : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
          {usedDifficulties.length > 1 && (
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>難易度</span>
              <div className={styles.filterChips}>
                {usedDifficulties.map((d) => (
                  <button
                    key={d}
                    className={`${styles.filterChip} ${styles.difficultyChip} ${selectedDifficulties.includes(d) ? styles.filterChipActive : ''}`}
                    onClick={() => toggleDifficulty(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
          {hasFilter && (
            <button className={styles.filterClear} onClick={clearFilters}>
              フィルタ解除
            </button>
          )}
        </div>
      )}

      <div className={styles.actions}>
        <Link to={studyLink} className={styles.studyBtn}>
          {studyButtonText}
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
      ) : filteredCards.length === 0 ? (
        <p className={styles.empty}>フィルタに一致するカードがありません。</p>
      ) : (
        <ul className={styles.cardList}>
          {filteredCards.map((card) => (
            <li key={card.front} className={styles.cardItem}>
              <Link
                to={`/v1/deck/${encodeURIComponent(deckName)}/card/${encodeURIComponent(card.front)}/edit`}
                className={styles.cardContent}
              >
                <div className={styles.cardMain}>
                  <span className={styles.cardFront}>{card.front}</span>
                  <span className={styles.cardBack}>{card.back}</span>
                </div>
                <div className={styles.cardMeta}>
                  {(card.tags ?? []).length > 0 && (
                    <span className={styles.cardTags}>
                      {card.tags.map((tag) => (
                        <span key={tag} className={styles.cardTag}>{tag}</span>
                      ))}
                    </span>
                  )}
                  <span className={styles.cardDifficulty}>
                    難易度 {DIFFICULTY_LABELS[card.difficulty ?? 1]}
                  </span>
                </div>
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
