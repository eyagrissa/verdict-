# Verdict

Outil web qui compare plusieurs résultats générés par IA (Gemini + Groq), suggère des critères d’évaluation selon le domaine de la tâche, puis produit un classement avec verdict justifié et niveau de confiance.

## Structure

```
verdict/
├── backend/          # API Express (Node.js)
│   ├── package.json
│   └── src/
│       ├── server.js
│       ├── routes/
│       ├── services/
│       └── utils/
├── frontend/         # HTML / CSS / JS (pas de build)
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── .env.example
└── README.md
```

## Prérequis

- Node.js 18 ou supérieur
- Une clé API [Google Gemini](https://aistudio.google.com/apikey)
- Une clé API [Groq](https://console.groq.com/keys)

## Configuration

1. Copiez le fichier d’exemple :

```bash
cp .env.example .env
```

2. Éditez `.env` à la racine du projet et renseignez vos clés :

```
GEMINI_API_KEY=votre_cle_gemini
GROQ_API_KEY=votre_cle_groq
PORT=3001
```

Le backend charge `.env` depuis `backend/.env` **ou** depuis la racine du projet.

## Installation

```bash
cd backend
npm install
```

## Démarrage

### Option recommandée (API + frontend servis ensemble)

Depuis le dossier `backend/` :

```bash
npm start
```

Puis ouvrez [http://localhost:3001](http://localhost:3001) dans le navigateur.

Mode rechargement auto :

```bash
npm run dev
```

### Frontend séparé (optionnel)

Si vous servez le frontend sur un autre port, définissez l’URL de l’API avant le chargement de `app.js` :

```html
<script>window.VERDICT_API_BASE = "http://localhost:3001";</script>
```

Par défaut (recommandé), le frontend est servi par Express sur le même port et utilise des URLs relatives `/api/...`.

## Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/health` | Santé + présence des clés (sans les exposer) |
| `POST` | `/api/generate` | Génère 2 versions (Gemini + Groq) en parallèle |
| `POST` | `/api/suggest-criteria` | Suggère 3–4 critères pondérés via Gemini |
| `POST` | `/api/compare` | Compare les versions et renvoie le verdict |

### Exemples curl

```bash
# Génération
curl -s -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{"task":"Écris une fonction JS qui inverse une chaîne"}'

# Critères
curl -s -X POST http://localhost:3001/api/suggest-criteria \
  -H "Content-Type: application/json" \
  -d '{"task":"Écris une fonction JS qui inverse une chaîne","versionsPreview":["function reverse(s){return s.split(\"\").reverse().join(\"\")}"]}'

# Comparaison (adapter les contenus)
curl -s -X POST http://localhost:3001/api/compare \
  -H "Content-Type: application/json" \
  -d '{
    "task":"Écris une fonction JS qui inverse une chaîne",
    "weightedCriteria":[{"name":"Correctness","weight":9},{"name":"Clarté","weight":6}],
    "versions":[
      {"id":"gemini","source":"Gemini","content":"function reverse(s){return [...s].reverse().join(\"\");}"},
      {"id":"groq","source":"Groq","content":"function reverse(str){let r=\"\";for(let i=str.length-1;i>=0;i--)r+=str[i];return r;}"}
    ]
  }'
```

## Sécurité

Les clés `GEMINI_API_KEY` et `GROQ_API_KEY` sont lues **uniquement** côté serveur via `process.env`. Elles ne sont jamais envoyées au navigateur ni incluses dans le code frontend.

## Limites connues

- Pas de base de données : aucune sauvegarde entre sessions
- Pas d’authentification utilisateur
- Comparaison limitée à des versions fournies dans la requête (2 à 6)
