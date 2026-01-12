/**
 * Toast.js
 * 
 * Component "ป้ายแจ้งเตือน" ที่ลอยจากขอบบน
 * ใช้ Animation (การเคลื่อนไหว) เพื่อความสวยงาม
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window'); // ความกว้างหน้าจอ

export const Toast = ({ message, type = 'success', visible, onHide }) => {
    // Animated Values: ตัวแปรสำหรับการทำ Animation
    const fadeAnim = useRef(new Animated.Value(0)).current;   // ความโปร่งใส (0-1)
    const slideAnim = useRef(new Animated.Value(-100)).current; // ตำแหน่งแนวตั้ง (เริ่มที่ -100 คือนอกจอ)

    // useEffect จะทำงานทุกครั้งที่ค่า visible เปลี่ยน (True/False)
    useEffect(() => {
        if (visible) {
            // == จังหวะแสดงผล (Show) ==
            Animated.parallel([ // ทำ 2 อย่างพร้อมกัน
                Animated.timing(fadeAnim, {
                    toValue: 1, // ค่อยๆ ชัดขึ้น
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 50, // เลื่อนลงมาที่ตำแหน่ง 50
                    duration: 400,
                    useNativeDriver: true,
                })
            ]).start();

            // ตั้งเวลาถอยหลัง 3 วินาที เพื่อสั่งซ่อนอัตโนมัติ
            const timer = setTimeout(() => {
                hide();
            }, 3000);

            return () => clearTimeout(timer); // เคลียร์เวลาถ้า component ถูกปิดก่อน
        } else {
            hide();
        }
    }, [visible]);

    // ฟังก์ชันซ่อน (Hide Animation)
    const hide = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0, // ค่อยๆ จางหาย
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: -100, // เลื่อนกลับขึ้นไปข้างบน
                duration: 300,
                useNativeDriver: true,
            })
        ]).start(() => onHide && onHide()); // เมื่ออนิเมชั่นจบ ให้เรียกฟังก์ชัน onHide ของพ่อ
    };

    // เลือกสีพื้นหลังตามประเภท (type)
    const getBackgroundColor = () => {
        switch (type) {
            case 'success': return '#4cd137'; // เขียว
            case 'error': return '#e84118';   // แดง
            case 'info': return '#00a8ff';    // ฟ้า
            default: return '#333';
        }
    };

    // เลือกไอคอน
    const getIcon = () => {
        switch (type) {
            case 'success': return 'checkmark-circle';
            case 'error': return 'alert-circle';
            case 'info': return 'information-circle';
            default: return 'notifications';
        }
    };

    // ถ้ายับไม่แสดง และอนิเมชั่นยังเป็น 0 (จางสุด) ไม่ต้อง Render อะไรเลย
    if (!visible && fadeAnim._value === 0) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: getBackgroundColor(),
                    opacity: fadeAnim,       // ผูกค่าความโปร่งใสกับ Animation
                    transform: [{ translateY: slideAnim }] // ผูกตำแหน่งกับ Animation
                }
            ]}
        >
            <Ionicons name={getIcon()} size={24} color="#fff" />
            <Text style={styles.text}>{message}</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute', // ลอยเหนือ Content
        top: 0,
        alignSelf: 'center',
        width: width * 0.9,
        padding: 15,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        zIndex: 9999, // ชั้นสูงสุด
        elevation: 5, // เงา Android
        shadowColor: "#000", // เงา iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    text: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        flex: 1
    }
});
