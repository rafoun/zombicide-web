import { useEffect, useState } from "react";

// Petite animation automatique : les dés défilent brièvement puis se posent
// sur le résultat déjà calculé par le serveur (pas de lancer manuel — juste
// une mise en scène du résultat, comme demandé).
export default function DiceRoll({ result, onDone }) {
  const [settled, setSettled] = useState(false);
  const [faces, setFaces] = useState(result.rolls.map(() => 1));

  useEffect(() => {
    setSettled(false);
    setFaces(result.rolls.map(() => 1));

    const shuffleInterval = setInterval(() => {
      setFaces((prev) => prev.map(() => 1 + Math.floor(Math.random() * 6)));
    }, 80);

    const settleTimeout = setTimeout(() => {
      clearInterval(shuffleInterval);
      setFaces(result.rolls);
      setSettled(true);
    }, 550);

    const closeTimeout = setTimeout(() => onDone?.(), 1650);

    return () => {
      clearInterval(shuffleInterval);
      clearTimeout(settleTimeout);
      clearTimeout(closeTimeout);
    };
  }, [result]);

  return (
    <div className="dice-overlay" onClick={() => onDone?.()}>
      <div className="dice-panel">
        <p className="dice-panel__weapon">{result.weaponName} — {result.accuracy}+ pour toucher</p>
        <div className="dice-row">
          {faces.map((face, i) => (
            <span
              key={i}
              className={`die ${settled ? (face >= result.accuracy ? "die--hit" : "die--miss") : ""}`}
            >
              {face}
            </span>
          ))}
        </div>
        {settled && (
          <p className="dice-panel__result">
            {result.hits} touche{result.hits > 1 ? "s" : ""} / {result.misses} raté{result.misses > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
