/* Sistema de ícones do protótipo aprovado — traço 1.75, 24×24, currentColor. */

const ICONES = {
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  building: '<path d="M4 20V9l4-3v14M10 20V6l4-3v17M16 20v-9l4-3v12M2 20h20"/>',
  flats: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8 8h2M14 8h2M8 12h2M14 12h2M10 20v-3.5h4V20"/>',
  bank: '<path d="M3 9.5 12 4l9 5.5M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3 20h18"/>',
  wallet: '<path d="M19 8V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H8"/><circle cx="16.5" cy="13.5" r="1.1" fill="currentColor" stroke="none"/>',
  receipt: '<path d="M6 3.5h12V21l-2.4-1.6L13.2 21l-2.4-1.6L8.4 21 6 19.4Z"/><path d="M9.5 8h5M9.5 11.5h5"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><path d="M15.5 5.3a3.2 3.2 0 0 1 0 5.9M17.5 14.8c1.7.6 2.8 2.1 3.2 4.2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.14-1.4l2-1.56-2-3.46-2.38.96a7 7 0 0 0-2.42-1.4L13.7 2.6h-3.4l-.36 2.54a7 7 0 0 0-2.42 1.4l-2.38-.96-2 3.46 2 1.56A7 7 0 0 0 5 12c0 .48.05.94.14 1.4l-2 1.56 2 3.46 2.38-.96a7 7 0 0 0 2.42 1.4l.36 2.54h3.4l.36-2.54a7 7 0 0 0 2.42-1.4l2.38.96 2-3.46-2-1.56c.09-.46.14-.92.14-1.4Z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  chevL: '<path d="m14.5 6-6 6 6 6"/>',
  chevR: '<path d="m9.5 6 6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  send: '<path d="m21 3-9.5 9.5M21 3l-6.5 18-3-8.5L3 9.5Z"/>',
  file: '<path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5Z"/><path d="M13.5 3v5.5H19"/>',
  alert: '<path d="M12 3.5 2.5 20h19Z"/><path d="M12 10v4.5M12 17.2v.3"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  shield: '<path d="M12 3 5 5.8v5.4c0 4.6 3 7.8 7 9.3 4-1.5 7-4.7 7-9.3V5.8Z"/><path d="m9 11.8 2.2 2.2L15 10"/>',
  arrUp: '<path d="M7 17 17 7M9 7h8v8"/>',
  arrDown: '<path d="M7 7l10 10M17 9v8H9"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  home: '<path d="m3.5 11 8.5-7 8.5 7M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
  key: '<circle cx="8" cy="15.5" r="4"/><path d="m11 12.5 8.5-8.5M16 7l2.5 2.5M13.5 9.5 16 12"/>',
  ledger: '<path d="M5 3.5h14v17H5Z"/><path d="M5 7.5h14M9 3.5v17"/>',
  logout: '<path d="M9.5 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3.5M15 8l4 4-4 4M19 12H9.5"/>',
  bank2: '<path d="M12 3 3.5 8.2v1.3h17V8.2Z"/><path d="M5.6 12.5v4.5M9.9 12.5v4.5M14.1 12.5v4.5M18.4 12.5v4.5M4.4 19.5h15.2M3 21.5h18"/><circle cx="12" cy="6.6" r=".4" fill="currentColor" stroke="none"/>',
  camera: '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.1l1.2-1.8h6.4L16.4 6h1.1A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5Z"/><circle cx="12" cy="12.5" r="3.2"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  hist: '<path d="M4 12a8 8 0 1 1 2.3 5.6M4 12l-1.8-2M4 12l2.3-1.3"/><path d="M12 8v4l2.8 1.8"/>',
  obra: '<path d="M11.5 7.5 15 4l5 5-3.5 3.5M11.5 7.5l5 5M11.5 7.5 3 16v5h5l8.5-8.5"/>',
} as const;

export type NomeIcone = keyof typeof ICONES;

export function Icone({ nome, sm = false }: { nome: NomeIcone; sm?: boolean }) {
  return (
    <svg
      className={sm ? "icon sm" : "icon"}
      viewBox="0 0 24 24"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONES[nome] }}
    />
  );
}
