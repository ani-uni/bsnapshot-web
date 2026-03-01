import React from 'react'
import ReactDOM from 'react-dom/client'
import { HydratedRouter } from 'react-router/dom'

// import App from './App.tsx'
import '@/styles/globals.css'

ReactDOM.hydrateRoot(
  document,
  <React.StrictMode>
    <HydratedRouter />
  </React.StrictMode>,
)

// const rootElement = document.getElementById('root')
// if (rootElement) {
//   ReactDOM.createRoot(rootElement).render(
//     <React.StrictMode>
//       <ThemeProvider>
//         <BrowserRouter>
//           <App />
//         </BrowserRouter>
//       </ThemeProvider>
//     </React.StrictMode>,
//   )
// }
