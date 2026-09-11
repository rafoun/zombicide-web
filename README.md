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
  précision est une touche ; les touches sont assignées par ordre de priorité
  (Brute/Abomination puis Marcheur puis Coureur) ; une arme trop faible ne
  peut pas achever un zombie trop résistant.
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
- Le combat à distance n'est pas encore différencié du combat au corps à
  corps : on attaque toujours sa propre zone.
- Pas de scénarios/objectifs de mission : mode "survie" libre.

## Lancer en local

```bash
cd server && npm install && npm run dev
```
```bash
cd client && npm install && npm run dev
```
Ouvre http://localhost:5173 dans plusieurs onglets pour tester à plusieurs.
