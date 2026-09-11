# Zombicide Web

Jeu multijoueur en ligne (2 à 8 joueurs) reprenant les règles officielles de
Zombicide 2e édition (dans une version simplifiée).

## Structure

```
zombicide-web/
  server/
    index.js            Salons (lobby), Socket.io, dispatch des actions
    game/
      board.js           Grille de zones, murs, calcul de déplacement
      decks.js           Cartes équipement, table de spawn, seuils d'adrénaline
      zombies.js         IA zombie (spawn + activation) fidèle au livret de règles
      actions.js         Déplacement, fouille, combat (dés/précision/dégâts, priorité des cibles)
      state.js           État de partie initial
  client/
    src/
      App.jsx            Lobby + orchestration de l'écran de jeu (3 colonnes)
      PlayerPanel.jsx     Fiche personnage (blessures, adrénaline, actions)
      Board.jsx           Plateau (murs, zombies, personnages)
      InventoryPanel.jsx  Inventaire avec infobulle au survol
      EventLog.jsx        Journal des morsures / éliminations
```

## Règles reprises du livret officiel

- **4 types de zombies** avec leurs vrais seuils d'élimination : Marcheur et
  Coureur (dégâts 1), Brute (dégâts 2), Abomination (dégâts 3, une seule à la
  fois sur le plateau).
- **Combat** : on lance autant de dés que l'indique l'arme ; chaque dé ≥ sa
  précision est une touche ; une arme trop faible ne peut pas achever un
  zombie trop résistant.
- **Mêlée vs Tir à distance** (règle p. 27-28 du livret) : chaque arme a un
  mode (`melee` ou `ranged`). En **tir à distance**, l'Ordre de Priorité des
  cibles s'applique (Brute/Abomination puis Marcheur puis Coureur) et chaque
  dé raté déclenche un **Tir Ami** : un Survivant présent dans la même zone
  (jamais l'attaquant) encaisse les Dégâts de l'arme. En **corps à corps**,
  pas de Tir Ami possible, même en cas d'échec.
- **Blessures** : 3 blessures = mort, comme un Survivant classique.
- **Adrénaline** : chaque zombie tué donne des Points d'Adrénaline ; à 7 PA un
  personnage gagne une 4e Action ; le niveau de danger le plus élevé parmi les
  survivants déterminera le nombre de zombies qui apparaissent.
- **IA zombie** : un zombie déjà dans la zone d'un survivant mord (1 blessure,
  sans jet de dé) ; sinon il avance d'une case vers le survivant le plus
  proche (calcul de chemin) ; les Coureurs ont 2 Actions par activation.

## Simplifications volontaires (v1)

- Une seule tuile de plateau (pas encore plusieurs tuiles à assembler).
- Pas encore de vraies zones "bâtiment" : la Fouille est utilisable partout.
- Le tir à distance vise toujours la propre zone de l'attaquant (pas encore
  de portée min/max ni de ligne de vue entre zones différentes).
- Pas d'armes Dual (2 armes identiques tirées en une seule Action).
- En mêlée, les touches sont réparties automatiquement en maximisant les
  éliminations plutôt que laissées au libre choix du joueur (le livret laisse
  le joueur choisir librement en mêlée, sans Ordre de Priorité imposé).
- Pas de scénarios/objectifs de mission : mode "survie" libre.

## Lancer en local

```bash
cd server && npm install && npm run dev
```
```bash
cd client && npm install && npm run dev
```
Ouvre http://localhost:5173 dans plusieurs onglets pour tester à plusieurs.
