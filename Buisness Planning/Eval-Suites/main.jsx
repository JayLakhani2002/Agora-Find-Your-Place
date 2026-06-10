// Vite entry — mounts the agent eval suite selector.
import React from "react"
import ReactDOM from "react-dom/client"
import AgoraEvalSuites from "./index.jsx"
import "./styles.css"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AgoraEvalSuites />
  </React.StrictMode>,
)
