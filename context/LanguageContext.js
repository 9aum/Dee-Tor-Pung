import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('th'); // Default to Thai

    useEffect(() => {
        loadLanguage();
    }, []);

    const loadLanguage = async () => {
        try {
            const savedLang = await AsyncStorage.getItem('app_language');
            if (savedLang) {
                setLanguage(savedLang);
            }
        } catch (error) {
            console.log('Error loading language', error);
        }
    };

    const switchLanguage = async (lang) => {
        try {
            setLanguage(lang);
            await AsyncStorage.setItem('app_language', lang);
        } catch (error) {
            console.log('Error saving language', error);
        }
    };

    const t = (key) => {
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, switchLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
