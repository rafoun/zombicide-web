// Écran de fin de partie à part entière (pas juste un bandeau) : prend tout
// l'écran, résume ce qui s'est passé, et propose de relancer une partie.
export default function GameOverScreen({ gameState, isHost, onPlayAgain }) {
  const { gameOver, round, characters, scenarioName } = gameState;
  const won = gameOver?.result === "won";
  const totalKills = characters.reduce((sum, c) => sum + c.zombieKills, 0);
  const sorted = [...characters].sort((a, b) => b.zombieKills - a.zombieKills);

  return (
    <div className="game-over-screen">
      <div className={`game-over-screen__panel game-over-screen__panel--${gameOver?.result}`}>
        <span className="game-over-screen__scenario">{scenarioName}</span>
        <h1 className="game-over-screen__title">{won ? "Victoire" : "Défaite"}</h1>
        <p className="game-over-screen__reason">{gameOver?.reason}</p>

        <div className="game-over-screen__summary">
          <div>
            <span className="game-over-screen__stat">{round}</span>
            <span className="game-over-screen__stat-label">Manches jouées</span>
          </div>
          <div>
            <span className="game-over-screen__stat">{totalKills}</span>
            <span className="game-over-screen__stat-label">Zombies éliminés</span>
          </div>
        </div>

        <ul className="game-over-screen__list">
          {sorted.map((c) => (
            <li key={c.playerId} className={`game-over-screen__character ${c.dead ? "game-over-screen__character--dead" : ""}`}>
              <span className="game-over-screen__name">{c.name}</span>
              <span className="game-over-screen__status">{c.dead ? "Mort" : `${c.wounds}/3 blessures`}</span>
              <span className="game-over-screen__kills">{c.zombieKills} kill{c.zombieKills > 1 ? "s" : ""}</span>
            </li>
          ))}
        </ul>

        {isHost ? (
          <button onClick={onPlayAgain}>Retour au salon</button>
        ) : (
          <p className="game-over-screen__waiting">En attente que l'hôte relance une partie...</p>
        )}
      </div>
    </div>
  );
}
