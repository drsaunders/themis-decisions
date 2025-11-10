import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store'
import NameScreen from './screens/NameScreen'
import HomeScreen from './screens/HomeScreen'
import PollScreen from './screens/PollScreen'
import ResultScreen from './screens/ResultScreen'

function App() {
  const user = useStore((state) => state.user)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <HomeScreen /> : <NameScreen />} />
        <Route path="/poll/:pollId" element={user ? <PollScreen /> : <Navigate to="/" />} />
        <Route path="/poll/:pollId/result" element={user ? <ResultScreen /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

