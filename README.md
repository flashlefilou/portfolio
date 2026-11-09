# Portfolio · Anthony Merlin

Site one-page en HTML, CSS et JavaScript pur (sans CMS, sans framework, sans back-end), pour R3.12.

## Arborescence

```
portfolio/
├── index.html              contenu + fiches projets (balises <template>)
├── css/style.css           thèmes clair/sombre, mise en page, responsive
├── js/main.js              terminal, filtres, pop-ups, scroll-spy, formulaire, bascule FR/EN
├── js/i18n-fr.js           traductions françaises (clé = texte anglais exact)
├── cv/CV_Anthony_MERLIN_International.pdf
└── img/
    ├── me.jpg              ta photo (carrée, ~640×640)
    └── projects/           captures 16:9 (~1600×900), noms ci-dessous
```

## Images à déposer

Tant qu'une image manque, le site affiche à sa place une vignette propre (le nom du projet sur une grille). Il suffit de déposer le fichier avec le bon nom, sans toucher au code.

| Fichier | Quoi mettre |
|---|---|
| `img/me.jpg` | ta photo |
| `img/projects/benevolt.png` | diagramme de classes métier ou MCD |
| `img/projects/yaasystem.png` | terminal du Raspberry Pi, ou le WordPress en ligne |
| `img/projects/motorbike.png` | capture du jeu en partie |
| `img/projects/portfolio.png` | capture de ce site |
| `img/projects/basicfit.png` | une maquette d'écran du cahier des charges |
| `img/projects/matski.png` | le modèle de données |
| `img/projects/personal-site.png` | ton site GitHub Pages |

Tu peux aussi déposer du `.jpg` ou du `.webp`, mais il faut alors changer l'extension dans `index.html` (chercher `img/projects/`).

## Ajouter ou modifier un projet

1. Dans `index.html`, copie un `<li class="tile">` dans `<ul id="tiles">`, puis change son `id` (`project-xxx`), `data-tech` et `data-open-project="xxx"`.
2. Copie un `<template id="tpl-...">` et renomme-le `tpl-xxx`.
3. Dans `js/main.js`, ajoute `xxx` dans `projectIds` et dans `projectNames` (pour le terminal).

Valeurs possibles de `data-tech` (ce sont celles des filtres) : `uml sql csharp linux web php git scrum`.

## Traduction FR / EN

Le site est écrit en anglais dans `index.html`. Le bouton FR/EN remplace chaque texte par sa traduction trouvée dans `js/i18n-fr.js`, où la clé est le texte anglais exact (espaces mis à part). Le choix est mémorisé dans le navigateur.

Si tu modifies un texte anglais, modifie aussi sa clé dans `js/i18n-fr.js`, sinon il restera en anglais en mode FR. Un texte absent du fichier (nom de techno, adresse e-mail…) reste simplement tel quel.

## Bandeau « en construction »

C'est le bloc `<div class="wip-banner">` tout en haut de `index.html`. Supprime-le quand le portfolio sera terminé.

## Déploiement sur le serveur de M. Damas (OVH)

```bash
# depuis le dossier parent de portfolio/
scp -r portfolio/ <login>@51.83.36.122:~/public_html/
# puis vérifier les droits de lecture
ssh <login>@51.83.36.122 "chmod -R a+rX ~/public_html/portfolio"
```

## Déploiement sur flash-dev.online (GitHub Pages)

Tous les chemins sont relatifs, donc le même dossier fonctionne aux deux endroits.
Pousse le contenu de `portfolio/` à la racine du dépôt `flashlefilou.github.io`, puis vérifie dans Settings → Pages que le domaine personnalisé est bien `flash-dev.online`.

## Tester en local

```bash
cd portfolio && python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```
L'ouverture directe du fichier (double-clic) marche aussi, mais la visionneuse PDF est plus fiable avec un petit serveur.
