import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { companies as companiesConfigMap } from '../data/companyConfig';

const companiesConfig = Object.values(companiesConfigMap);

const CompanyContext = createContext();

export const useCompany = () => useContext(CompanyContext);

export const CompanyProvider = ({ children }) => {
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                // Not authenticated, fallback to static config silently
                setCompanies(companiesConfig);
                setSelectedCompany(companiesConfig[0]);
                return;
            }

            const response = await api.get('/companies');
            if (response.data && response.data.length > 0) {
                setCompanies(response.data);
                if (selectedCompany) {
                    const stillExists = response.data.find(c => c._id === selectedCompany._id);
                    if (stillExists) setSelectedCompany(stillExists);
                    else setSelectedCompany(response.data[0]);
                } else {
                    setSelectedCompany(response.data[0]);
                }
            } else {
                setCompanies(companiesConfig);
                setSelectedCompany(companiesConfig[0]);
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.warn("Unauthorized to fetch companies, using fallback config.");
            } else {
                console.error("Error fetching companies:", error);
            }
            setCompanies(companiesConfig);
            if (!selectedCompany) setSelectedCompany(companiesConfig[0]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const changeCompany = (companyId) => {
        const comp = companies.find(c => c._id === companyId || c.name === companyId);
        if (comp) {
            setSelectedCompany(comp);
        }
    };

    return (
        <CompanyContext.Provider value={{ companies, selectedCompany, changeCompany, fetchCompanies, loading }}>
            {children}
        </CompanyContext.Provider>
    );
};
