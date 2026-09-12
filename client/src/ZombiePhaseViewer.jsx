const KIND_ICON = {
  spawn: "☠",
  abomination_extra: "☠",
  bite: "🩸",
};

const KIND_LABEL = {
  spawn: "Apparition",
  abomination_extra: "Abomination",
  bite: "Attaque",
};

// Récap léger de la phase des zombies : un seul écran, une seule action pour
// continuer. Les déplacements ne sont pas des décisions et n'intéressent
// personne, donc ils se font en silence — seuls les événements qui comptent
// (nouvelles menaces, blessures) sont listés.
export default function ZombiePhaseViewer({ steps, onDismiss }) {
  const notable = (steps || []).filter((s) => s.kind === "spawn" || s.kind === "abomination_extra" || s.kind === "bite");
  if (notable.length === 0) return null;

  return (
    <div className="zombie-phase-overlay">
      <div className="zombie-phase-panel">
        <p className="zombie-phase-panel__title">Phase des zombies</p>
        <ul className="zombie-phase-list">
          {notable.map((step, i) => (
            <li key={i} className="zombie-phase-list__item">
              <span className={`zombie-phase-icon zombie-phase-icon--${step.kind}`}>{KIND_ICON[step.kind]}</span>
              <span className="zombie-phase-list__label">{KIND_LABEL[step.kind]}</span>
              <span className="zombie-phase-list__message">{step.message}</span>
            </li>
          ))}
        </ul>
        <button onClick={onDismiss}>Continuer</button>
      </div>
    </div>
  );
}
