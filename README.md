# Zombicide Web

Jeu multijoueur en ligne (2 à 8 joueurs) inspiré des règles officielles de Zombicide.

## Structure

```
zombicide-web/
  server/              Serveur Node.js (autorité sur l'état de partie)
    index.js           Gestion des salons (lobby), connexions, points d'entrée Socket.io
    game/
      state.js          Squelette de l'état de partie (à enrichir avec le moteur de règles)
  client/              Client React (Vite)
    src/
      App.jsx           Écran de lobby : créer/rejoindre un salon
      socket.js         Connexion au serveur
      main.jsx
```

## Lancer en local

Terminal 1 — serveur :
```bash
cd server
npm install
npm run dev
```

Terminal 2 — client :
```bash
cd client
npm install
npm run dev
```
Puis ouvre http://localhost:5173 (un onglet par joueur pour tester en local).

## Ce qui est déjà en place

- Création/rejoindre un salon avec un code à 5 caractères
- Liste des joueurs connectés en temps réel
- L'hôte peut lancer la partie une fois 2 joueurs minimum présents
- Un état de partie vide est créé et diffusé à tous (`createInitialGameState`)

## Prochaines étapes (dans l'ordre logique)

1. **Plateau** : modéliser les tuiles Zombicide (grille, portes, zones de spawn), les afficher côté client, permettre le déplacement des pions et le synchroniser via `game_action`.
2. **Decks** : deck de cartes zombies (spawn) et deck d'équipement, tirage et pioche/défausse synchronisées.
3. **Règles de combat et ligne de vue** : calcul de la ligne de vue sur la grille, jets de dés, résolution des combats.
4. **IA des zombies** : logique d'activation (bruit, ligne de vue, déplacement vers la cible la plus proche) à chaque fin de tour.
5. **Gestion de partie** : scénarios, objectifs de victoire/défaite, montée en niveau de danger (bleu → jaune → orange → rouge).

Tout le moteur de règles doit rester **côté serveur** (`server/game/`) pour que le client ne fasse qu'afficher l'état et envoyer des actions — ça évite la triche et garde tout le monde synchronisé.
