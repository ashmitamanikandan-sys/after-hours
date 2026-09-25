# AFTER HOURS
### AstraTech Security Operations — Incident AH-0213

**After Hours** is a one-story, interactive defensive cybersecurity simulation set on the highest floor of AstraTech during a severe thunderstorm.

It is deliberately **not** styled like a neon arcade cyberpunk game. The direction is a realistic, cinematic corporate cyber-thriller: dark office glass, heavy rain, thunder, restrained blue/purple lighting, believable security interfaces, and interactive evidence review.

## What V2 adds
- New title and visual identity: **After Hours**
- Mission-briefing opening instead of an arcade-style start screen
- Heavy animated rain, storm clouds, skyline, glass reflections, and lightning
- Rain ambience + low tension tone + restrained alerts generated in-browser with Web Audio
- Same investigation shell across all rooms for realism and consistency
- Interactive evidence selection in every investigation stage
- No instant correctness feedback — consequences are revealed later
- Six-stage incident investigation
- Final corporate incident report with rank, exposure status, metrics, attack path, and timeline
- Responsive layout for laptop screens

## Stack
- **HTML** — application structure
- **CSS** — storm environment, glass UI, skyline, motion, responsive layout
- **JavaScript** — gameplay, evidence selection, timers, hidden consequences, Web Audio, final report flow
- **Python / Flask** — local server and scoring/report logic
- **JSON** — scenario content, evidence, response actions, attack timeline

The languages are used because they have a clear purpose; no extra language is included just to make the stack look larger.

## Run in VS Code (Windows)
1. Open this folder in VS Code.
2. Open **Terminal → New Terminal**.
3. Create the environment:
   `python -m venv .venv`
4. Activate it:
   `.venv\Scripts\Activate.ps1`
5. Install Flask:
   `pip install -r requirements.txt`
6. Run:
   `python app.py`
7. Open:
   `http://127.0.0.1:5000`

If `.venv` already exists and Flask is already installed, usually you only need:

```powershell
.venv\Scripts\Activate.ps1
python app.py
```

## Folder structure
```text
after_hours_v2/
├── app.py
├── requirements.txt
├── README.md
├── data/
│   └── scenario.json
├── templates/
│   └── index.html
└── static/
    ├── style.css
    └── game.js
```

## Safety
This is a fictional, defensive training experience. It teaches recognition, investigation, and containment. It does not include exploit instructions, real targets, credential collection, or malicious automation.