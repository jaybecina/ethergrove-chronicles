import { gameStore, useGame, type Settings as S } from '../../game/store';

export function Settings() {
  const settings = useGame((s) => s.settings);
  const update = (patch: Partial<S>) => {
    gameStore.getState().updateSettings(patch);
  };
  return (
    <div className="settings">
      <fieldset>
        <legend>Graphics</legend>
        {(['auto', 'high', 'low'] as const).map((q) => (
          <label key={q} className="choice">
            <input
              type="radio"
              name="quality"
              checked={settings.quality === q}
              onChange={() => {
                update({ quality: q });
              }}
            />
            {q === 'auto' ? 'Automatic' : q === 'high' ? 'High' : 'Battery saver'}
          </label>
        ))}
      </fieldset>
      <label className="field">
        <span>Music volume</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.musicVolume}
          onChange={(e) => {
            update({ musicVolume: Number(e.target.value) });
          }}
        />
      </label>
      <label className="field">
        <span>Sound effects volume</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.sfxVolume}
          onChange={(e) => {
            update({ sfxVolume: Number(e.target.value) });
          }}
        />
      </label>
      <label className="choice">
        <input
          type="checkbox"
          checked={settings.reducedMotion}
          onChange={(e) => {
            update({ reducedMotion: e.target.checked });
          }}
        />
        Reduce motion (no camera shake, gentler transitions)
      </label>
      <fieldset>
        <legend>Text size</legend>
        {([1, 1.25, 1.5] as const).map((t) => (
          <label key={t} className="choice">
            <input
              type="radio"
              name="text"
              checked={settings.textScale === t}
              onChange={() => {
                update({ textScale: t });
              }}
            />
            {t * 100}%
          </label>
        ))}
      </fieldset>
    </div>
  );
}
