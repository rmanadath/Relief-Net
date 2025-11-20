import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" })); // tighten later to your frontend origin

app.get("/health", (_req, res) => res.json({ ok: true }));

// placeholder route optimization endpoint (wire up later)
app.post("/api/route/optimize", async (req, res) => {
  res.json({ waypointOrder: [], polyline: null, note: "stub endpoint" });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`API listening on :${port}`));
