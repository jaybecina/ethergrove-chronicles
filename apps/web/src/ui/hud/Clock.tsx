import { SEASONS, formatClock, weekday } from '@hearthvale/core';
import { useGame } from '../../game/store';
import { SEASON_COLOR, WeatherIcon } from '../icons';

const WEATHER_NAME = {
  sunny: 'Sunny',
  cloudy: 'Cloudy',
  rain: 'Rain',
  storm: 'Storm',
  snow: 'Snow',
} as const;
const SEASON_NAME = { spring: 'Spring', summer: 'Summer', fall: 'Fall', winter: 'Winter' } as const;

/** Day-dial medallion: the sun/moon disc turns with the clock; the outer ring marks the season. */
export function Clock() {
  const cal = useGame((s) => s.game?.calendar);
  const weather = useGame((s) => s.game?.weather);
  if (!cal || !weather) return null;
  // 6:00 → sun on the left horizon, 12:00 → top, 18:00 → right; night continues round.
  const turn = ((cal.minute - 360) / 1440) * 360 - 90;
  return (
    <section className="hud-clock" aria-label="Time and weather">
      <div className="dial" aria-hidden="true">
        <svg viewBox="0 0 100 100">
          {SEASONS.map((s, i) => (
            <path
              key={s}
              d={arc(i)}
              className={s === cal.season ? 'dial-season is-now' : 'dial-season'}
              stroke={SEASON_COLOR[s]}
            />
          ))}
          <circle cx="50" cy="50" r="36" className="dial-face" />
          <clipPath id="sky-clip">
            <circle cx="50" cy="50" r="34" />
          </clipPath>
          <g clipPath="url(#sky-clip)">
            <rect x="0" y="0" width="100" height="50" className="dial-day" />
            <rect x="0" y="50" width="100" height="50" className="dial-night" />
            <g
              style={{ transform: `rotate(${turn}deg)`, transformOrigin: '50px 50px' }}
              className="dial-disc"
            >
              <circle cx="50" cy="22" r="8" className="dial-sun" />
              <circle cx="50" cy="78" r="6.5" className="dial-moon" />
            </g>
            <rect x="0" y="49" width="100" height="2" className="dial-horizon" />
          </g>
        </svg>
      </div>
      <div className="clock-text">
        <p className="clock-time">{formatClock(cal.minute)}</p>
        <p className="clock-date">
          {weekday(cal)}, {SEASON_NAME[cal.season]} {cal.day}
        </p>
        <p className="clock-weather">
          <span role="img" aria-label={`Today: ${WEATHER_NAME[weather.today]}`}>
            <WeatherIcon weather={weather.today} />
          </span>
          <span
            className="forecast"
            role="img"
            aria-label={`Tomorrow: ${WEATHER_NAME[weather.tomorrow]}`}
          >
            <WeatherIcon weather={weather.tomorrow} size={16} />
          </span>
        </p>
      </div>
    </section>
  );
}

function arc(i: number): string {
  const r = 44;
  const a0 = ((i * 90 - 90 + 4) * Math.PI) / 180;
  const a1 = (((i + 1) * 90 - 90 - 4) * Math.PI) / 180;
  const p = (a: number) => `${50 + r * Math.cos(a)} ${50 + r * Math.sin(a)}`;
  return `M ${p(a0)} A ${r} ${r} 0 0 1 ${p(a1)}`;
}
