import './ErrorCard.css'

export default function ErrorCard({ title, body, items, fixSteps }) {
  return (
    <div className="error-card">
      <h2 className="error-card-title">{title}</h2>
      <p className="error-card-body">{body}</p>
      {items && items.length > 0 && (
        <ul className="error-card-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {fixSteps && fixSteps.length > 0 && (
        <div className="error-card-fix">
          <strong>To fix:</strong>
          <ol>
            {fixSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
