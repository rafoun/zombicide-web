const DANGER_THRESHOLDS = { blue: 0, yellow: 7, orange: 19, red: 43 };

function dangerLevel(adrenaline) {
  if (adrenaline >= DANGER_THRESHOLDS.red) return "red";
  if (adrenaline >= DANGER_THRESHOLDS.orange) return "orange";
  if (adrenaline >= DANGER_THRESHOLDS.yellow) return "yellow";
  return "blue";
}

const WOUND_TRACK = ["blue", "yellow", "orange", "red"]; // red = mort (3e blessure)

const ZOMBIE_TYPE_LABEL = { walker: "Marcheur", runner: "Coureur", brute: "Brute", abomination: "Abomination" };

function zombieSummary(zombiesHere) {
  const byType = {};
  for (const z of zombiesHere) byType[z.type] = (byType[z.type] || 0) + 1;
  return Object.entries(byType)
    .map(([type, count]) => `${count} ${ZOMBIE_TYPE_LABEL[type]}${count > 1 ? "s" : ""}`)
    .join(", ");
}

export default function PlayerPanel({
  character, isMyTurn, zombiesHere, weapons, selectedWeaponId, onSelectWeapon,
  isTargeting, onCancelTargeting, onSearch, onAttack, onUseItem, onEndTurn, mission, canSearch,
}) {
  if (!character) return null;

  const woundIndex = character.dead ? 3 : character.wounds; // 0,1,2 blessures -> index ; mort -> 3
  const level = dangerLevel(character.adrenaline);
  const activeWeapon = weapons.find((w) => w.id === selectedWeaponId) || weapons[0] || null;
  const healKit = character.equipment.find((e) => e.effect === "heal");
  // Le corps à corps (et les mains nues) ne visent que sa propre zone ; le tir
  // à distance peut viser une zone éloignée, donc le bouton reste disponible
  // même sans zombie dans SA zone (on choisira la cible sur le plateau).
  const canAttack = activeWeapon?.mode === "ranged" || zombiesHere.length > 0;

  return (
    <aside className="player-panel">
      {mission && (
        <div className="mission-box">
          <span className="mission-box__name">{mission.name}</span>
          <span className="mission-box__progress">{mission.progress}</span>
        </div>
      )}

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

      {isMyTurn && (
        <div className="player-panel__actions">
          {!character.dead && zombiesHere.length > 0 && (
            <p className="zombies-here">Zombies ici : {zombieSummary(zombiesHere)}</p>
          )}

          {!character.dead && !isTargeting && weapons.length > 1 && (
            <select
              className="weapon-select"
              value={activeWeapon?.id || ""}
              onChange={(e) => onSelectWeapon(e.target.value)}
            >
              {weapons.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.mode === "ranged" ? `distance, Portée ${w.range?.[0] ?? 0}-${w.range?.[1] ?? 0}` : "mêlée"}, Dégât {w.damage})
                </option>
              ))}
            </select>
          )}

          {!character.dead && isTargeting && (
            <button className="button--secondary" onClick={onCancelTargeting}>Annuler la visée</button>
          )}

          {!character.dead && !isTargeting && character.actionsLeft > 0 && canAttack && (
            <button onClick={onAttack}>
              Attaquer {activeWeapon ? `(${activeWeapon.name}, ${activeWeapon.mode === "ranged" ? "distance" : "mêlée"})` : "(mains nues)"}
            </button>
          )}

          {!character.dead && !isTargeting && character.actionsLeft > 0 && character.wounds > 0 && healKit && (
            <button onClick={() => onUseItem(healKit.id)}>Utiliser la Trousse de secours (-1 blessure)</button>
          )}

          {!character.dead && !isTargeting && character.actionsLeft > 0 && canSearch && <button onClick={onSearch}>Fouiller</button>}
          {!isTargeting && <button className="button--secondary" onClick={onEndTurn}>Terminer mon tour</button>}
        </div>
      )}
    </aside>
  );
}
