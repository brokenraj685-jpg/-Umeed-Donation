import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./style.css?v=3";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    console.error("Umeed app render error:", error);
  }
  render() {
    if (this.state.error) {
      return <main style={{minHeight:"100vh",padding:"32px 20px",fontFamily:"Arial,sans-serif",color:"#183b2a",background:"#f7faf7"}}>
        <h1>Umeed is temporarily unavailable</h1>
        <p>Page load karte waqt error aaya hai. Please refresh karein.</p>
        <button onClick={() => window.location.reload()} style={{padding:"12px 20px",background:"#166534",color:"#fff",border:0,borderRadius:8}}>Reload website</button>
      </main>;
    }
    return this.props.children;
  }
}

// Remove the old service worker/cache so the browser cannot keep showing an outdated app shell.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(registrations => registrations.forEach(registration => registration.unregister()))
    .catch(console.warn);
}
if ("caches" in window) {
  caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).catch(console.warn);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppErrorBoundary><App /></AppErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
