const DANGER_THRESHOLDS = { blue: 0, yellow: 7, orange: 19, red: 43 };

function dangerLevel(adrenaline) {
  if (adrenaline >= DANGER_THRESHOLDS.red) return "red";
  if (adrenaline >= DANGER_THRESHOLDS.orange) return "orange";
  if (adrenaline >= DANGER_THRESHOLDS.yellow) return "yellow";
  return "blue";
}

const WOUND_TRACK = ["blue", "yellow", "orange", "red"]; // red = mort (3e blessure)

export default function PlayerPanel({ character, isMyTurn, hasZombiesHere, onSearch, onAttack, onEndTurn }) {
  if (!character) return null;

  const woundIndex = character.dead ? 3 : character.wounds; // 0,1,2 blessures -> index ; mort -> 3
  const level = dangerLevel(character.adrenaline);

  return (
    <aside className="player-panel">
      <h2 className="player-panel__name">{character.name}</h2>
      {character.dead && <p className="dead-label">Éliminé</p>}

      <div className="wound-track">
        {WOUND_TRACK.map((color, i) => (
          <div key={color} className={`wound-pip wound-pip--${color} ${i === woundIndex ? "wound-pip--active" : ""}`} />
        ))}
      </div>
      <p className="wound-label">{character.dead ? "Mort" : `${character.wounds}/3 blessures`}</p>

      <div className="stat-block">
        <span className="stat-block__label">Actions</span>
        <div className="action-pips">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`action-pip ${i < character.actionsLeft ? "action-pip--full" : ""}`} />
          ))}
        </div>
      </div>

      <div className="stat-block">
        <span className="stat-block__label">Adrénaline — Niveau {level}</span>
        <div className="kill-gauge">
          <span className="kill-gauge__count">{character.adrenaline}</span>
          <div className="kill-gauge__bar">
            <div className="kill-gauge__fill" style={{ width: `${Math.min(character.adrenaline * 2, 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="stat-block">
        <span className="stat-block__label">Zombies éliminés</span>
        <p className="kill-total">{character.zombieKills}</p>
      </div>

      {isMyTurn && !character.dead && (
        <div className="player-panel__actions">
          {character.actionsLeft > 0 && hasZombiesHere && (
            <button onClick={onAttack}>Attaquer (mêlée)</button>
          )}
          {character.actionsLeft > 0 && <button onClick={onSearch}>Fouiller</button>}
          <button className="button--secondary" onClick={onEndTurn}>Terminer mon tour</button>
        </div>
      )}
    </aside>
  );
}
