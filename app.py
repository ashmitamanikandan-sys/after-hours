from flask import Flask, render_template, jsonify, request
import json
from pathlib import Path

app = Flask(__name__)
BASE = Path(__file__).resolve().parent

with open(BASE / "data" / "scenario.json", "r", encoding="utf-8") as fh:
    SCENARIO = json.load(fh)

@app.get("/")
def index():
    return render_template("index.html")

@app.get("/api/scenario")
def get_scenario():
    return jsonify(SCENARIO)

@app.post("/api/report")
def build_report():
    payload = request.get_json(force=True) or {}
    evidence = int(payload.get("evidence", 0))
    total_evidence = max(1, int(payload.get("totalEvidence", 1)))
    mistakes = max(0, int(payload.get("mistakes", 0)))
    missed = max(0, int(payload.get("missed", 0)))
    threat = max(0, min(100, int(payload.get("threat", 0))))
    containment = max(0, min(100, int(payload.get("containment", 0))))

    evidence_ratio = evidence / total_evidence
    score = round(
        evidence_ratio * 55
        + containment * 0.35
        + max(0, 10 - mistakes * 2 - missed)
    )
    score = max(0, min(100, score))

    if score >= 90:
        rank = "Incident Commander"
    elif score >= 78:
        rank = "Threat Investigator"
    elif score >= 64:
        rank = "Security Analyst"
    else:
        rank = "Junior Responder"

    if containment >= 75 and threat <= 45:
        outcome = "Contained"
        exposure = "Prevented"
    elif containment >= 50:
        outcome = "Partially Contained"
        exposure = "Limited"
    else:
        outcome = "Escalated"
        exposure = "Likely"

    return jsonify({
        "rank": rank,
        "score": score,
        "outcome": outcome,
        "exposure": exposure,
        "evidenceSummary": f"{evidence}/{total_evidence}",
        "mistakes": mistakes,
        "missed": missed,
        "threat": threat,
        "containment": containment,
        "message": "Your earlier choices were intentionally hidden. The timeline below shows where the incident accelerated, and where your response changed its path."
    })

if __name__ == "__main__":
    app.run(debug=True)