import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CARD_TYPES } from '@loadsnow/design-domain';
import { CONTENT_CASES, DEFAULT_LAB_INPUTS, nextSeed, runLab } from './run-lab';
import type { LabInputs } from './run-lab';
import './style.css';

const json = (value: unknown) => JSON.stringify(value, null, 2);

function App() {
  const [inputs, setInputs] = useState(DEFAULT_LAB_INPUTS);
  const [drawnInputs, setDrawnInputs] = useState(DEFAULT_LAB_INPUTS);
  const [output, setOutput] = useState(() => runLab(DEFAULT_LAB_INPUTS));
  const { result, cards, profile } = output;
  const dirty = json(inputs) !== json(drawnInputs);
  const update = (patch: Partial<LabInputs>) => setInputs(current => ({ ...current, ...patch }));
  const dna = result.status === 'success' ? result.dna : null;

  return (
    <main>
      <h1>Design Gacha DNA Lab</h1>
      <p>M1 · Content → Profile → Conditional Sampling → Versioned DNA</p>
      <form onSubmit={event => {
        event.preventDefault();
        setOutput(runLab(inputs));
        setDrawnInputs(inputs);
      }}>
        <label>Seed <input value={inputs.seed} required onChange={event => update({ seed: event.target.value })} /></label>
        <label>Content Case
          <select value={inputs.caseId} onChange={event => {
            const content = CONTENT_CASES.find(item => item.id === event.target.value)!;
            update({ caseId: content.id, contentDensity: 'auto', hasImage: content.elements.some(item => item.type === 'image' && item.role !== 'LOGO') });
          }}>
            {CONTENT_CASES.map(content => <option key={content.id}>{content.id}</option>)}
          </select>
        </label>
        <label>hasImage
          <select value={String(inputs.hasImage)} onChange={event => update({ hasImage: event.target.value === 'true' })}>
            <option value="true">true</option><option value="false">false</option>
          </select>
        </label>
        <label>contentDensity
          <select value={inputs.contentDensity} onChange={event => update({ contentDensity: event.target.value as LabInputs['contentDensity'] })}>
            <option value="auto">auto (content case)</option>
            <option value="low">low</option><option value="medium">medium</option><option value="high">high</option>
          </select>
        </label>
        <fieldset>
          <legend>Force Cards</legend>
          {(['layout', 'typography', 'palette'] as const).map(type => {
            const key = { layout: 'forceLayout', typography: 'forceTypography', palette: 'forcePalette' }[type] as 'forceLayout' | 'forceTypography' | 'forcePalette';
            return <label key={type}>Force {type[0]!.toUpperCase() + type.slice(1)}
              <select value={inputs[key]} onChange={event => update({ [key]: event.target.value })}>
                <option value="">Any eligible card</option>
                {cards.filter(card => card.type === type).map(card => <option key={card.id} value={card.id}>{card.id} — {card.name}</option>)}
              </select>
            </label>;
          })}
        </fieldset>
        <button type="submit">DRAW</button>
        <button type="button" onClick={() => update({ seed: nextSeed(inputs.seed) })}>NEXT SEED</button>
        <small>Density presets change test content. The profile is computed from that content.</small>
      </form>
      <p role="status">{dirty ? 'Inputs changed. Press DRAW to update results.' : 'Results match the current inputs. Same seed and content produce the same DNA.'}</p>
      <p>Draw seed: <code>{drawnInputs.seed}</code> · Case: <code>{drawnInputs.caseId}</code></p>
      {result.status === 'error' && <p role="alert"><strong>{result.error.code}</strong> — {result.error.message}</p>}
      <div className="results">
        <section aria-labelledby="profile-heading">
          <h2 id="profile-heading">Content Profile</h2>
          <pre id="profile-output">{json(profile)}</pre>
        </section>
        <section aria-labelledby="selected-heading">
          <h2 id="selected-heading">Selected Cards</h2>
          {dna ? <ul>{Object.entries(dna.cards).map(([module, selection]) => {
            const refs = Array.isArray(selection) ? selection : selection ? [selection] : [];
            return <li key={module}><strong>{module}</strong>: {refs.length ? refs.map(ref => `${ref.id}@${ref.version} — ${cards.find(card => card.id === ref.id)?.name ?? ''}`).join(', ') : 'None'}</li>;
          })}</ul> : <p>No DNA produced.</p>}
        </section>
        <section aria-labelledby="parameters-heading">
          <h2 id="parameters-heading">Resolved Parameters</h2>
          <pre>{json(dna?.parameters ?? null)}</pre>
        </section>
        <section aria-labelledby="seeds-heading">
          <h2 id="seeds-heading">Module Seeds</h2>
          <pre>{json(dna?.seeds ?? null)}</pre>
        </section>
        <section className="wide" aria-labelledby="weights-heading">
          <h2 id="weights-heading">Final Weights &amp; Compatibility Effects</h2>
          {result.status === 'success' ? result.debug?.pools.map((pool, index) => <details key={index} open>
            <summary>{pool.type} — {pool.eligible.length} eligible</summary>
            <div className="table-scroll"><table>
              <thead><tr><th>Card</th><th>Base</th><th>Context</th><th>Compatibility</th><th>Final</th><th>Effects / matched rules</th></tr></thead>
              <tbody>{pool.eligible.map(entry => <tr key={entry.card.id}>
                <th scope="row">{entry.card.id}</th><td>{entry.baseWeight}</td><td>{entry.contextWeight}</td><td>{entry.compatibilityWeight}</td><td>{entry.finalWeight}</td>
                <td>{[...entry.compatibilityEffects.map(effect => `${effect.kind}[${effect.ruleIndex}] ×${effect.multiplier} (${effect.selectedCardId})`), ...entry.matchedRuleIds].join('; ') || '—'}</td>
              </tr>)}</tbody>
            </table></div>
            {pool.excluded.length > 0 && <p>Excluded: {pool.excluded.map(item => `${item.cardId} (${item.reason})`).join(', ')}</p>}
          </details>) : <p>Weights are available after a successful draw.</p>}
        </section>
        <section aria-labelledby="dna-heading">
          <h2 id="dna-heading">Complete Design DNA</h2>
          <pre id="dna-output">{json(dna)}</pre>
        </section>
        <section aria-labelledby="diagnostics-heading">
          <h2 id="diagnostics-heading">Diagnostics</h2>
          {result.diagnostics.length === 0 ? <p>No diagnostics.</p> : <ul>{result.diagnostics.map((item, index) => <li key={index}><strong>{item.code}</strong> {item.cardId} — {item.message}</li>)}</ul>}
          <h3>Card Library</h3>
          <p><strong>{cards.length} loaded cards</strong> · poster-core-prototype@0.1.0</p>
          <p>{CARD_TYPES.map(type => `${type} ${cards.filter(card => card.type === type).length}`).join(' · ')}</p>
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
