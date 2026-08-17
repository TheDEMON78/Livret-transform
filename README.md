# Livret Transform

Convertit un PDF A4 (pages dans l'ordre de 1 à N) en brochure A5 imprimable
recto-verso, prête à plier et agrafer — comme le fait
[online2pdf.com/fr/creer-brochure-flipbook](https://online2pdf.com/fr/creer-brochure-flipbook#).

Tout se passe **côté navigateur** (grâce à [pdf-lib](https://pdf-lib.js.org/)) :
aucun fichier n'est envoyé sur un serveur.

## Utilisation

Ouvre [la page en ligne](https://thedemon78.github.io/Livret-transform/),
dépose ton PDF A4, puis télécharge la brochure A5 générée. Il ne reste plus
qu'à l'imprimer en recto-verso, plier la pile en deux et agrafer au centre.

## Développement local

Le site est 100% statique (`index.html`, `style.css`, `app.js`). Pour le
tester en local :

```bash
python3 -m http.server 8000
```

puis ouvre `http://localhost:8000`.

## Comment ça marche

Le PDF source est découpé en cahiers de 4 pages. Chaque feuille A4 imprimée
contient 2 pages A5 recto et 2 pages A5 verso, dans l'ordre d'imposition
d'une brochure agrafée (par exemple, pour un document de N pages, la
première feuille porte la page N à côté de la page 1). Si le nombre de
pages n'est pas un multiple de 4, des pages blanches sont ajoutées à la fin.

## Activer GitHub Pages

Dans les paramètres du dépôt (`Settings > Pages`), choisis comme source
`Deploy from a branch`, branche `main`, dossier `/ (root)`.
