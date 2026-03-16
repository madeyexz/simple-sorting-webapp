import { useState } from "react";
import Dashboard from "./Dashboard";

const CORRECT_PASSWORD = "GTCE in 2026";

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => {
    return sessionStorage.getItem("sorting-auth") === "true";
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      sessionStorage.setItem("sorting-auth", "true");
      setAuthenticated(true);
    } else {
      setError(true);
    }
  }

  if (!authenticated) {
    return (
      <div className="password-gate">
        <form className="password-card" onSubmit={handleLogin}>
          <h1>Sorting Dashboard</h1>
          <p>Enter password to continue</p>
          {error && <div className="error">Incorrect password</div>}
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="Password"
            autoFocus
          />
          <button type="submit">Enter</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Dashboard />
    </div>
  );
}
