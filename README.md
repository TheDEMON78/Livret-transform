```
 ____   ____ _   _  ___   ___  _        _____ ___   ___  _     
/ ___| / ___| | | |/ _ \ / _ \| |      |_   _/ _ \ / _ \| |    
\___ \| |   | |_| | | | | | | | |   _____| || | | | | | | |    
 ___) | |___|  _  | |_| | |_| | |__|_____| || |_| | |_| | |___ 
|____/ \____|_| |_|\___/ \___/|_____|    |_| \___/ \___/|_____|
```

Une boîte à outils scolaire, 100% statique et **côté navigateur** — aucun
fichier ni réglage n'est envoyé sur un serveur.

## 📖 Brochure A5

Convertit un PDF A4 (pages dans l'ordre de 1 à N) en brochure A5 imprimable
recto-verso, prête à plier et agrafer — comme le fait
[online2pdf.com/fr/creer-brochure-flipbook](https://online2pdf.com/fr/creer-brochure-flipbook#),
grâce à [pdf-lib](https://pdf-lib.js.org/).

Dépose un PDF A4 dans l'onglet **Brochure A5**, puis télécharge la brochure
générée. Il ne reste plus qu'à l'imprimer en recto-verso, plier la pile en
deux et agrafer au centre.

Le PDF source est découpé en cahiers de 4 pages. Chaque feuille A4 imprimée
contient 2 pages A5 recto et 2 pages A5 verso, dans l'ordre d'imposition
d'une brochure agrafée (par exemple, pour un document de N pages, la
première feuille porte la page N à côté de la page 1). Si le nombre de
pages n'est pas un multiple de 4, des pages blanches sont ajoutées à la fin.
Les marges (extérieure, reliure, haute, basse) sont réglables.

## 📐 Papeterie

Générateur de trames/réglures configurable (façon
[Keskiss'trame](https://keskisstrame.forge.apps.education.fr/papeterie/)) :
lignes simples, réglure Séyès (avec quadrillage optionnel), quadrillage uni
ou coloré, croisillons, points, et un lignage **Serpodile** (Terre-Herbe-Ciel)
pensé pour les enfants dys — bandes colorées marron/vert/bleu qui aident à
situer spatialement les lettres, plus une marge rouge verticale. Réglages :
interligne, couleurs, épaisseur, séparatrice, format de page (A4/A5/Letter,
portrait/paysage), marges, en-tête, encart de commentaires. Export en
impression directe (mise en page physique exacte) ou en SVG, et un lien
partageable qui restaure exactement la configuration choisie.

## Développement local

Le site est 100% statique (`index.html`, `style.css`, `app.js`,
`papeterie.js`). Pour le tester en local :

```bash
python3 -m http.server 8000
```

puis ouvre `http://localhost:8000`.

## Activer GitHub Pages

Dans les paramètres du dépôt (`Settings > Pages`), choisis comme source
`Deploy from a branch`, branche `main`, dossier `/ (root)`.

## App de bureau (Windows / macOS / Linux)

Cette branche (`desktop-app`) embarque la même page web dans une app
[Electron](https://www.electronjs.org/) installable sur ordinateur. Tous les
calculs restent faits dans le navigateur intégré (Chromium), et la
bibliothèque `pdf-lib` est livrée localement dans `vendor/` — l'app ne fait
aucune requête réseau au démarrage ni pendant la conversion.

### Lancer en local

```bash
npm install
npm start
```

### Construire un installeur

```bash
npm run dist:win     # .exe (NSIS + portable)
npm run dist:mac     # .dmg / .zip
npm run dist:linux   # .AppImage / .deb
```

Les fichiers générés se trouvent dans `dist/`.

### Releases automatiques

Un workflow GitHub Actions (`.github/workflows/release.yml`) construit
automatiquement les installeurs Windows, macOS et Linux à chaque push sur
`desktop-app`, puis publie une nouvelle Release GitHub avec un numéro de
version incrémenté (`1.0.<numéro de run>`). Seules les 10 releases les plus
récentes sont conservées, les plus anciennes sont supprimées
automatiquement.

### macOS : « l'app est endommagée »

L'app n'est pas signée par un certificat Apple payant (juste signée en
ad-hoc en interne pour qu'elle puisse se lancer sur Apple Silicon). macOS
peut donc afficher un avertissement au premier lancement. Si un message dit
que l'app est « endommagée et ne peut pas être ouverte », c'est en réalité
l'attribut de quarantaine posé par le navigateur au téléchargement, pas un
vrai problème de fichier. Dans le Terminal :

```bash
xattr -cr "/Applications/School-tool.app"
```

(adapte le chemin si l'app n'est pas encore dans `/Applications`). Ensuite
l'app s'ouvre normalement — au pire avec l'avertissement classique
« développeur non identifié », qui se contourne avec un clic droit sur
l'app puis « Ouvrir ».
