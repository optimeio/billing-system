import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Save, Building, Image, Upload, FileText, Percent, Tag } from 'lucide-react';
import api from '../../services/api';
import { useCompany } from '../../store/CompanyContext';
import toast from 'react-hot-toast';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('blob:') || path.startsWith('data:')) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return encodeURI(path);
  const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5002';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (cleanPath.startsWith('/uploads')) return `${backendUrl}${encodeURI(cleanPath)}`;
  return encodeURI(import.meta.env.BASE_URL + cleanPath.replace(/^\//, ''));
};

const CompanyManagement = () => {
  const { companies, fetchCompanies } = useCompany();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    gst: '',
    phone: '',
    email: '',
    themeColor: '#d60000',
    defaultHsn: '7321',
    defaultGstRate: 0,
    defaultDiscount: 0,
    bankDetails: {
      accountName: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branchName: ''
    }
  });

  const [files, setFiles] = useState({
    logo: null,
    signature: null
  });

  const [logoPreview, setLogoPreview] = useState('');
  const [signaturePreview, setSignaturePreview] = useState('');
  const [deleteLogoFlag, setDeleteLogoFlag] = useState(false);
  const [deleteSignatureFlag, setDeleteSignatureFlag] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('bank_')) {
      const field = name.split('_')[1];
      setFormData(prev => ({
        ...prev,
        bankDetails: {
          ...prev.bankDetails,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleFileChange = (type, e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const previewUrl = URL.createObjectURL(selectedFile);
      if (type === 'logo') {
        setFiles(prev => ({ ...prev, logo: selectedFile }));
        setLogoPreview(previewUrl);
        setDeleteLogoFlag(false);
      } else if (type === 'signature') {
        setFiles(prev => ({ ...prev, signature: selectedFile }));
        setSignaturePreview(previewUrl);
        setDeleteSignatureFlag(false);
      }
    }
  };

  const handleRemoveImage = (type) => {
    if (type === 'logo') {
      setFiles(prev => ({ ...prev, logo: null }));
      setLogoPreview('');
      setDeleteLogoFlag(true);
    } else if (type === 'signature') {
      setFiles(prev => ({ ...prev, signature: null }));
      setSignaturePreview('');
      setDeleteSignatureFlag(true);
    }
  };

  const openModal = (company = null) => {
    if (company) {
      setEditingId(company._id || null);
      setFormData({
        name: company.name || '',
        address: company.address || '',
        gst: company.gst || '',
        phone: company.phone || '',
        email: company.email || '',
        themeColor: company.themeColor || '#d60000',
        defaultHsn: company.defaultHsn || '7321',
        defaultGstRate: company.defaultGstRate !== undefined ? company.defaultGstRate : 0,
        defaultDiscount: company.defaultDiscount !== undefined ? company.defaultDiscount : 0,
        bankDetails: {
          accountName: company.bankDetails?.accountName || '',
          bankName: company.bankDetails?.bankName || '',
          accountNumber: company.bankDetails?.accountNumber || '',
          ifscCode: company.bankDetails?.ifscCode || '',
          branchName: company.bankDetails?.branchName || ''
        }
      });
      setFiles({ logo: null, signature: null });
      setLogoPreview(company.logo ? getImageUrl(company.logo) : '');
      setSignaturePreview(company.signature ? getImageUrl(company.signature) : '');
      setDeleteLogoFlag(false);
      setDeleteSignatureFlag(false);
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        address: '',
        gst: '',
        phone: '',
        email: '',
        themeColor: '#d60000',
        defaultHsn: '7321',
        defaultGstRate: 0,
        defaultDiscount: 0,
        bankDetails: {
          accountName: '',
          bankName: '',
          accountNumber: '',
          ifscCode: '',
          branchName: ''
        }
      });
      setFiles({ logo: null, signature: null });
      setLogoPreview('');
      setSignaturePreview('');
      setDeleteLogoFlag(false);
      setDeleteSignatureFlag(false);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('address', formData.address);
      data.append('gst', formData.gst);
      data.append('phone', formData.phone);
      data.append('email', formData.email);
      data.append('themeColor', formData.themeColor);
      data.append('defaultHsn', formData.defaultHsn || '7321');
      data.append('defaultGstRate', formData.defaultGstRate !== undefined && formData.defaultGstRate !== '' ? formData.defaultGstRate : 0);
      data.append('defaultDiscount', formData.defaultDiscount !== undefined && formData.defaultDiscount !== '' ? formData.defaultDiscount : 0);
      data.append('bankDetails', JSON.stringify(formData.bankDetails));

      if (files.logo) {
        data.append('logo', files.logo);
      } else if (deleteLogoFlag || !logoPreview) {
        data.append('deleteLogo', 'true');
        data.append('logo', '');
      }

      if (files.signature) {
        data.append('signature', files.signature);
      } else if (deleteSignatureFlag || !signaturePreview) {
        data.append('deleteSignature', 'true');
        data.append('signature', '');
      }

      if (editingId) {
        await api.put(`/companies/${editingId}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success("Company updated successfully");
      } else {
        await api.post('/companies', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success("Company added successfully");
      }
      
      await fetchCompanies();
      closeModal();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this company?")) {
      try {
        await api.delete(`/companies/${id}`);
        toast.success("Company deleted successfully");
        fetchCompanies();
      } catch (error) {
        toast.error("Failed to delete company");
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Building className="w-6 h-6 text-blue-600" />
          Company Master
        </h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all"
        >
          <Plus size={18} /> Add Company
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((company) => (
          <div key={company._id || company.name} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-2 w-full" style={{ backgroundColor: company.themeColor }}></div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  {company.logo ? (
                    <img src={getImageUrl(company.logo)} alt={company.name} className="h-10 w-10 object-contain" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                      {company.name.substring(0, 2)}
                    </div>
                  )}
                  <h3 className="font-semibold text-lg text-slate-800">{company.name}</h3>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 space-y-1 mb-4">
                <p><span className="font-medium text-slate-700">GST:</span> {company.gst || 'N/A'}</p>
                <p><span className="font-medium text-slate-700">Email:</span> {company.email || 'N/A'}</p>
                <p><span className="font-medium text-slate-700">Phone:</span> {company.phone || 'N/A'}</p>
                
                {/* Tax & Defaults Badges */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5 text-xs">
                  <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                    <Tag size={11} /> HSN: <strong className="font-bold">{company.defaultHsn || '7321'}</strong>
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
                    <Percent size={11} /> GST: <strong className="font-bold">{company.defaultGstRate !== undefined ? company.defaultGstRate : 0}%</strong>
                  </span>
                  <span className="bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded-md border border-purple-100 flex items-center gap-1">
                    Disc: <strong className="font-bold">{company.defaultDiscount !== undefined ? company.defaultDiscount : 0}%</strong>
                  </span>
                </div>

                {/* Bank Details section */}
                <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50 p-2.5 rounded-lg text-xs space-y-0.5">
                  <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">Bank Details</p>
                  <p><span className="font-semibold">Bank:</span> {company.bankDetails?.bankName || 'N/A'}</p>
                  <p><span className="font-semibold">A/C:</span> {company.bankDetails?.accountNumber || 'N/A'}</p>
                  <p><span className="font-semibold">IFSC:</span> {company.bankDetails?.ifscCode || 'N/A'}</p>
                  {company.bankDetails?.branchName && (
                    <p><span className="font-semibold">Branch:</span> {company.bankDetails?.branchName}</p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => openModal(company)}
                  className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold border border-blue-100"
                >
                  <Edit2 size={14} /> Edit
                </button>
                {company._id && (
                  <button
                    onClick={() => handleDelete(company._id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Company"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Company' : 'Add Company'}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:bg-gray-100 p-2 rounded-lg transition">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2 text-slate-800">Basic Details</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                    <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea name="address" value={formData.address} onChange={handleInputChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" rows="3" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                    <input type="text" name="gst" value={formData.gst} onChange={handleInputChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Theme Color</label>
                    <div className="flex gap-3 items-center">
                      <input type="color" name="themeColor" value={formData.themeColor} onChange={handleInputChange} className="w-10 h-10 border-0 p-0 rounded cursor-pointer" />
                      <span className="text-sm font-mono text-slate-700 font-semibold">{formData.themeColor}</span>
                    </div>
                  </div>

                  {/* ── Tax & Billing Defaults (HSN, GST, Discount) ── */}
                  <div className="pt-3 border-t border-slate-200">
                    <h4 className="font-bold text-sm text-slate-800 mb-2 flex items-center gap-1.5">
                      <FileText size={15} className="text-blue-600" />
                      Tax & Billing Defaults
                    </h4>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wide">
                          HSN Code
                        </label>
                        <input
                          type="text"
                          name="defaultHsn"
                          value={formData.defaultHsn}
                          onChange={handleInputChange}
                          placeholder="e.g. 7321"
                          className="w-full border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wide">
                          GST (%)
                        </label>
                        <input
                          type="number"
                          name="defaultGstRate"
                          value={formData.defaultGstRate}
                          onChange={handleInputChange}
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="e.g. 18"
                          className="w-full border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wide">
                          Discount (%)
                        </label>
                        <input
                          type="number"
                          name="defaultDiscount"
                          value={formData.defaultDiscount}
                          onChange={handleInputChange}
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="e.g. 5"
                          className="w-full border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bank Details & Files */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2 text-slate-800">Bank Details</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                    <input type="text" name="bank_accountName" value={formData.bankDetails.accountName} onChange={handleInputChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <input type="text" name="bank_bankName" value={formData.bankDetails.bankName} onChange={handleInputChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <input type="text" name="bank_accountNumber" value={formData.bankDetails.accountNumber} onChange={handleInputChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code</label>
                    <input type="text" name="bank_ifscCode" value={formData.bankDetails.ifscCode} onChange={handleInputChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Branch Name</label>
                    <input type="text" name="bank_branchName" value={formData.bankDetails.branchName || ''} onChange={handleInputChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>

                  {/* Modern Logo & Signature Upload Box */}
                  <h3 className="font-semibold text-lg border-b pb-2 mt-6 text-slate-800 flex items-center gap-2">
                    <Image size={18} className="text-blue-600" />
                    Company Logo & Signature
                  </h3>

                  {/* Company Logo Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Logo</label>
                    {logoPreview ? (
                      <div className="border-2 border-slate-200 rounded-xl p-3 bg-slate-50 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-20 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-1 shadow-inner overflow-hidden">
                            <img src={logoPreview} alt="Company Logo" className="max-h-full max-w-full object-contain" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700">Logo Uploaded</p>
                            <p className="text-[11px] text-slate-500">Visible on invoices & quotations</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-sm transition">
                            Change
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange('logo', e)} />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage('logo')}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition"
                            title="Delete Logo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition group bg-slate-50/50">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange('logo', e)} />
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition shadow-sm mb-2">
                          <Plus size={20} className="stroke-[2.5]" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700">Upload Company Logo</span>
                        <span className="text-xs text-slate-400 mt-0.5">PNG, JPG, SVG (Max 5MB)</span>
                      </label>
                    )}
                  </div>

                  {/* Authorized Signature Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Authorized Signature</label>
                    {signaturePreview ? (
                      <div className="border-2 border-slate-200 rounded-xl p-3 bg-slate-50 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-20 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-1 shadow-inner overflow-hidden">
                            <img src={signaturePreview} alt="Authorized Signature" className="max-h-full max-w-full object-contain" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700">Signature Uploaded</p>
                            <p className="text-[11px] text-slate-500">Visible on invoices & quotations</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-sm transition">
                            Change
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange('signature', e)} />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage('signature')}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition"
                            title="Delete Signature"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition group bg-slate-50/50">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange('signature', e)} />
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition shadow-sm mb-2">
                          <Plus size={20} className="stroke-[2.5]" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700">Upload Authorized Signature</span>
                        <span className="text-xs text-slate-400 mt-0.5">PNG, JPG (Transparent PNG recommended)</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-slate-700 font-medium transition">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow transition">
                  <Save size={18} /> Save Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyManagement;
