import { useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import styles from './Result.module.css'

interface StudyResult {
  front: string
  back: string
  result: 'correct' | 'incorrect'
}

export default function Result() {
  const { deckName: rawDeckName } = useParams<{ deckName: string }>()
  const deckName = decodeURIComponent(rawDeckName ?? '')
  const navigate = useNavigate()

  const results: StudyResult[] = useMemo(() => {
    const stored = sessionStorage.getItem(`flipnote-results-${deckName}`)
    return stored ? JSON.parse(stored) : []
  }, [deckName])

  const correctCount = results.filter((r) => r.result === 'correct').length
  const incorrectResults = results.filter((r) => r.result === 'incorrect')
  const total = results.length
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0

  if (total === 0) {
    navigate(`/v1/deck/${encodeURIComponent(deckName)}`)
    return null
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>学習結果</h1>

      <div className={styles.summary}>
        <div className={styles.score}>
          <span className={styles.scoreNumber}>{percentage}</span>
          <span className={styles.scorePercent}>%</span>
        </div>
        <p className={styles.detail}>
          {correctCount} / {total} 正解
        </p>
      </div>

      {incorrectResults.length > 0 && (
        <div className={styles.incorrectSection}>
          <h2 className={styles.incorrectTitle}>間違えたカード</h2>
          <ul className={styles.incorrectList}>
            {incorrectResults.map((r) => (
              <li key={r.front} className={styles.incorrectItem}>
                <span className={styles.incorrectFront}>{r.front}</span>
                <span className={styles.incorrectBack}>{r.back}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.actions}>
        {incorrectResults.length > 0 && (
          <Link
            to={`/v1/deck/${encodeURIComponent(deckName)}/study`}
            className={styles.btnPrimary}
          >
            もう一度学習する
          </Link>
        )}
        <Link to="/v1/" className={styles.btnSecondary}>
          ホームに戻る
        </Link>
      </div>
    </div>
  )
}
