import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { getCardsForDeck } from '../../db/operations'
import { recordAnswer } from '../../db/study'
import type { Card, Difficulty } from '../../types'
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
  const [searchParams] = useSearchParams()
  const isRetry = searchParams.get('retry') === '1'
  const tagsParam = searchParams.get('tags')
  const filterTags = tagsParam ? tagsParam.split(',').filter(Boolean) : []
  const difficultiesParam = searchParams.get('difficulties')
  const filterDifficulties: Difficulty[] = difficultiesParam
    ? difficultiesParam.split(',').map(Number).filter((n) => n >= 1 && n <= 5) as Difficulty[]
    : []
  const isReverse = searchParams.get('reverse') === '1'

  useEffect(() => {
    getCardsForDeck(deckName).then((allCards) => {
      let targetCards = allCards
      if (isRetry) {
        const retryFronts = sessionStorage.getItem(`flipnote-retry-${deckName}`)
        if (retryFronts) {
          const fronts: string[] = JSON.parse(retryFronts)
          targetCards = allCards.filter((c) => fronts.includes(c.front))
          sessionStorage.removeItem(`flipnote-retry-${deckName}`)
        }
      } else {
        if (filterTags.length > 0) {
          targetCards = targetCards.filter((c) =>
            (c.tags ?? []).some((tag) => filterTags.includes(tag))
          )
        }
        if (filterDifficulties.length > 0) {
          targetCards = targetCards.filter((c) =>
            filterDifficulties.includes(c.difficulty ?? 1)
          )
        }
      }
      if (targetCards.length === 0) {
        navigate(`/v1/deck/${encodeURIComponent(deckName)}`)
        return
      }
      setCards(shuffle(targetCards))
    })
  }, [deckName, navigate, isRetry])

  const currentCard = cards[currentIndex]

  const handleAnswer = useCallback(async (result: 'correct' | 'incorrect') => {
    if (!currentCard) return
    await recordAnswer(deckName, currentCard.front, result)
    const newResults = [...results, { front: currentCard.front, back: currentCard.back, result }]
    setResults(newResults)

    if (currentIndex + 1 >= cards.length) {
      sessionStorage.setItem(`flipnote-results-${deckName}`, JSON.stringify(newResults))
      if (filterTags.length > 0) {
        sessionStorage.setItem(`flipnote-study-tags-${deckName}`, JSON.stringify(filterTags))
      } else {
        sessionStorage.removeItem(`flipnote-study-tags-${deckName}`)
      }
      if (filterDifficulties.length > 0) {
        sessionStorage.setItem(`flipnote-study-difficulties-${deckName}`, JSON.stringify(filterDifficulties))
      } else {
        sessionStorage.removeItem(`flipnote-study-difficulties-${deckName}`)
      }
      if (isReverse) {
        sessionStorage.setItem(`flipnote-study-reverse-${deckName}`, '1')
      } else {
        sessionStorage.removeItem(`flipnote-study-reverse-${deckName}`)
      }
      navigate(`/v1/deck/${encodeURIComponent(deckName)}/result`)
    } else {
      setCurrentIndex(currentIndex + 1)
      setFlipped(false)
    }
  }, [currentCard, currentIndex, cards.length, deckName, navigate, results, filterTags, filterDifficulties])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped(!flipped)
      } else if (flipped) {
        if (e.key === 'ArrowLeft' || e.key === '1') {
          handleAnswer('incorrect')
        } else if (e.key === 'ArrowRight' || e.key === '2') {
          handleAnswer('correct')
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [flipped, handleAnswer])

  if (cards.length === 0 || !currentCard) return null

  const questionText = isReverse ? currentCard.back : currentCard.front
  const answerText = isReverse ? currentCard.front : currentCard.back

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to={`/v1/deck/${encodeURIComponent(deckName)}`} className={styles.back}>× 中止</Link>
        <div className={styles.progress}>
          {currentIndex + 1} / {cards.length}
        </div>
      </header>

      <div className={styles.progressBar} role="progressbar" aria-valuenow={currentIndex} aria-valuemin={0} aria-valuemax={cards.length}>
        <div
          className={styles.progressFill}
          style={{ width: `${((currentIndex) / cards.length) * 100}%` }}
        />
      </div>

      <div
        className={`${styles.card} ${flipped ? styles.flipped : ''}`}
        onClick={() => !flipped && setFlipped(true)}
        role="button"
        tabIndex={0}
        aria-label={flipped ? `答え: ${answerText}` : `問題: ${questionText} - クリックまたはスペースキーで裏返す`}
      >
        <div className={styles.cardInner}>
          <div className={styles.cardFront}>
            <div className={styles.cardMetaTop}>
              {(currentCard.tags ?? []).length > 0 && <span className={styles.cardTag}>{currentCard.tags.join(', ')}</span>}
              <span className={styles.cardDifficulty}>難易度 {currentCard.difficulty ?? 1}</span>
            </div>
            <p className={styles.cardText}>{questionText}</p>
            {!flipped && <p className={styles.tapHint}>タップ / スペースキーで裏返す</p>}
          </div>
          <div className={styles.cardBack}>
            <p className={styles.cardText}>{answerText}</p>
            <a
              href={`https://translate.google.co.jp/?sl=auto&tl=ja&text=${encodeURIComponent(answerText)}&op=translate`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.translateLink}
              onClick={(e) => e.stopPropagation()}
            >
              Google翻訳で確認
            </a>
          </div>
        </div>
      </div>

      {flipped && (
        <div className={styles.buttons}>
          <button
            onClick={() => setFlipped(false)}
            className={styles.btnFlip}
          >
            問題を見る
          </button>
          <button
            onClick={() => handleAnswer('incorrect')}
            className={styles.btnIncorrect}
          >
            不正解 (← / 1)
          </button>
          <button
            onClick={() => handleAnswer('correct')}
            className={styles.btnCorrect}
          >
            正解 (→ / 2)
          </button>
        </div>
      )}
    </div>
  )
}
