/**
 * LanguageContext.js
 * 
 * ใช้สำหรับจัดการ "ภาษา" ทั้งแอป (Global State)
 * ช่วยให้เราเปลี่ยนภาษาที่เดียว แล้วทุกหน้าที่ใช้ Context นี้จะเปลี่ยนตามทันที
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage'; // ใช้บันทึกค่าภาษาลงเครื่อง (ปิดแอปเปิดใหม่ก็ยังจำได้)
import { translations } from '../translations'; // ไฟล์รวมคำแปลทั้งหมด

// สร้าง Context ขึ้นมา (เปรียบเสมือนท่อส่งข้อมูลกลาง)
const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('th'); // ค่าเริ่มต้นเป็นภาษาไทย ('th')

    // โหลดภาษาที่บันทึกไว้ตอนเปิดแอป
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

    // ฟังก์ชันเปลี่ยนภาษา
    const switchLanguage = async (lang) => {
        try {
            setLanguage(lang);
            // บันทึกลงเครื่องด้วย
            await AsyncStorage.setItem('app_language', lang);
        } catch (error) {
            console.log('Error saving language', error);
        }
    };

    // ฟังก์ชัน 't' (Translate) 
    // รับ key เข้ามา (เช่น 'welcome') -> คืนค่าคำแปลตามภาษาปัจจุบัน
    const t = (key) => {
        return translations[language][key] || key;
    };

    // ส่งค่าเหล่านี้ไปให้ลูกๆ (Children) ใช้
    return (
        <LanguageContext.Provider value={{ language, switchLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

// Custom Hook เพื่อให้เรียกใช้ง่ายๆ: const { t } = useLanguage();
export const useLanguage = () => useContext(LanguageContext);
