export default function CartCityConflictModal({ conflict, onConfirm, onCancel }) {
  if (!conflict) return null

  const { pendingCity, currentCity, itemCount } = conflict

  return (
    <div
      className="city-conflict-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-conflict-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1rem',
      }}
    >
      <div
        className="city-conflict-modal"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          maxWidth: '460px',
          width: '100%',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          animation: 'modalSlideUp 0.25s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#FFF3E0',
              color: '#FF5200',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              flexShrink: 0,
            }}
          >
            ⚠️
          </div>
          <div>
            <h3
              id="city-conflict-title"
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 700,
                color: '#1c1c1c',
              }}
            >
              Clear Cart to Change City?
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#686b78' }}>
              Multi-city ordering restriction
            </p>
          </div>
        </div>

        <p
          style={{
            fontSize: '14px',
            lineHeight: 1.5,
            color: '#3d4152',
            margin: '0 0 20px',
          }}
        >
          Your cart contains <strong>{itemCount ? `${itemCount} item(s)` : 'items'}</strong> from{' '}
          <strong style={{ color: '#FF5200' }}>{currentCity?.name || 'your current city'}</strong>.
          Changing your city to <strong style={{ color: '#0070f3' }}>{pendingCity?.name}</strong> will
          clear your current cart.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            className="conflict-clear-btn"
            onClick={onConfirm || conflict.onConfirm}
            style={{
              background: '#FF5200',
              color: '#ffffff',
              border: 'none',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
          >
            Change to {pendingCity?.name} and Clear Cart
          </button>

          <button
            type="button"
            className="conflict-keep-btn"
            onClick={onCancel || conflict.onCancel}
            style={{
              background: '#F1F3F6',
              color: '#1c1c1c',
              border: 'none',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
          >
            Keep {currentCity?.name}
          </button>
        </div>
      </div>
    </div>
  )
}
