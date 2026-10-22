/**
 * Ilustrasi animasi untuk panel kiri halaman login: staf kantor notaris
 * bekerja di depan laptop, dilihat 3/4 dari atas kanan (isometrik).
 * Gerak berulang terus: mengetik, kepala sedikit bergerak, kaki berayun,
 * baris dokumen di layar terketik lalu muncul tanda centang, uap kopi, daun.
 * Murni SVG + CSS (tanpa gambar/skrip); diam bila pengguna memilih
 * "kurangi gerakan" di sistem. Geometri dihitung dengan proyeksi isometrik.
 */
export function OfficeIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="28 60 472 450" className={className} role="img" aria-label="Ilustrasi staf kantor notaris bekerja di depan laptop">
      <style>{`
        .oi-anim, .oi-anim * { transform-box: fill-box; }
        .oi-blink { transform-origin: center; animation: oi-blink 4.2s infinite; }
        .oi-head { transform-origin: 50% 90%; animation: oi-head 6s ease-in-out infinite; }
        .oi-hand-l { animation: oi-tap 0.44s ease-in-out infinite alternate; }
        .oi-hand-r { animation: oi-tap 0.44s ease-in-out 0.22s infinite alternate; }
        .oi-leg-l { transform-origin: 50% 0%; animation: oi-swing 2.4s ease-in-out infinite; }
        .oi-leg-r { transform-origin: 50% 0%; animation: oi-swing 2.4s ease-in-out 1.2s infinite; }
        .oi-steam { animation: oi-steam 2.8s ease-out infinite; opacity: 0; }
        .oi-steam-2 { animation-delay: 1.4s; }
        .oi-leaf-a { transform-origin: 50% 100%; animation: oi-sway 3.6s ease-in-out infinite; }
        .oi-leaf-b { transform-origin: 0% 100%; animation: oi-sway 4.4s ease-in-out 0.6s infinite reverse; }
        .oi-title { stroke-dashoffset: 0; }
        .oi-type-line { stroke-dashoffset: var(--len); animation: oi-write 7s linear infinite; }
        .oi-tl-2 { animation-delay: 0.9s; }
        .oi-tl-3 { animation-delay: 1.8s; }
        .oi-tl-4 { animation-delay: 2.7s; }
        .oi-check { transform-origin: center; animation: oi-pop 7s ease-out infinite; transform: scale(0); }
        @keyframes oi-blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
        @keyframes oi-head { 0%, 100% { transform: rotate(0deg); } 35% { transform: rotate(-3deg); } 70% { transform: rotate(2deg); } }
        @keyframes oi-tap { from { transform: translateY(0); } to { transform: translateY(-3.5px); } }
        @keyframes oi-swing { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(6deg); } }
        @keyframes oi-steam { 0% { opacity: 0; transform: translateY(6px); } 25% { opacity: 0.8; } 100% { opacity: 0; transform: translateY(-20px); } }
        @keyframes oi-sway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(5deg); } }
        @keyframes oi-write { 0% { stroke-dashoffset: var(--len); } 12%, 80% { stroke-dashoffset: 0; } 88%, 100% { stroke-dashoffset: var(--len); } }
        @keyframes oi-pop { 0%, 50% { transform: scale(0); } 56% { transform: scale(1.2); } 60%, 80% { transform: scale(1); } 86%, 100% { transform: scale(0); } }
        @media (prefers-reduced-motion: reduce) {
          .oi-anim * { animation: none !important; }
          .oi-type-line { stroke-dashoffset: 0; }
          .oi-check { transform: scale(1); }
          .oi-steam { opacity: 0.6; }
        }
      `}</style>
      <g className="oi-anim">
        <polygon points="260.0,238.0 492.1,372.0 266.9,502.0 34.8,368.0" fill="#065F46"/>
        <polygon points="266.9,258.0 260.0,262.0 260.0,118.0 266.9,114.0" fill="#A7F3D0"/>
        <polygon points="253.1,258.0 260.0,262.0 260.0,118.0 253.1,114.0" fill="#6EE7B7"/>
        <polygon points="260.0,110.0 266.9,114.0 260.0,118.0 253.1,114.0" fill="#A7F3D0"/>
        <polygon points="72.9,370.0 66.0,374.0 66.0,230.0 72.9,226.0" fill="#A7F3D0"/>
        <polygon points="59.1,370.0 66.0,374.0 66.0,230.0 59.1,226.0" fill="#6EE7B7"/>
        <polygon points="66.0,222.0 72.9,226.0 66.0,230.0 59.1,226.0" fill="#A7F3D0"/>
        <polygon points="374.3,320.0 367.4,324.0 367.4,180.0 374.3,176.0" fill="#A7F3D0"/>
        <polygon points="360.5,320.0 367.4,324.0 367.4,180.0 360.5,176.0" fill="#6EE7B7"/>
        <polygon points="367.4,172.0 374.3,176.0 367.4,180.0 360.5,176.0" fill="#A7F3D0"/>
        <line x1="331.0" y1="301.0" x2="275.6" y2="265.0" stroke="#334155" strokeWidth="20" strokeLinecap="round"/>
        <g className="oi-leg-l"><line x1="275.6" y1="265.0" x2="272.1" y2="355.0" stroke="#334155" strokeWidth="17" strokeLinecap="round"/><ellipse cx="266.1" cy="357.0" rx="13" ry="7" fill="#0F172A"/></g>
        <line x1="303.3" y1="317.0" x2="247.9" y2="281.0" stroke="#3B4A61" strokeWidth="20" strokeLinecap="round"/>
        <g className="oi-leg-r"><line x1="247.9" y1="281.0" x2="240.9" y2="369.0" stroke="#3B4A61" strokeWidth="17" strokeLinecap="round"/><ellipse cx="234.9" cy="371.0" rx="13" ry="7" fill="#0F172A"/></g>
        <polygon points="180.3,432.0 173.4,436.0 173.4,292.0 180.3,288.0" fill="#A7F3D0"/>
        <polygon points="166.5,432.0 173.4,436.0 173.4,292.0 166.5,288.0" fill="#6EE7B7"/>
        <polygon points="173.4,284.0 180.3,288.0 173.4,292.0 166.5,288.0" fill="#A7F3D0"/>
        <polygon points="381.2,176.0 173.4,296.0 173.4,288.0 381.2,168.0" fill="#A7F3D0"/>
        <polygon points="52.2,226.0 173.4,296.0 173.4,288.0 52.2,218.0" fill="#6EE7B7"/>
        <polygon points="260.0,98.0 381.2,168.0 173.4,288.0 52.2,218.0" fill="#ECFDF5"/>
        <polygon points="305.0,140.0 273.9,158.0 273.9,156.0 305.0,138.0" fill="#E2E8F0"/>
        <polygon points="232.3,134.0 273.9,158.0 273.9,156.0 232.3,132.0" fill="#E2E8F0"/>
        <polygon points="263.5,114.0 305.0,138.0 273.9,156.0 232.3,132.0" fill="#FFFFFF"/>
        <polygon points="306.8,141.0 275.6,159.0 275.6,157.0 306.8,139.0" fill="#FCD34D"/>
        <polygon points="234.0,135.0 275.6,159.0 275.6,157.0 234.0,133.0" fill="#FCD34D"/>
        <polygon points="265.2,115.0 306.8,139.0 275.6,157.0 234.0,133.0" fill="#FDE68A"/>
        <polygon points="294.6,202.0 225.4,242.0 225.4,238.0 294.6,198.0" fill="#CBD5E1"/>
        <polygon points="180.3,216.0 225.4,242.0 225.4,238.0 180.3,212.0" fill="#94A3B8"/>
        <polygon points="249.6,172.0 294.6,198.0 225.4,238.0 180.3,212.0" fill="#E2E8F0"/>
        <polygon points="249.6,183.9 273.9,197.9 225.4,225.9 201.1,211.9" fill="#CBD5E1"/>
        <polygon points="249.6,172.0 180.3,212.0 168.2,145.0 237.5,105.0" fill="#CBD5E1"/>
        <polygon points="245.2,168.6 182.8,204.6 172.4,147.0 234.7,111.0" fill="#0F172A"/>
        <line className="oi-title" x1="231.2" y1="122.0" x2="208.1" y2="135.3" stroke="#34D399" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="26.6" style={{ ["--len" as string]: "26.6" }}/>
        <line className="oi-type-line oi-tl-1" x1="233.1" y1="132.3" x2="183.2" y2="161.1" stroke="#A7F3D0" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="57.6" style={{ ["--len" as string]: "57.6" }}/>
        <line className="oi-type-line oi-tl-2" x1="234.6" y1="140.4" x2="189.7" y2="166.3" stroke="#A7F3D0" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="51.8" style={{ ["--len" as string]: "51.8" }}/>
        <line className="oi-type-line oi-tl-3" x1="236.0" y1="148.5" x2="184.9" y2="178.0" stroke="#A7F3D0" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="59.0" style={{ ["--len" as string]: "59.0" }}/>
        <line className="oi-type-line oi-tl-4" x1="237.5" y1="156.5" x2="205.1" y2="175.3" stroke="#A7F3D0" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="37.4" style={{ ["--len" as string]: "37.4" }}/>
        <g className="oi-check"><circle cx="191.5" cy="184.3" r="7" fill="#10B981"/><path d="M188.3 184.3l2.2 2.4 4.4-4.6" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></g>
        <path className="oi-steam" d="M112.5 184.0c-5-7 5-11 0-18" fill="none" stroke="#ECFDF5" strokeWidth="2.6" strokeLinecap="round"/>
        <path className="oi-steam oi-steam-2" d="M119.5 184.0c-5-7 5-11 0-18" fill="none" stroke="#ECFDF5" strokeWidth="2.6" strokeLinecap="round"/>
        <rect x="104.5" y="190.0" width="20" height="24" rx="5" fill="#FFFFFF"/><ellipse cx="114.5" cy="190.0" rx="10" ry="4" fill="#6B4226"/><path d="M124.5 196.0c8 0 8 12 0 12" fill="none" stroke="#FFFFFF" strokeWidth="3.5"/>
        <path className="oi-leaf-a" d="M341.1 142.0c-12-12-12-28 2-38 5 15 3 28-2 38z" fill="#6EE7B7"/>
        <path className="oi-leaf-b" d="M345.1 142.0c5-17 18-25 32-22-5 13-17 22-32 22z" fill="#34D399"/>
        <path d="M331.1 142.0h24l-4 22h-16z" fill="#FFFFFF"/>
        <g className="oi-hand-l"><line x1="336.2" y1="222.0" x2="310.2" y2="229.0" stroke="#16202F" strokeWidth="16" strokeLinecap="round"/><line x1="310.2" y1="229.0" x2="256.5" y2="196.0" stroke="#16202F" strokeWidth="15" strokeLinecap="round"/><circle cx="256.5" cy="196.0" r="7.5" fill="#E8B48F"/></g>
        <polygon points="325.8,396.0 315.4,402.0 315.4,322.0 325.8,316.0" fill="#1F2937"/>
        <polygon points="305.0,396.0 315.4,402.0 315.4,322.0 305.0,316.0" fill="#111827"/>
        <polygon points="315.4,310.0 325.8,316.0 315.4,322.0 305.0,316.0" fill="#334155"/>
        <polygon points="374.3,316.0 315.4,350.0 315.4,340.0 374.3,306.0" fill="#064E3B"/>
        <polygon points="263.5,320.0 315.4,350.0 315.4,340.0 263.5,310.0" fill="#022C22"/>
        <polygon points="322.4,276.0 374.3,306.0 315.4,340.0 263.5,310.0" fill="#065F46"/>
        <line x1="320.6" y1="303.0" x2="315.4" y2="224.0" stroke="#1E293B" strokeWidth="50" strokeLinecap="round"/>
        <line x1="315.4" y1="224.0" x2="313.7" y2="209.0" stroke="#E8B48F" strokeWidth="12" strokeLinecap="round"/>
        <g className="oi-head">
        <ellipse cx="308.0" cy="188.0" rx="19" ry="21" fill="#F2C6A0"/>
        <path d="M290.0 180.0c0-14 11-22 24-22 13 0 22 10 21 24-1 9-6 15-12 18-2-9-6-14-12-16-7-1-14-3-21-4z" fill="#1F2937"/>
        <ellipse cx="318.0" cy="192.0" rx="4.5" ry="6.5" fill="#E8B48F"/>
        <ellipse className="oi-blink" cx="296.0" cy="189.0" rx="2.2" ry="2.8" fill="#1F2937"/>
        <path d="M295.0 198.0q4 3 8 1" fill="none" stroke="#9A5B3B" strokeWidth="2" strokeLinecap="round"/>
        </g>
        <polygon points="374.3,310.0 322.4,340.0 322.4,290.0 374.3,260.0" fill="#047857"/>
        <polygon points="315.4,336.0 322.4,340.0 322.4,290.0 315.4,286.0" fill="#064E3B"/>
        <polygon points="367.4,256.0 374.3,260.0 322.4,290.0 315.4,286.0" fill="#065F46"/>
        <g className="oi-hand-r"><line x1="292.9" y1="243.0" x2="253.1" y2="258.0" stroke="#273449" strokeWidth="17" strokeLinecap="round"/><line x1="253.1" y1="258.0" x2="228.8" y2="212.0" stroke="#273449" strokeWidth="16" strokeLinecap="round"/><circle cx="228.8" cy="212.0" r="8" fill="#F2C6A0"/></g>
      </g>
    </svg>
  );
}
