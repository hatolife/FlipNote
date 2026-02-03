import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import DeckList from './pages/DeckList'
import DeckDetail from './pages/DeckDetail'
import CardEdit from './pages/CardEdit'
import Study from './pages/Study'
import Result from './pages/Result'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/v1/" replace />} />
        <Route path="/v1/" element={<Home />} />
        <Route path="/v1/decks" element={<DeckList />} />
        <Route path="/v1/deck/:deckName" element={<DeckDetail />} />
        <Route path="/v1/deck/:deckName/card/new" element={<CardEdit />} />
        <Route path="/v1/deck/:deckName/card/:front/edit" element={<CardEdit />} />
        <Route path="/v1/deck/:deckName/study" element={<Study />} />
        <Route path="/v1/deck/:deckName/result" element={<Result />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
