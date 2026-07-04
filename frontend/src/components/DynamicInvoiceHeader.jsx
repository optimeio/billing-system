import React from 'react';
import { companies as companiesConfigMap } from '../data/companyConfig';

const DynamicInvoiceHeader = ({ company }) => {
  // Guard against missing company data
  if (!company) {
    return <div className="p-4 text-red-600">Company not found</div>;
  }

  // Find fallback config based on matching name (for legacy cases)
  const fallbackConfig = Object.values(companiesConfigMap).find(
    (c) => c.name === company.name
  );
  const displayLogo = company.logo || (fallbackConfig ? fallbackConfig.logo : '/logo.png');

  // Construct logo source: prepend backend API URL if it's from uploads directory, otherwise use base URL
  const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5002';
  const logoSrc = displayLogo.startsWith('/uploads')
    ? `${backendUrl}${displayLogo}`
    : import.meta.env.BASE_URL + displayLogo.replace(/^\//, '');

  const isCrossOrigin = logoSrc.startsWith('http://') || logoSrc.startsWith('https://') || logoSrc.includes(':5002');

  return (
    <div 
      className="p-6 mb-4 flex justify-between items-center h-40"
      style={{ border: '1px solid #ef4444', backgroundColor: '#ffffff' }}
    >
      {/* LEFT SIDE: ST Logo, Name, Address */}
      <div className="flex-1 flex flex-col justify-center">
        <h1
          className="text-[2.5rem] font-black tracking-tight"
          style={{
            fontFamily: "Arial Black, 'Segoe UI Black', Impact, sans-serif",
            lineHeight: 1.1,
            color: '#111827',
          }}
        >
          {company.name === 'VENTHULIR' ? (
            <>
              <span style={{ color: '#064e3b' }}>VEN</span>
              <span style={{ color: '#22c55e' }}>THULIR</span>
            </>
          ) : company.name === 'MBK TECHNOLOGY' ? (
            <>
              <span
                style={{
                  background: 'linear-gradient(to right, #f97316, #ec4899)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                MBK{' '}
              </span>
              <span style={{ color: '#374151' }}>TECHNOLOGY</span>
            </>
          ) : company.name === 'OPTIME' ? (
            <span
              className="text-[3rem] font-bold tracking-tight"
              style={{ color: '#2563eb', fontFamily: 'Arial, sans-serif' }}
            >
              Optime
            </span>
          ) : company.name === 'WINKBENCH' ? (
            <div className="flex leading-none w-max items-center">
              <span
                className="text-[3.2rem] font-bold tracking-tight"
                style={{ color: '#1e3a8a', fontFamily: "'Trebuchet MS', Arial, sans-serif" }}
              >
                WiNK
              </span>
              <span
                className="text-[3.2rem] font-bold tracking-tight"
                style={{ color: '#6b7280', fontFamily: "'Trebuchet MS', Arial, sans-serif" }}
              >
                BENCH
              </span>
            </div>
          ) : company.name === 'PAVECH' ? (
            <div className="flex flex-col leading-none w-max">
              <span
                className="text-[3rem] font-black tracking-wide"
                style={{
                  background: 'linear-gradient(135deg, #0d9488, #16a34a)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontFamily: "Arial Black, 'Segoe UI Black', Impact, sans-serif",
                }}
              >
                PAVECH
              </span>
              <span className="text-[0.75rem] font-semibold tracking-[0.15em] mt-1" style={{ color: '#475569', fontFamily: 'Arial, sans-serif' }}>
                Smart Every Where
              </span>
            </div>
          ) : company.name === 'THE SRI TECH ENERGY' ? (
            <div className="flex flex-col leading-none w-max">
              <span className="text-[0.8rem] font-bold tracking-widest pl-1" style={{ color: '#000000', fontFamily: 'Arial, sans-serif' }}>
                THE
              </span>
              <div className="flex gap-3 text-[2.8rem]" style={{ fontFamily: "'Times New Roman', Times, serif", transform: 'scaleY(1.1)', transformOrigin: 'bottom' }}>
                <span style={{ color: '#dc2626' }}>SRI</span>
                <span style={{ color: '#854d0e' }}>TECH</span>
                <span style={{ color: '#0f766e' }}>ENERGY</span>
              </div>
              <span className="text-[0.9rem] font-bold tracking-[0.1em] text-center mt-3 w-full pl-6" style={{ color: '#22c55e', fontFamily: 'Arial, sans-serif' }}>
                Energizing the Future
              </span>
            </div>
          ) : company.name === 'THE SRI TECH ENGINEERING' ? (
            <div className="flex flex-col leading-none w-max">
              <span className="text-[0.8rem] font-bold tracking-widest pl-1" style={{ color: '#000000', fontFamily: 'Arial, sans-serif' }}>
                THE
              </span>
              <div className="flex gap-3 text-[2.5rem]" style={{ fontFamily: "'Times New Roman', Times, serif", transform: 'scaleY(1.1)', transformOrigin: 'bottom' }}>
                <span style={{ color: '#dc2626' }}>SRI</span>
                <span style={{ color: '#111827' }}>TECH</span>
                <span style={{ color: '#1b5e20' }}>ENGINEERING</span>
              </div>
              <span className="text-[0.7rem] font-bold tracking-[0.25em] text-center mt-2 w-full pl-6" style={{ color: '#000000', fontFamily: 'Arial, sans-serif' }}>
                Beyond a Thing
              </span>
            </div>
          ) : company.name.includes('THE SRI TECH') ? (
            <div className="flex flex-col leading-none w-max">
              <span className="text-[0.8rem] font-bold tracking-widest pl-1" style={{ color: '#000000', fontFamily: 'Arial, sans-serif' }}>
                THE
              </span>
              <div className="flex gap-3 text-[3.2rem]" style={{ fontFamily: "'Times New Roman', Times, serif", transform: 'scaleY(1.1)', transformOrigin: 'bottom' }}>
                <span style={{ color: '#d32f2f' }}>SRI</span>
                <span style={{ color: '#1b5e20' }}>TECH</span>
              </div>
            </div>
          ) : (
            company.name.split(' ').map((word, i) =>
              word === 'SM' || word === 'SRI' || word === 'ST' ? (
                <span key={i} style={{ color: company.themeColor || '#d60000' }}>
                  {word}{' '}
                </span>
              ) : (
                <span key={i}>{word} </span>
              )
            )
          )}
        </h1>
        <div className="mt-2 text-sm leading-tight font-medium" style={{ color: '#1f2937' }}>
          {company.address.split(',').map((line, idx) => (
            <React.Fragment key={idx}>
              {line.trim()}
              {idx < company.address.split(',').length - 1 && ', '}
              {idx === 2 && <br />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* RIGHT SIDE: Company Logo */}
      <div
        className={`flex items-center justify-end w-64 h-full pl-4 relative ${company.name !== 'WINKBENCH' ? 'overflow-hidden' : ''}`}
        style={company.name === 'THE SRI TECH ENERGY' ? { marginRight: '10px' } : {}}
      >
        <img
          src={logoSrc}
          alt={`${company.name} Logo`}
          className="max-h-full max-w-full object-contain"
          crossOrigin={isCrossOrigin ? "anonymous" : undefined}
          style={
            company.name === 'VENTHULIR'
              ? { transform: 'translateY(15%) scale(1.5)', mixBlendMode: 'multiply' }
              : company.name === 'THE SRI TECH ENERGY'
                ? { transform: 'scale(2) translateX(-15%)', mixBlendMode: 'multiply' }
              : company.name === 'THE SRI TECH ENGINEERING'
                ? { mixBlendMode: 'multiply', transform: 'scale(3.2) translateY(5%)' }
              : company.name === 'WINKBENCH'
                ? { mixBlendMode: 'multiply', transform: 'scale(1.9) translateX(-5%)' }
              : company.name === 'OPTIME'
              ? { mixBlendMode: 'multiply', transform: 'scale(1.1)' }
              : company.name === 'PAVECH'
                ? { mixBlendMode: 'multiply', transform: 'scale(1.1)', objectFit: 'contain' }
              : { mixBlendMode: 'multiply' }
          }
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </div>
    </div>
  );
};

export default DynamicInvoiceHeader;
