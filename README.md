# Durée

Extension Cursor qui suit le temps de code sur la machine où le dossier est ouvert. Le journal reste dans `~/.duree/heartbeats.jsonl`. Aucun envoi réseau.

Elle tourne à côté de WakaTime. Elle ne le remplace pas.

## Ce qui est enregistré

Chaque heartbeat contient le chemin du fichier, le projet, la branche git, le langage, les dépendances, la position du curseur, la catégorie (`coding`, `ai coding`, `debugging`, `building`, `code reviewing`), la machine, l'éditeur, l'OS, les lignes humaines, les lignes IA, la session IA, les tokens et la longueur des prompts.

Les dépendances viennent du fichier ouvert : JavaScript, TypeScript, Python, Go, Rust, et `package.json`. L'activité IA est lue dans `~/.claude`, `~/.codex` et les transcripts Cursor. Le premier passage ignore l'historique déjà écrit.

Le journal ne contient ni le texte des fichiers, ni le texte des prompts.

## Utilisation

L'extension démarre avec la fenêtre Cursor. La barre de statut affiche une montre, puis le temps.

Palette de commandes, `Durée: aujourd'hui` : total, projets, langages, catégories, branches, fichiers, éditeurs, systèmes, machines, lignes et tokens.

Une frappe est notée au plus une fois toutes les 2 minutes par fichier. Une sauvegarde est toujours notée. Une pause de plus de 15 minutes coupe la session.

## Installer sur un VPS

Ouvre ce VPS dans Cursor une fois, pour créer `~/.cursor-server`. Copie ce dépôt, puis :

```bash
cd codetime
npm install
npm run build
DEST="$HOME/.cursor-server/extensions/yogaa.duree-0.3.0"
mkdir -p "$DEST/dist"
cp package.json "$DEST/package.json"
find dist -name '*.js' ! -name '*.test.js' -exec cp {} "$DEST/dist/" \;
```

Dans Cursor, sur ce VPS : `Developer: Reload Window`.

Le journal de ce VPS est `~/.duree/heartbeats.jsonl`. Un autre ordinateur a le sien. Un ancien dossier `~/.codetime` est renommé en `~/.duree` au premier lancement.

## Développement

Node.js et npm.

```bash
npm install
npm test
npm run build
```
