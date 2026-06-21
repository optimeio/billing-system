import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, Building } from 'lucide-react';
import api from '../../services/api';
import { useCompany } from '../../store/CompanyContext';
import toast from 'react-hot-toast';

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
    bankDetails: {
      accountName: '',
      bankName: '',
      accountNumber: '',
      ifscCode: ''
    }
  });

  const [files, setFiles] = useState({
    logo: null,
    signature: null
  });

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

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles.length > 0) {
      setFiles(prev => ({
        ...prev,
        [name]: selectedFiles[0]
      }));
    }
  };

  const openModal = (company = null) => {
    if (company) {
      setEditingId(company._id);
      setFormData({
        name: company.name || '',
        address: company.address || '',
        gst: company.gst || '',
        phone: company.phone || '',
        email: company.email || '',
        themeColor: company.themeColor || '#d60000',
        bankDetails: company.bankDetails || {
          accountName: '',
          bankName: '',
          accountNumber: '',
          ifscCode: ''
        }
      });
      setFiles({ logo: null, signature: null });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        address: '',
        gst: '',
        phone: '',
        email: '',
        themeColor: '#d60000',
        bankDetails: {
          accountName: '',
          bankName: '',
          accountNumber: '',
          ifscCode: ''
        }
      });
      setFiles({ logo: null, signature: null });
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
      data.append('bankDetails', JSON.stringify(formData.bankDetails));

      if (files.logo) data.append('logo', files.logo);
      if (files.signature) data.append('signature', files.signature);

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
      
      fetchCompanies();
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
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={18} /> Add Company
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((company) => (
          <div key={company._id || company.name} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-2 w-full" style={{ backgroundColor: company.themeColor }}></div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  {company.logo ? (
                    <img src={company.logo} alt={company.name} className="h-10 w-10 object-contain" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                      {company.name.substring(0, 2)}
                    </div>
                  )}
                  <h3 className="font-semibold text-lg">{company.name}</h3>
                </div>
              </div>
              <div className="text-sm text-gray-600 space-y-1 mb-4">
                <p><span className="font-medium">GST:</span> {company.gst || 'N/A'}</p>
                <p><span className="font-medium">Email:</span> {company.email || 'N/A'}</p>
                <p><span className="font-medium">Phone:</span> {company.phone || 'N/A'}</p>
              </div>
              {company._id && (
                <div className="flex gap-2 justify-end mt-4 pt-4 border-t">
                  <button
                    onClick={() => openModal(company)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(company._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Company' : 'Add Company'}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:bg-gray-100 p-2 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Basic Details</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                    <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea name="address" value={formData.address} onChange={handleInputChange} className="w-full border rounded-lg px-3 py-2" rows="3" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                    <input type="text" name="gst" value={formData.gst} onChange={handleInputChange} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full border rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full border rounded-lg px-3 py-2" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Theme Color</label>
                    <div className="flex gap-3 items-center">
                      <input type="color" name="themeColor" value={formData.themeColor} onChange={handleInputChange} className="w-10 h-10 border-0 p-0 rounded cursor-pointer" />
                      <span className="text-sm font-mono">{formData.themeColor}</span>
                    </div>
                  </div>
                </div>

                {/* Bank Details & Files */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Bank Details</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                    <input type="text" name="bank_accountName" value={formData.bankDetails.accountName} onChange={handleInputChange} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <input type="text" name="bank_bankName" value={formData.bankDetails.bankName} onChange={handleInputChange} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <input type="text" name="bank_accountNumber" value={formData.bankDetails.accountNumber} onChange={handleInputChange} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                    <input type="text" name="bank_ifscCode" value={formData.bankDetails.ifscCode} onChange={handleInputChange} className="w-full border rounded-lg px-3 py-2" />
                  </div>

                  <h3 className="font-semibold text-lg border-b pb-2 mt-6">Images</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo</label>
                    <input type="file" name="logo" accept="image/*" onChange={handleFileChange} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Authorized Signature</label>
                    <input type="file" name="signature" accept="image/*" onChange={handleFileChange} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
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
