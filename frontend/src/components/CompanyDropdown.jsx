import React from 'react';

const CompanyDropdown = ({ companies, selectedCompanyId, onChange }) => {
  const companyList = Array.isArray(companies) ? companies : Object.values(companies || {});

  return (
    <div className="mb-6 flex flex-col items-center">
      <label htmlFor="company-select" className="text-sm font-semibold text-gray-700 mb-2">
        Select Issuing Company
      </label>
      <select
        id="company-select"
        value={selectedCompanyId || ''}
        onChange={(e) => onChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[250px] font-medium text-slate-800"
      >
        <option value="" disabled>Select a company</option>
        {companyList.map((co) => {
          const val = co._id || co.id || co.name;
          return (
            <option key={val} value={val}>
              {co.name}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default CompanyDropdown;

