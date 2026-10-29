import { sellPrice } from '@ethergrove/core';
import { gameStore } from '../../game/store';
import { displayName } from '../labels';
import { gold } from '../format';
import { uiStore, useUi } from '../uiStore';
import { Panel } from './Panel';

export function MorningReport() {
  const report = useUi((s) => s.report);
  if (!report) return null;
  const close = () => {
    uiStore.getState().setReport(null);
    gameStore.getState().setOverlay(null);
  };
  return (
    <Panel title="Yesterday's sales" onClose={close}>
      <table className="report">
        <tbody>
          {report.items.map((s) => (
            <tr key={s.id}>
              <th scope="row">
                {displayName(s.id)} × {s.qty}
              </th>
              <td>{gold.format((sellPrice(s.id) ?? 0) * s.qty)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td>{gold.format(report.total)} gold</td>
          </tr>
        </tfoot>
      </table>
      <button type="button" className="btn btn-primary" onClick={close}>
        Start the day
      </button>
    </Panel>
  );
}
