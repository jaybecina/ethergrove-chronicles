import { useGame } from '../../game/store';
import { SEASON_NAME } from '../format';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarPanel() {
  const cal = useGame((s) => s.game?.calendar);
  if (!cal) return null;
  return (
    <div className="calendar">
      <h3>
        {SEASON_NAME[cal.season]}, year {cal.year}
      </h3>
      <table>
        <thead>
          <tr>
            {DAYS.map((d) => (
              <th key={d} scope="col">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2, 3].map((w) => (
            <tr key={w}>
              {DAYS.map((_, d) => {
                const day = w * 7 + d + 1;
                return (
                  <td
                    key={day}
                    className={day === cal.day ? 'is-today' : day < cal.day ? 'is-past' : ''}
                    aria-current={day === cal.day ? 'date' : undefined}
                  >
                    {day}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
