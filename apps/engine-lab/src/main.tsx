import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { runLab } from './run-lab';
import type { ContentDensity } from './run-lab';
import './style.css';

function App() {
  const [seed, setSeed] = useState('839217');
  const [hasImage, setHasImage] = useState(true);
  const [density, setDensity] = useState<ContentDensity>('medium');
  const [result, setResult] = useState(() => runLab('839217', { hasImage: true, contentDensity: 'medium' }));
  const dirty = result.seed !== seed || result.context.hasImage !== hasImage || result.context.contentDensity !== density;

  return (
    <main>
      <h1>Design Gacha Engine Lab</h1>
      <p>M0 Foundation · Seed / Rule / Card diagnostics</p>
      <form onSubmit={event => {
        event.preventDefault();
        setResult(runLab(seed, { hasImage, contentDensity: density }));
      }}>
        <label>Seed <input value={seed} required onChange={event => setSeed(event.target.value)} /></label>
        <fieldset>
          <legend>Content Context</legend>
          <label>hasImage
            <select value={String(hasImage)} onChange={event => setHasImage(event.target.value === 'true')}>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>
          <label>contentDensity
            <select value={density} onChange={event => setDensity(event.target.value as ContentDensity)}>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
        </fieldset>
        <button type="submit">RUN</button>
      </form>
      <p role="status">{dirty ? 'Inputs changed. Press RUN to update results.' : 'Results match the current inputs.'}</p>
      <p>Run seed: <code>{result.seed}</code> · hasImage: <code>{String(result.context.hasImage)}</code> · contentDensity: <code>{result.context.contentDensity}</code></p>
      <div className="results">
        <section aria-labelledby="random-heading">
          <h2 id="random-heading">Random Test</h2>
          <p><strong>{result.deterministic ? 'Seed deterministic' : 'Determinism failed'}</strong> · two fresh streams agree</p>
          <pre id="random-output">{JSON.stringify(result.random, null, 2)}</pre>
        </section>
        <section aria-labelledby="rules-heading">
          <h2 id="rules-heading">Rule Test</h2>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Card</th><th>Eligibility</th><th>Weight</th><th>Matched rules</th></tr></thead>
              <tbody>{result.rules.map(card => (
                <tr key={card.id}>
                  <th scope="row">{card.id}</th>
                  <td>{card.disabled ? 'disabled' : 'enabled'}</td>
                  <td>{card.weight}</td>
                  <td>{card.matchedRuleIds.join(', ') || '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <h3>Resolved parameters</h3>
          <pre>{JSON.stringify(Object.fromEntries(result.rules.map(card => [card.id, card.parameters])), null, 2)}</pre>
        </section>
        <section aria-labelledby="cards-heading">
          <h2 id="cards-heading">Card Library</h2>
          <p><strong>{result.counts.total} loaded cards</strong></p>
          <p>Layout {result.counts.layout} · Typography {result.counts.typography} · Palette {result.counts.palette}</p>
          <ul>{result.rules.map(card => <li key={card.id}>{card.id} — {card.name}</li>)}</ul>
        </section>
        <section aria-labelledby="diagnostics-heading">
          <h2 id="diagnostics-heading">Diagnostics</h2>
          {result.diagnostics.length === 0
            ? <p>No diagnostics. All card schemas are valid.</p>
            : <ul>{result.diagnostics.map((item, index) => (
              <li key={index}><strong>{item.code}</strong> {item.path} {item.cardId} — {item.message}</li>
            ))}</ul>}
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
