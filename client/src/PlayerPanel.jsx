import { useState } from "react";

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

export default function PlayerPanel({ character, isMyTurn, zombiesHere, onSearch, onAttack, onUseItem, onEndTurn, mission }) {
  const weapons = character?.equipment.filter((e) => e.type === "weapon") || [];
  const [selectedWeaponId, setSelectedWeaponId] = useState(null);

  if (!character) return null;

  const woundIndex = character.dead ? 3 : character.wounds; // 0,1,2 blessures -> index ; mort -> 3
  const level = dangerLevel(character.adrenaline);

  // Arme sélectionnée : celle choisie par le joueur si elle est toujours dans
  // l'inventaire, sinon la première trouvée, sinon mains nues.
  const activeWeapon = weapons.find((w) => w.id === selectedWeaponId) || weapons[0] || null;
  const healKit = character.equipment.find((e) => e.effect === "heal");

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

          {!character.dead && zombiesHere.length > 0 && weapons.length > 1 && (
            <select
              className="weapon-select"
              value={activeWeapon?.id || ""}
              onChange={(e) => setSelectedWeaponId(e.target.value)}
            >
              {weapons.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.mode === "ranged" ? "distance" : "mêlée"}, Dégât {w.damage})
                </option>
              ))}
            </select>
          )}

          {!character.dead && character.actionsLeft > 0 && zombiesHere.length > 0 && (
            <button onClick={() => onAttack(activeWeapon?.id)}>
              Attaquer {activeWeapon ? `(${activeWeapon.name}, ${activeWeapon.mode === "ranged" ? "distance" : "mêlée"})` : "(mains nues)"}
            </button>
          )}

          {!character.dead && character.actionsLeft > 0 && character.wounds > 0 && healKit && (
            <button onClick={() => onUseItem(healKit.id)}>Utiliser la Trousse de secours (-1 blessure)</button>
          )}

          {!character.dead && character.actionsLeft > 0 && <button onClick={onSearch}>Fouiller</button>}
          <button className="button--secondary" onClick={onEndTurn}>Terminer mon tour</button>
        </div>
      )}
    </aside>
  );
}
