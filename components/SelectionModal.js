/**
 * SelectionModal.js
 * 
 * ใช้สำหรับ "ตัวเลือก" (Menu Popup) เช่น เลือกรูปภาพจากกล้อง หรือ อัลบั้ม
 * รับค่า options เป็น Array แล้ววนลูปสร้างปุ่มตามจำนวน
 */

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const SelectionModal = ({ visible, title, options, onClose }) => {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            {/* TouchableWithoutFeedback + onClose: กดพื้นที่ว่างๆ เพื่อปิด Modal */}
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    {/* กดที่ตัว Modal เอง ไม่ต้องทำอะไร (ป้องกัน event ทะลุไปปิด) */}
                    <TouchableWithoutFeedback>
                        <View style={styles.modalContainer}>
                            {title && <Text style={styles.title}>{title}</Text>}

                            {/* วนลูป options เพื่อสร้างปุ่มตามรายการที่ส่งมา */}
                            {options.map((option, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.optionBtn,
                                        option.isDestructive && styles.destructiveBtn, // ถ้าเป็นปุ่มอันตราย (สีแดง)
                                        option.isCancel && styles.cancelBtn // ถ้าเป็นปุ่มยกเลิก
                                    ]}
                                    onPress={() => {
                                        option.onPress();
                                        // ถ้าไม่ได้สั่งให้เปิดค้างไว้ -> ปิดปุ่มทันทีที่กด
                                        if (!option.stayOpen) onClose();
                                    }}
                                >
                                    <View style={styles.optionContent}>
                                        {option.icon && (
                                            <Ionicons
                                                name={option.icon}
                                                size={20}
                                                color={option.isDestructive ? '#FF5252' : (option.isCancel ? '#666' : '#4A90E2')}
                                                style={{ marginRight: 10 }}
                                            />
                                        )}
                                        <Text style={[
                                            styles.optionText,
                                            option.isDestructive && styles.destructiveText,
                                            option.isCancel && styles.cancelText
                                        ]}>
                                            {option.text}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    optionBtn: {
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionText: {
        fontSize: 16,
        color: '#4A90E2',
        fontWeight: '500',
    },
    destructiveBtn: {
        marginTop: 10,
    },
    destructiveText: {
        color: '#FF5252',
    },
    cancelBtn: {
        borderBottomWidth: 0,
        marginTop: 10,
    },
    cancelText: {
        color: '#666',
        fontWeight: 'bold',
    },
});
