/**
 * ConfirmationModal.js
 * 
 * ใช้สำหรับ "ยืนยันการกระทำ" ที่สำคัญ (เช่น ลบข้อมูล, บันทึกซ้ำ)
 * มีปุ่ม 2 ปุ่มเสมอ: ยืนยัน (สีตามสั่ง) และ ยกเลิก (สีเทา)
 */

import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';

export const ConfirmationModal = ({
    visible,        // สถานะเปิด/ปิด Modal (True/False)
    title,          // หัวข้อ
    message,        // ข้อความรายละเอียด
    onConfirm,      // ฟังก์ชันที่จะทำงานเมื่อกดยืนยัน
    onCancel,       // ฟังก์ชันที่จะทำงานเมื่อกดยกเลิก
    confirmText = 'ยืนยัน',      // ข้อความบนปุ่มยืนยัน (ค่าเริ่มต้น: ยืนยัน)
    cancelText = 'ยกเลิก',       // ข้อความบนปุ่มยกเลิก (ค่าเริ่มต้น: ยกเลิก)
    confirmColor = '#FF6B6B'    // สีปุ่มยืนยัน (ค่าเริ่มต้น: สีแดง ไว้เตือนใจว่าเป็นเรื่องสำคัญ)
}) => {
    return (
        <Modal
            transparent={true} // พื้นหลังโปร่งแสง เห็นหน้าเดิมลางๆ
            visible={visible}
            animationType="fade" // เอฟเฟกต์ค่อยๆ ปรากฏ
            onRequestClose={onCancel} // กดปุ่ม Back ของ Android แล้วปิดได้
        >
            <View style={styles.overlay}>
                {/* กล่องสีขาวตรงกลาง */}
                <View style={styles.modalContainer}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonRow}>
                        {/* ปุ่มยกเลิก (แสดงเฉพาะเมื่อมีข้อความ cancelText) */}
                        {cancelText && (
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={onCancel}
                            >
                                <Text style={styles.cancelText}>{cancelText}</Text>
                            </TouchableOpacity>
                        )}

                        {/* ปุ่มยืนยัน */}
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: confirmColor }]}
                            onPress={onConfirm}
                        >
                            <Text style={styles.confirmText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center'
    },
    message: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 25,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F0F4F8',
    },
    cancelText: {
        color: '#555',
        fontWeight: 'bold',
        fontSize: 16,
    },
    confirmText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
