import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import useAuthStore from './authStore';
import { companies as companiesConfigMap } from '../data/companyConfig';

const companiesConfig = Object.values(companiesConfigMap);

const CompanyContext = createContext();

export const useCompany = () => useContext(CompanyContext);

export const CompanyProvider = ({ children }) => {
    const [companies, setCompanies] = useState(companiesConfig);
    const [selectedCompany, setSelectedCompany] = useState(companiesConfig[0]);
    const [loading, setLoading] = useState(false);
    const { token, isAuthenticated } = useAuthStore();

    const fetchCompanies = async () => {
        try {
            const response = await api.get('/companies', { timeout: 8000 });
            if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                setCompanies(response.data);
                setSelectedCompany(prevSelected => {
                    if (prevSelected) {
                        const matched = response.data.find(c => 
                            (c._id && prevSelected._id && c._id === prevSelected._id) || 
                            (c.id && prevSelected.id && c.id === prevSelected.id) ||
                            (c.name && prevSelected.name && c.name.toLowerCase() === prevSelected.name.toLowerCase())
                        );
                        return matched || response.data[0];
                    }
                    return response.data[0];
                });
            } else {
                setCompanies(companiesConfig);
            }
        } catch (error) {
            // Silently fallback to static config if endpoint is unavailable
            setCompanies(companiesConfig);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, [isAuthenticated, token]);

    const changeCompany = (companyId) => {
        const comp = companies.find(c => 
            c._id === companyId || 
            c.id === companyId || 
            c.name === companyId ||
            (c.name && String(companyId).toLowerCase() === c.name.toLowerCase())
        );
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

