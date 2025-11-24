const API_BASE = process.env.REACT_APP_API_BASE; // set this in .env

export async function getHealth() {
  const r = await fetch(`${API_BASE}/health`);
  if (!r.ok) throw new Error("API health failed");
  return r.json();
}

export async function optimizeRoute({ origin, destination, waypoints = [] }) {
  const r = await fetch(`${API_BASE}/api/route/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, destination, waypoints })
  });
  if (!r.ok) throw new Error("Optimize failed");
  return r.json();
}
