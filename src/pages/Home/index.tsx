import { Link } from 'react-router-dom'
import styles from './Home.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>FlipNote</h1>
      <p className={styles.subtitle}>学習用単語カード</p>
      <nav className={styles.nav}>
        <Link to="/v1/decks" className={styles.link}>
          デッキ一覧
        </Link>
      </nav>
    </div>
  )
}
