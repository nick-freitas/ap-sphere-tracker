import { useState } from 'react'
import { DEFAULT_IGNORE_ITEMS, DEFAULT_IGNORE_LOCATIONS } from '../parsers/spoilerParser'
import './OptionsPage.css'

export default function OptionsPage({
  ignoreItemsText,
  ignoreLocationsText,
  onSave,
  validationErrors,
}) {
  const [itemsText, setItemsText] = useState(ignoreItemsText)
  const [locationsText, setLocationsText] = useState(ignoreLocationsText)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    onSave(itemsText, locationsText)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="options-page">
      <div className="opt-section">
        <div className="opt-header">
          <div className="opt-header-row">
            <h3 className="opt-title">Ignore Items</h3>
            <button className="opt-reset" onClick={() => setItemsText(DEFAULT_IGNORE_ITEMS)}>Reset to Default</button>
          </div>
          <p className="opt-desc">Items listed here will be excluded from sphere analysis. Use // or # for comments.</p>
        </div>
        <textarea
          className="opt-textarea"
          value={itemsText}
          onChange={(e) => setItemsText(e.target.value)}
          rows={12}
          spellCheck={false}
        />
        {validationErrors?.invalidItems?.length > 0 && (
          <div className="opt-errors">
            <strong>Not found in spoiler log:</strong>
            <ul>
              {validationErrors.invalidItems.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="opt-section">
        <div className="opt-header">
          <div className="opt-header-row">
            <h3 className="opt-title">Ignore Check Locations</h3>
            <button className="opt-reset" onClick={() => setLocationsText(DEFAULT_IGNORE_LOCATIONS)}>Reset to Default</button>
          </div>
          <p className="opt-desc">Locations listed here will be excluded from sphere analysis. Use // or # for comments.</p>
        </div>
        <textarea
          className="opt-textarea"
          value={locationsText}
          onChange={(e) => setLocationsText(e.target.value)}
          rows={8}
          spellCheck={false}
        />
        {validationErrors?.invalidLocations?.length > 0 && (
          <div className="opt-errors">
            <strong>Not found in spoiler log:</strong>
            <ul>
              {validationErrors.invalidLocations.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="opt-actions">
        <button className="opt-save" onClick={handleSave}>
          Save & Apply
        </button>
        {saved && <span className="opt-saved">{'\u2713'} Saved</span>}
      </div>
    </div>
  )
}
