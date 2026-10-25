import type { CropId, ItemId, Season, ToolId, Weather } from '@hearthvale/core';
import { cropOfSeed } from '@hearthvale/core';
import type { ReactNode } from 'react';

/** Small hand-drawn style SVG icons; decorative (aria-hidden) unless labelled by the caller. */
function Svg({ children, size = 28 }: { children: ReactNode; size?: number | undefined }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

const WOOD = '#7a4f2c';
const METAL = '#b9c2c9';
const STROKE = {
  stroke: '#2e2118',
  strokeWidth: 1.6,
  strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const,
};

export function ToolIcon({ tool, size }: { tool: ToolId; size?: number | undefined }) {
  switch (tool) {
    case 'hoe':
      return (
        <Svg size={size}>
          <path d="M9 27 L22 8" {...STROKE} stroke={WOOD} strokeWidth={3} />
          <path d="M18 6 L27 8 L25 12 L20 10 Z" fill={METAL} {...STROKE} />
        </Svg>
      );
    case 'can':
      return (
        <Svg size={size}>
          <path
            d="M7 13 h13 v12 a2 2 0 0 1 -2 2 h-9 a2 2 0 0 1 -2 -2 Z"
            fill="#6aa2c8"
            {...STROKE}
          />
          <path d="M20 16 L28 10" {...STROKE} strokeWidth={2.4} stroke="#4c7ea1" />
          <path d="M9 13 a5 5 0 0 1 9 0" fill="none" {...STROKE} />
        </Svg>
      );
    case 'sickle':
      return (
        <Svg size={size}>
          <path d="M8 27 L13 21" {...STROKE} stroke={WOOD} strokeWidth={3} />
          <path d="M13 21 C 10 10, 20 4, 27 9 C 21 8, 15 12, 15 20 Z" fill={METAL} {...STROKE} />
        </Svg>
      );
    case 'axe':
      return (
        <Svg size={size}>
          <path d="M10 28 L21 7" {...STROKE} stroke={WOOD} strokeWidth={3} />
          <path d="M17 7 C 22 4, 28 7, 27 13 L19 12 Z" fill={METAL} {...STROKE} />
        </Svg>
      );
    case 'hammer':
      return (
        <Svg size={size}>
          <path d="M11 28 L18 12" {...STROKE} stroke={WOOD} strokeWidth={3} />
          <rect
            x="12"
            y="5"
            width="14"
            height="8"
            rx="2"
            transform="rotate(24 19 9)"
            fill="#8d949b"
            {...STROKE}
          />
        </Svg>
      );
  }
}

const CROP_COLOR: Record<CropId, string> = {
  turnip: '#efe1ee',
  potato: '#b28c5c',
  strawberry: '#e0313f',
  tomato: '#e64b35',
  corn: '#f2cf4a',
  melon: '#5f9e48',
  pumpkin: '#f08a24',
  eggplant: '#6b3a8a',
};

export function ItemIcon({ id, size }: { id: ItemId; size?: number | undefined }) {
  const seed = cropOfSeed(id);
  if (seed)
    return (
      <Svg size={size}>
        <path d="M8 7 h16 v19 a2 2 0 0 1 -2 2 h-12 a2 2 0 0 1 -2 -2 Z" fill="#e8d3a2" {...STROKE} />
        <circle cx="16" cy="17" r="5" fill={CROP_COLOR[seed]} {...STROKE} />
        <path d="M16 12 q3 -4 6 -3" fill="none" {...STROKE} stroke="#4f8a34" />
      </Svg>
    );
  if (id === 'wood')
    return (
      <Svg size={size}>
        <rect x="5" y="12" width="22" height="9" rx="4" fill="#9b6a3c" {...STROKE} />
        <circle cx="8" cy="16.5" r="3" fill="#d9b07a" {...STROKE} />
      </Svg>
    );
  if (id === 'stone')
    return (
      <Svg size={size}>
        <path d="M6 22 L10 11 L20 8 L27 15 L24 24 L12 26 Z" fill="#8f979e" {...STROKE} />
      </Svg>
    );
  if (id === 'fiber')
    return (
      <Svg size={size}>
        <path
          d="M10 27 C 10 18, 7 12, 5 6 M16 27 C 16 17, 16 10, 17 4 M22 27 C 22 18, 25 12, 27 7"
          fill="none"
          {...STROKE}
          stroke="#5d8a34"
          strokeWidth={2.2}
        />
      </Svg>
    );
  const color = CROP_COLOR[id as CropId];
  return (
    <Svg size={size}>
      <ellipse cx="16" cy="19" rx="9" ry="8" fill={color} {...STROKE} />
      <path
        d="M16 11 q-5 -6 -8 -4 M16 11 q4 -7 8 -5"
        fill="none"
        {...STROKE}
        stroke="#4f8a34"
        strokeWidth={2}
      />
    </Svg>
  );
}

export function WeatherIcon({ weather, size = 22 }: { weather: Weather; size?: number }) {
  const sun = <circle cx="16" cy="15" r="6" fill="#f6c443" {...STROKE} />;
  const cloud = (
    <path
      d="M8 22 a5 5 0 0 1 2 -9.6 a7 7 0 0 1 13 1.6 a4 4 0 0 1 1 8 Z"
      fill="#eef1f4"
      {...STROKE}
    />
  );
  switch (weather) {
    case 'sunny':
      return (
        <Svg size={size}>
          {sun}
          <path
            d="M16 3 v3 M16 24 v3 M4 15 h3 M25 15 h3 M7.5 6.5 l2 2 M22.5 21.5 l2 2 M7.5 23.5 l2 -2 M22.5 8.5 l2 -2"
            {...STROKE}
          />
        </Svg>
      );
    case 'cloudy':
      return <Svg size={size}>{cloud}</Svg>;
    case 'rain':
      return (
        <Svg size={size}>
          {cloud}
          <path d="M11 25 l-1 3 M16 25 l-1 3 M21 25 l-1 3" {...STROKE} stroke="#4c86c6" />
        </Svg>
      );
    case 'storm':
      return (
        <Svg size={size}>
          {cloud}
          <path d="M16 21 l-3 5 h4 l-2 5" fill="none" {...STROKE} stroke="#e9b21b" />
        </Svg>
      );
    case 'snow':
      return (
        <Svg size={size}>
          {cloud}
          <path
            d="M11 26 h0.1 M16 28 h0.1 M21 26 h0.1"
            {...STROKE}
            strokeWidth={3}
            stroke="#a9c8e6"
          />
        </Svg>
      );
  }
}

export const SEASON_COLOR: Record<Season, string> = {
  spring: '#e9a3bf',
  summer: '#7fb446',
  fall: '#e0782f',
  winter: '#a9c8e6',
};
