import React from 'react';
import { companies as companiesConfigMap } from '../data/companyConfig';

const DynamicInvoiceHeader = ({ company, companyPhone }) => {
  // Guard against missing company data
  if (!company) {
    return <div className="p-4 text-red-600 font-sans">Company not found</div>;
  }

  // Find fallback config based on matching name (for legacy cases)
  const fallbackConfig = Object.values(companiesConfigMap).find(
    (c) => c.name?.toLowerCase() === company.name?.toLowerCase()
  );
  
  const [imageFailed, setImageFailed] = React.useState(false);

  const getLogoSrc = (path) => {
    if (!path) return '';
    if (path.startsWith('blob:') || path.startsWith('data:')) return path;
    if (path.startsWith('http://') || path.startsWith('https://')) return encodeURI(path);
    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5002';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (cleanPath.startsWith('/uploads')) return `${backendUrl}${encodeURI(cleanPath)}`;
    return encodeURI(import.meta.env.BASE_URL + cleanPath.replace(/^\//, ''));
  };

  // If primary logo failed, try fallback logo from config
  const initialLogo = company.logo !== undefined && company.logo !== '' 
    ? company.logo 
    : (fallbackConfig ? fallbackConfig.logo : '');

  const logoSrc = imageFailed 
    ? (fallbackConfig?.logo ? getLogoSrc(fallbackConfig.logo) : '') 
    : getLogoSrc(initialLogo);

  const isCrossOrigin = logoSrc.startsWith('http://') || logoSrc.startsWith('https://') || logoSrc.includes(':5002');

  const renderCompanyName = () => {
    const rawName = (company.name || '').trim();
    const upper = rawName.toUpperCase();

    // 1. TSMG SERVICES PRIVATE LIMITED
    if (upper.includes('TSMG') && upper.includes('SERVICES')) {
      return (
        <div 
          className="flex flex-wrap items-center gap-x-2 tracking-wide font-extrabold text-2xl sm:text-[1.65rem] leading-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", wordSpacing: '2px' }}
        >
          <span style={{ color: '#dc2626' }}>TSMG</span>
          <span style={{ color: '#dc2626' }}>SERVICES</span>
          <span style={{ color: '#0f172a' }}>PRIVATE</span>
          <span style={{ color: '#16a34a' }}>LIMITED</span>
        </div>
      );
    }

    // 2. THE SM GROUPS / SM GROUPS
    if (upper === 'THE SM GROUPS' || upper === 'THE SM GROUP' || upper === 'SM GROUPS') {
      return (
        <div 
          className="flex flex-wrap items-center gap-x-2 tracking-wide font-extrabold text-2xl sm:text-[1.65rem] leading-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", wordSpacing: '2px' }}
        >
          {upper.startsWith('THE') && <span style={{ color: '#0f172a' }}>THE</span>}
          <span style={{ color: '#800020', fontWeight: 800 }}>SM</span>
          <span style={{ color: '#0f172a' }}>{upper.includes('GROUPS') ? 'GROUPS' : 'GROUP'}</span>
        </div>
      );
    }

    // 3. VENTHULIR
    if (upper === 'VENTHULIR') {
      return (
        <div className="flex items-center gap-x-0.5 tracking-wide font-extrabold text-2xl sm:text-[1.65rem] leading-tight">
          <span style={{ color: '#064e3b', fontWeight: 800 }}>VEN</span>
          <span style={{ color: '#16a34a', fontWeight: 800 }}>THULIR</span>
        </div>
      );
    }

    // 4. MBK TECHNOLOGY
    if (upper === 'MBK TECHNOLOGY') {
      return (
        <div className="flex items-center gap-x-2.5 tracking-wide font-extrabold text-2xl sm:text-[1.65rem] leading-tight">
          <span
            style={{
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 800,
            }}
          >
            MBK
          </span>
          <span style={{ color: '#1e293b', fontWeight: 800 }}>TECHNOLOGY</span>
        </div>
      );
    }

    // 5. OPTIME
    if (upper === 'OPTIME') {
      return (
        <span
          className="text-2xl sm:text-[1.75rem] font-black tracking-wide"
          style={{ color: '#2563eb' }}
        >
          OPTIME
        </span>
      );
    }

    // 6. WINKBENCH
    if (upper === 'WINKBENCH') {
      return (
        <div className="flex leading-none w-max items-center gap-x-1.5">
          <span
            className="text-2xl sm:text-[1.75rem] font-black tracking-wide"
            style={{ color: '#1e3a8a' }}
          >
            WiNK
          </span>
          <span
            className="text-2xl sm:text-[1.75rem] font-bold tracking-wide"
            style={{ color: '#64748b' }}
          >
            BENCH
          </span>
        </div>
      );
    }

    // 7. PAVECH
    if (upper === 'PAVECH') {
      return (
        <div className="flex flex-col leading-none w-max">
          <span
            className="text-2xl sm:text-[1.75rem] font-extrabold tracking-wide"
            style={{
              background: 'linear-gradient(135deg, #0d9488, #16a34a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            PAVECH
          </span>
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase mt-1 text-slate-500">
            Smart Every Where
          </span>
        </div>
      );
    }

    // 8. THE SRI TECH ENERGY
    if (upper === 'THE SRI TECH ENERGY') {
      return (
        <div className="flex flex-col leading-tight w-max">
          <span className="text-[11px] font-bold tracking-widest text-slate-800">
            THE
          </span>
          <div className="flex gap-x-2.5 text-2xl sm:text-[1.65rem] font-extrabold tracking-tight">
            <span style={{ color: '#dc2626' }}>SRI</span>
            <span style={{ color: '#854d0e' }}>TECH</span>
            <span style={{ color: '#0f766e' }}>ENERGY</span>
          </div>
          <span className="text-[10px] font-bold tracking-wider text-emerald-600 mt-0.5">
            Energizing the Future
          </span>
        </div>
      );
    }

    // 9. THE SRI TECH ENGINEERING
    if (upper === 'THE SRI TECH ENGINEERING') {
      return (
        <div className="flex flex-col leading-tight w-max">
          <span className="text-[11px] font-bold tracking-widest text-slate-800">
            THE
          </span>
          <div className="flex gap-x-2.5 text-2xl sm:text-[1.65rem] font-extrabold tracking-tight">
            <span style={{ color: '#dc2626' }}>SRI</span>
            <span style={{ color: '#0f172a' }}>TECH</span>
            <span style={{ color: '#15803d' }}>ENGINEERING</span>
          </div>
          <span className="text-[10px] font-semibold tracking-widest text-slate-500 mt-0.5">
            Beyond a Thing
          </span>
        </div>
      );
    }

    // 10. Fallback: word by word with increased word spacing and special colors (SM in Wine Red, etc.)
    const words = rawName.split(' ').filter(Boolean);
    return (
      <div 
        className="flex flex-wrap items-center gap-x-2 text-2xl sm:text-[1.65rem] font-extrabold tracking-wide leading-tight"
        style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", wordSpacing: '2px' }}
      >
        {words.map((w, idx) => {
          const wUpper = w.toUpperCase();
          let color = '#0f172a';
          if (wUpper === 'SM') color = '#800020'; // Wine Red
          else if (wUpper === 'TSMG' || wUpper === 'SERVICES') color = '#dc2626'; // Red
          else if (wUpper === 'PRIVATE') color = '#0f172a'; // Black
          else if (wUpper === 'LIMITED') color = '#16a34a'; // Green
          else if (wUpper === 'SRI' || wUpper === 'ST') color = company.themeColor || '#dc2626';

          return (
            <span key={idx} style={{ color }}>
              {w}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div 
      className="px-6 py-4 mb-3 flex justify-between items-center bg-white border-b border-slate-200 min-h-[120px]"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {/* LEFT SIDE: Company Branding, Address & GST */}
      <div className="flex-1 pr-6 flex flex-col justify-center">
        <h1 className="mb-2">
          {renderCompanyName()}
        </h1>

        {/* Address, Phone & GST Details with increased word spacing */}
        <div 
          className="text-xs leading-relaxed text-slate-600 font-normal"
          style={{ wordSpacing: '2px' }}
        >
          {company.address ? (
            <p className="text-slate-600 leading-normal">{company.address}</p>
          ) : null}
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1.5 text-slate-700">
            {companyPhone && (
              <p>
                <span className="font-bold text-slate-900">Contact:</span> {companyPhone}
              </p>
            )}
            {company.gst && (
              <p>
                <span className="font-bold text-slate-900">GST:</span> {company.gst}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Company Logo */}
      <div className="flex items-center justify-end w-48 sm:w-56 h-full pl-2 relative overflow-hidden flex-shrink-0">
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={`${company.name} Logo`}
            className="max-h-24 max-w-full object-contain"
            crossOrigin={isCrossOrigin ? "anonymous" : undefined}
            onError={(e) => {
              if (!imageFailed && fallbackConfig?.logo) {
                setImageFailed(true);
              } else {
                e.currentTarget.style.display = 'none';
              }
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

export default DynamicInvoiceHeader;
