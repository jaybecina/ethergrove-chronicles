import { isDesktopApp } from '../../render/webgl';

const TEXT = {
  browser: {
    heading: "This browser can't show 3D right now",
    lead: 'Ethergrove Chronicles needs WebGL 2. Try one of these, then reload the page:',
    tips: [
      'Use a recent Chrome, Edge, Firefox or Safari.',
      'Turn on hardware acceleration in your browser settings.',
      'Update your graphics drivers, or try another device.',
    ],
  },
  // The desktop app ships its own Chromium, so browser advice does not apply (desktop spec §4.5).
  desktop: {
    heading: "Your graphics can't show 3D right now",
    lead: 'Ethergrove Chronicles needs WebGL 2. Try these, then reopen the game:',
    tips: [
      'Update your graphics drivers.',
      'On a laptop with two GPUs, plug in the charger.',
      'Restart your computer.',
    ],
  },
} as const;

export function WebGLFallback({
  desktop = isDesktopApp(navigator.userAgent),
}: {
  desktop?: boolean;
}) {
  const text = TEXT[desktop ? 'desktop' : 'browser'];
  return (
    <main className="screen screen-paper">
      <div className="panel">
        <h2>{text.heading}</h2>
        <p>{text.lead}</p>
        <ul>
          {text.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
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
