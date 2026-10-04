import { createRoot } from 'react-dom/client'
import './styles/protrainer.css'
import './styles/modern.css'
import './index.css'
import App from './App'
import { AppProvider } from './context/AppContext'

createRoot(document.getElementById('root')!).render(
  <AppProvider>
    <App />
  </AppProvider>,
)
