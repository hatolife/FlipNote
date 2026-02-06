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

interface StudyProgress {
  cardFronts: string[]
  currentIndex: number
  results: StudyResult[]
  filterTags: string[]
  filterDifficulties: number[]
  isReverse: boolean
  savedAt: number
}

const PROGRESS_KEY = (deckName: string) => `flipnote-progress-${deckName}`

export default function Study() {
  const { deckName: rawDeckName } = useParams<{ deckName: string }>()
  const deckName = decodeURIComponent(rawDeckName ?? '')
  const [cards, setCards] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState<StudyResult[]>([])
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [savedProgress, setSavedProgress] = useState<StudyProgress | null>(null)
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
    // 保存された進捗をチェック
    const progressJson = localStorage.getItem(PROGRESS_KEY(deckName))
    if (progressJson && !isRetry) {
      try {
        const progress: StudyProgress = JSON.parse(progressJson)
        if (progress.currentIndex < progress.cardFronts.length) {
          setSavedProgress(progress)
          setShowResumePrompt(true)
          return
        }
      } catch {
        // ignore
      }
    }
    startNewSession()
  }, [deckName, isRetry])

  function startNewSession() {
    setShowResumePrompt(false)
    setSavedProgress(null)
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
      localStorage.removeItem(PROGRESS_KEY(deckName))
      setCards(shuffle(targetCards))
      setCurrentIndex(0)
      setResults([])
    })
  }

  function resumeSession() {
    if (!savedProgress) return
    setShowResumePrompt(false)
    getCardsForDeck(deckName).then((allCards) => {
      const cardMap = new Map(allCards.map((c) => [c.front, c]))
      const orderedCards = savedProgress.cardFronts
        .map((front) => cardMap.get(front))
        .filter((c): c is Card => c !== undefined)
      if (orderedCards.length === 0) {
        startNewSession()
        return
      }
      setCards(orderedCards)
      setCurrentIndex(savedProgress.currentIndex)
      setResults(savedProgress.results)
    })
  }

  const currentCard = cards[currentIndex]

  const handleAnswer = useCallback(async (result: 'correct' | 'incorrect') => {
    if (!currentCard) return
    await recordAnswer(deckName, currentCard.front, result)
    const newResults = [...results, { front: currentCard.front, back: currentCard.back, result }]
    setResults(newResults)

    if (currentIndex + 1 >= cards.length) {
      // 学習完了 - 進捗をクリア
      localStorage.removeItem(PROGRESS_KEY(deckName))
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
      const nextIndex = currentIndex + 1
      // 進捗を保存
      const progress: StudyProgress = {
        cardFronts: cards.map((c) => c.front),
        currentIndex: nextIndex,
        results: newResults,
        filterTags,
        filterDifficulties,
        isReverse,
        savedAt: Date.now(),
      }
      localStorage.setItem(PROGRESS_KEY(deckName), JSON.stringify(progress))
      setCurrentIndex(nextIndex)
      setFlipped(false)
    }
  }, [currentCard, currentIndex, cards, deckName, navigate, results, filterTags, filterDifficulties, isReverse])

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

  if (showResumePrompt && savedProgress) {
    const remaining = savedProgress.cardFronts.length - savedProgress.currentIndex
    const done = savedProgress.currentIndex
    return (
      <div className={styles.container}>
        <div className={styles.resumePrompt}>
          <h2 className={styles.resumeTitle}>前回の続きがあります</h2>
          <p className={styles.resumeInfo}>
            {savedProgress.cardFronts.length}枚中 {done}枚完了（残り{remaining}枚）
          </p>
          <div className={styles.resumeButtons}>
            <button onClick={resumeSession} className={styles.btnResume}>
              続きから再開
            </button>
            <button onClick={startNewSession} className={styles.btnNewSession}>
              最初から始める
            </button>
          </div>
        </div>
      </div>
    )
  }

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
            <span>問題を見る</span>
            <span className={styles.keyHint}>スペース</span>
          </button>
          <button
            onClick={() => handleAnswer('incorrect')}
            className={styles.btnIncorrect}
          >
            <span>不正解</span>
            <span className={styles.keyHint}>← / 1</span>
          </button>
          <button
            onClick={() => handleAnswer('correct')}
            className={styles.btnCorrect}
          >
            <span>正解</span>
            <span className={styles.keyHint}>→ / 2</span>
          </button>
        </div>
      )}
    </div>
  )
}
