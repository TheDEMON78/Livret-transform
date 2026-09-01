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
