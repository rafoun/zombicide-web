export default function GameOverScreen({ gameState }) {
  const { round, characters } = gameState;
  const totalKills = characters.reduce((sum, c) => sum + c.zombieKills, 0);

  return (
    <div className="app game-over">
      <h1>Partie terminée</h1>
      <p className="game-over__summary">
        Tous les survivants sont tombés à la manche {round}. {totalKills} zombie(s) éliminé(s) au total.
      </p>

      <ul className="game-over__list">
        {characters.map((c) => (
          <li key={c.playerId} className="game-over__character">
            <span className="game-over__name">{c.name}</span>
            <span className="game-over__stat">{c.zombieKills} zombie(s) tué(s)</span>
          </li>
        ))}
      </ul>

      <button onClick={() => window.location.reload()}>Retour à l'accueil</button>
    </div>
  );
}
