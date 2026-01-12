/**
 * ToastContext.js
 * 
 * ใช้จัดการ "ป้ายแจ้งเตือน" (Toast) ที่เด้งลงมาจากด้านบน
 * เป็น Global State เหมือน LanguageContext ทำให้เราเรียกใช้แจ้งเตือนได้จากทุกหน้า
 */

import React, { createContext, useState, useContext } from 'react';
import { Toast } from '../components/Toast'; // นำ Component ที่แสดงผล Toast มาใช้

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    // เก็บสถานะของ Toast (แสดงหรือไม่, ข้อความอะไร, สีอะไร)
    const [toast, setToast] = useState({
        visible: false,
        message: '',
        type: 'success' // success (เขียว), error (แดง), info (ฟ้า)
    });

    // ฟังก์ชันสั่งแสดง Toast
    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
    };

    // ฟังก์ชันสั่งซ่อน (ถูกเรียกเมื่อแสดงครบเวลา หรือผู้ใช้ปัดทิ้ง)
    const hideToast = () => {
        setToast(prev => ({ ...prev, visible: false }));
    };

    return (
        // ส่ง showToast ไปให้ component ลูกๆ ใช้
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* แสดงตัว Toast ไว้ที่นี่ (Top level) เพื่อให้มันลอยอยู่เหนือทุกหน้า */}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={hideToast}
            />
        </ToastContext.Provider>
    );
};

// Custom Hook: เรียกใช้ const { showToast } = useToast(); ได้เลย
export const useToast = () => useContext(ToastContext);
