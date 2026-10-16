/* ═══════════════════════════════════════════════════════════
   SALARY PRO OFFICIAL BRANDING LOGO (CONCEPT 01: PAYSLIP DOCUMENT)
   Based on approved reference media_1790866586813.jpg
═══════════════════════════════════════════════════════════ */

export function SalaryProIcon({ size = 44, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 54 54"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Salary Pro Logo Icon"
    >
      {/* Main Payslip Document Base */}
      <rect x="6" y="8" width="36" height="40" rx="10" fill="#2563EB" />

      {/* Document Inner White Card */}
      <rect x="11" y="13" width="26" height="30" rx="6" fill="#FFFFFF" opacity="0.95" />

      {/* Payslip Lines & Elements */}
      <rect x="15" y="18" width="12" height="3.5" rx="1.75" fill="#2563EB" />
      <circle cx="31" cy="20" r="2.5" fill="#F26B5B" />
      <rect x="15" y="25" width="18" height="2.5" rx="1.25" fill="#E2E8F0" />
      <rect x="15" y="30" width="14" height="2.5" rx="1.25" fill="#E2E8F0" />
      <rect x="15" y="35" width="10" height="2.5" rx="1.25" fill="#0F9F8F" />

      {/* Top-Right Rupee Currency Badge (Yellow) */}
      <circle cx="39" cy="12" r="9" fill="#F4B740" stroke="#FFFFFF" strokeWidth="2" />
      <text
        x="39"
        y="15.5"
        textAnchor="middle"
        fontSize="10"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="sans-serif"
      >
        ₹
      </text>

      {/* Bottom-Right Success Processed Check Badge (Green) */}
      <circle cx="40" cy="40" r="8.5" fill="#22A06B" stroke="#FFFFFF" strokeWidth="2" />
      <path
        d="M36.5 40L39 42.5L43.5 37.5"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SalaryProLogo({ size = 'normal', showSubtitle = true, className = '' }) {
  const iconSize = size === 'large' ? 48 : size === 'small' ? 36 : 42;
  const titleSize = size === 'large' ? 24 : size === 'small' ? 18 : 22;
  const subSize = size === 'large' ? 10.5 : size === 'small' ? 9 : 9.5;

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <SalaryProIcon size={iconSize} />
      <div className="flex flex-col justify-center">
        <div className="flex items-center leading-none">
          <span
            style={{
              fontSize: titleSize,
              fontWeight: 800,
              color: '#172033',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            Salary
          </span>
          <span
            style={{
              fontSize: titleSize,
              fontWeight: 800,
              color: '#2563EB',
              letterSpacing: '-0.03em',
              lineHeight: 1,
              marginLeft: 3,
            }}
          >
            Pro
          </span>
        </div>
        {showSubtitle && (
          <span
            style={{
              fontSize: subSize,
              fontWeight: 700,
              color: '#667085',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: 3,
              lineHeight: 1,
            }}
          >
            PAYROLL MANAGEMENT
          </span>
        )}
      </div>
    </div>
  );
}
