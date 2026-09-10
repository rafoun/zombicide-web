const WOUND_TRACK = [
  { level: "blue", label: "Sain" },
  { level: "yellow", label: "Blessé" },
  { level: "orange", label: "Grièvement blessé" },
  { level: "red", label: "Critique" },
];

export default function PlayerPanel({ character, isMyTurn, onSearch, onEndTurn }) {
  if (!character) return null;

  const currentWoundIndex = WOUND_TRACK.findIndex((w) => w.level === character.woundLevel);

  return (
    <aside className="player-panel">
      <h2 className="player-panel__name">{character.name}</h2>

      <div className="wound-track">
        {WOUND_TRACK.map((wound, i) => (
          <div
            key={wound.level}
            className={`wound-pip wound-pip--${wound.level} ${
              i === currentWoundIndex ? "wound-pip--active" : ""
            }`}
            title={wound.label}
          />
        ))}
      </div>
      <p className="wound-label">{WOUND_TRACK[currentWoundIndex]?.label}</p>

      <div className="stat-block">
        <span className="stat-block__label">Actions</span>
        <div className="action-pips">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`action-pip ${i < character.actionsLeft ? "action-pip--full" : ""}`}
            />
          ))}
        </div>
      </div>

      <div className="stat-block">
        <span className="stat-block__label">Zombies éliminés</span>
        <div className="kill-gauge">
          <span className="kill-gauge__count">{character.zombieKills}</span>
          <div className="kill-gauge__bar">
            <div
              className="kill-gauge__fill"
              style={{ width: `${Math.min(character.zombieKills * 10, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {isMyTurn && (
        <div className="player-panel__actions">
          {character.actionsLeft > 0 && (
            <button onClick={onSearch}>Fouiller</button>
          )}
          <button className="button--secondary" onClick={onEndTurn}>
            Terminer mon tour
          </button>
        </div>
      )}
    </aside>
  );
}
