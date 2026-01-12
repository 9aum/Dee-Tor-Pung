/**
 * ErrorModal.js
 * 
 * ใช้แสดง "หน้าต่างแจ้งเตือนข้อผิดพลาด" (Error Popup)
 * ความพิเศษคือ: มีปุ่มให้ Copy ข้อความ Error ได้ เพื่อส่งให้ Developer ดูง่ายๆ
 */

import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import * as Clipboard from 'expo-clipboard'; // ไลบรารีสำหรับ Copy paste

export default function ErrorModal({ visible, errorText, onClose, title }) {
    // ฟังก์ชัน Copy ข้อความลง Clipboard
    const handleCopy = async () => {
        await Clipboard.setStringAsync(errorText); // สั่ง Copy
        alert('คัดลอกข้อความแล้ว (Copied to Clipboard)'); // แจ้งผู้ใช้
    };

    return (
        <Modal
            animationType="slide" // เลื่อนขึ้นมาจากด้านล่าง
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <View style={styles.header}>
                        <Ionicons name="warning" size={30} color="#FF6B6B" />
                        <Text style={styles.modalTitle}>{title || 'เกิดข้อผิดพลาด'}</Text>
                    </View>

                    <Text style={styles.instruction}>กดปุ่มเพื่อคัดลอก (Copy)</Text>

                    {/* ใช้ ScrollView เผื่อข้อความ Error ยาวมากๆ */}
                    <View style={styles.logContainer}>
                        <ScrollView style={{ maxHeight: 200 }}>
                            {/* ใช้ TextInput เพื่อให้ผู้ใช้สามารถเลือก Copy บางส่วนได้ด้วย (Editable=true แต่เราไม่ได้เอาค่าไปใช้) */}
                            <TextInput
                                style={styles.logText}
                                value={errorText}
                                multiline
                                editable={true}
                                scrollEnabled={false}
                            />
                        </ScrollView>
                    </View>

                    <View style={styles.buttonRow}>
                        {/* ปุ่ม Copy */}
                        <TouchableOpacity
                            style={[styles.closeButton, { backgroundColor: '#4cd137', marginRight: 10 }]}
                            onPress={handleCopy}
                        >
                            <Text style={styles.textStyle}>คัดลอก (Copy)</Text>
                        </TouchableOpacity>

                        {/* ปุ่มปิด */}
                        <TouchableOpacity
                            style={[styles.closeButton, { backgroundColor: '#2196F3' }]}
                            onPress={onClose}
                        >
                            <Text style={styles.textStyle}>ปิด</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 25,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '85%',
        maxHeight: '70%'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 10
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333'
    },
    instruction: {
        fontSize: 12,
        color: '#888',
        marginBottom: 10
    },
    logContainer: {
        width: '100%',
        backgroundColor: '#f1f1f1',
        borderRadius: 10,
        padding: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ddd'
    },
    logText: {
        color: '#d63031',
        fontFamily: 'monospace',
        maxHeight: 200,
        textAlignVertical: 'top'
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%'
    },
    closeButton: {
        borderRadius: 10,
        padding: 10,
        elevation: 2,
        minWidth: 100,
        alignItems: 'center'
    },
    textStyle: {
        color: "white",
        fontWeight: "bold",
        textAlign: "center"
    }
});
