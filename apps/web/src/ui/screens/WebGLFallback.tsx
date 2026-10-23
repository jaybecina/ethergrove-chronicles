export function WebGLFallback() {
  return (
    <main className="screen screen-paper">
      <div className="panel">
        <h2>This browser can't show 3D right now</h2>
        <p>Hearthvale needs WebGL 2. Try one of these, then reload the page:</p>
        <ul>
          <li>Use a recent Chrome, Edge, Firefox or Safari.</li>
          <li>Turn on hardware acceleration in your browser settings.</li>
          <li>Update your graphics drivers, or try another device.</li>
        </ul>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            location.reload();
          }}
        >
          Reload
        </button>
      </div>
    </main>
  );
}
