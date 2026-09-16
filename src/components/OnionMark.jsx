const MAROON = '#7A263A';
export function OnionMark({ className, style }){
  return (
    <svg viewBox="0 0 120 152" className={className} style={style} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="OnionSetu onion mark">
      <g fill={MAROON}>
        <path d="M60.5 47C58.4 32 58.6 16.4 60.6 4c2.2 12.4 2.4 28 1 43z" />
        <path d="M56.8 47.6c-4.6-9.6-11.6-18-19.9-24.4 5.3 9.8 12.4 18.3 20.7 24.9z" />
        <path d="M64.2 47.6c4.6-9.6 11.6-18 19.9-24.4-5.3 9.8-12.4 18.3-20.7 24.9z" />
      </g>
      <path d="M60 47.5C41.5 57.5 9 79 9 104.5 9 130 31.8 148.5 60 148.5S111 130 111 104.5C111 79 78.5 57.5 60 47.5Z" fill="none" stroke={MAROON} strokeWidth="6" strokeLinejoin="round" />
      <path d="M60 47.5c18.5 10 51 31.5 51 57 0 25.5-22.8 44-51 44 20.4 0 37-19.7 37-44 0-19.2-13.9-42.9-37-57Z" fill={MAROON} />
      <g fill="none" stroke={MAROON} strokeOpacity="0.4" strokeWidth="2.4" strokeLinecap="round">
        <path d="M56.5 58C43 73 33 94.5 35.5 116.5c1.4 12.4 8.5 22 18.5 26" />
        <path d="M52 69C42 85 35.5 103 38.5 120.5c1.2 7.4 5 14 10.5 18.5" />
        <path d="M63.5 58C77 73 87 94.5 84.5 116.5c-1.4 12.4-8.5 22-18.5 26" />
        <path d="M68 69c10 16 16.5 34 13.5 51.5-1.2 7.4-5 14-10.5 18.5" />
        <path d="M60 62c-5.5 16-8 39-6 62 1 9 3.5 15 6 18.5 2.5-3.5 5-9.5 6-18.5 2-23-.5-46-6-62Z" />
      </g>
    </svg>
  );
}
