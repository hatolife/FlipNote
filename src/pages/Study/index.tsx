import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getCardsForDeck } from '../../db/operations'
import { recordAnswer } from '../../db/study'
import type { Card } from '../../types'
import styles from './Study.module.css'

function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

interface StudyResult {
  front: string
  back: string
  result: 'correct' | 'incorrect'
}

export default function Study() {
  const { deckName: rawDeckName } = useParams<{ deckName: string }>()
  const deckName = decodeURIComponent(rawDeckName ?? '')
  const [cards, setCards] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState<StudyResult[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    getCardsForDeck(deckName).then((c) => {
      if (c.length === 0) {
        navigate(`/v1/deck/${encodeURIComponent(deckName)}`)
        return
      }
      setCards(shuffle(c))
    })
  }, [deckName, navigate])

  const currentCard = cards[currentIndex]

  const handleAnswer = useCallback(async (result: 'correct' | 'incorrect') => {
    if (!currentCard) return
    await recordAnswer(deckName, currentCard.front, result)
    const newResults = [...results, { front: currentCard.front, back: currentCard.back, result }]
    setResults(newResults)

    if (currentIndex + 1 >= cards.length) {
      sessionStorage.setItem(`flipnote-results-${deckName}`, JSON.stringify(newResults))
      navigate(`/v1/deck/${encodeURIComponent(deckName)}/result`)
    } else {
      setCurrentIndex(currentIndex + 1)
      setFlipped(false)
    }
  }, [currentCard, currentIndex, cards.length, deckName, navigate, results])

  if (cards.length === 0 || !currentCard) return null

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to={`/v1/deck/${encodeURIComponent(deckName)}`} className={styles.back}>× 中止</Link>
        <div className={styles.progress}>
          {currentIndex + 1} / {cards.length}
        </div>
      </header>

      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${((currentIndex) / cards.length) * 100}%` }}
        />
      </div>

      <div
        className={`${styles.card} ${flipped ? styles.flipped : ''}`}
        onClick={() => !flipped && setFlipped(true)}
      >
        <div className={styles.cardInner}>
          <div className={styles.cardFront}>
            <p className={styles.cardText}>{currentCard.front}</p>
            {!flipped && <p className={styles.tapHint}>タップして裏返す</p>}
          </div>
          <div className={styles.cardBack}>
            <p className={styles.cardText}>{currentCard.back}</p>
          </div>
        </div>
      </div>

      {flipped && (
        <div className={styles.buttons}>
          <button
            onClick={() => handleAnswer('incorrect')}
            className={styles.btnIncorrect}
          >
            もう一度
          </button>
          <button
            onClick={() => handleAnswer('correct')}
            className={styles.btnCorrect}
          >
            覚えた
          </button>
        </div>
      )}
    </div>
  )
}
