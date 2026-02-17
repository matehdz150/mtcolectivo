import { createRoot } from 'react-dom/client'
import App from './App';
import './styles/global.scss'
import { Toaster } from 'sileo';

createRoot(document.getElementById('root')).render(
    <>
    <Toaster position="top-center" />
    <App />
    </>
)
