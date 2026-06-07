export default function App() {
  const openHub = () => {
    const url = browser.runtime.getURL('/page.html');
    void browser.tabs.create({ url });
  };

  return (
    <div style={{ width: '320px', padding: '20px', fontFamily: 'Segoe UI, sans-serif' }}>
      <h1 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>ika-ext</h1>
      <p style={{ color: '#735333', marginBottom: '16px', fontSize: '0.9rem' }}>
        Abra o Ikariam Hub para ver recursos, vinho, bárbaros e relatórios de combate.
      </p>
      <button
        onClick={openHub}
        style={{
          width: '100%',
          backgroundColor: '#4d3319',
          color: '#fff',
          border: 'none',
          padding: '10px 16px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        Abrir Ikariam Hub
      </button>
    </div>
  );
}
