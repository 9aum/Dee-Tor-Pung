/**
 * ListScreen.js
 * 
 * หน้าแสดงรายการประวัติ (History Log)
 * หลักการทำงาน:
 * 1. ใช้ FlatList เพื่อแสดงข้อมูลจำนวนมากอย่างมีประสิทธิภาพ
 * 2. มีระบบ Pagination (โหลดทีละ 10 รายการ) เมื่อเลื่อนลงล่างสุด
 * 3. สามารถกด Edit (ไปหน้า Add) หรือ Delete ได้
 */

import React, { useState, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList, // Component พระเอกสำหรับแสดงรายการยาวๆ
    Image,
    Dimensions,
    TouchableOpacity,
    ScrollView,
    Modal
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { ConfirmationModal } from '../components/ConfirmationModal';

export default function ListScreen({ navigation }) {
    const db = useSQLiteContext();
    const { t, language } = useLanguage();
    const { showToast } = useToast();

    // -- State --
    const [items, setItems] = useState([]); // เก็บรายการทั้งหมดที่จะแสดง
    const [offset, setOffset] = useState(0); // ตัวนับว่าโหลดไปถึงไหนแล้ว (Pagination)
    const [hasMore, setHasMore] = useState(true); // ยังมีข้อมูลเหลือให้โหลดอีกไหม
    const [isLoading, setIsLoading] = useState(false);
    const limit = 10; // โหลดทีละ 10 รายการ

    // State สำหรับ Modal ดูรูปภาพขยายใหญ่
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    // State สำหรับ Modal ยืนยันการลบ
    const [deleteModal, setDeleteModal] = useState({ visible: false, id: null });

    // ตั้งชื่อหน้าจอที่ Header Bar
    React.useLayoutEffect(() => {
        navigation.setOptions({ title: t('tab_list') });
    }, [navigation, language]);

    /**
     * loadData()
     * ฟังก์ชันโหลดข้อมูลจาก SQLite
     * reset = true เมื่อต้องการโหลดใหม่ทั้งหมด (เช่น ตอนเปิดหน้าจอมาใหม่)
     */
    const loadData = async (reset = false) => {
        if (isLoading) return; // ถ้ากำลังโหลดอยู่ อย่าเพิ่งโหลดซ้ำ
        if (!hasMore && !reset) return; // ถ้าข้อมูลหมดแล้ว และไม่ได้สั่งรีเซ็ต ก็ไม่ต้องทำอะไร

        setIsLoading(true);
        try {
            const currentOffset = reset ? 0 : offset;
            // LIMIT ? OFFSET ? คือหัวใจของ Pagination (ดึงข้อมูลทีละส่วน)
            const result = await db.getAllAsync(
                `SELECT * FROM logs ORDER BY date DESC LIMIT ? OFFSET ?`,
                [limit, currentOffset]
            );

            if (reset) {
                setItems(result);
                setOffset(limit);
                setHasMore(result.length === limit); // ถ้าดึงได้ครบ 10 แปลว่าน่าจะมีอีก
            } else {
                if (result.length > 0) {
                    setItems(prev => {
                        // ป้องกัน ID ซ้ำ (เผื่อ Logic ผิดพลาด)
                        const existingIds = new Set(prev.map(i => i.id));
                        const uniqueNew = result.filter(i => !existingIds.has(i.id));
                        return [...prev, ...uniqueNew]; // ต่อท้ายรายการเดิม
                    });
                    setOffset(prev => prev + limit);
                    setHasMore(result.length === limit);
                } else {
                    setHasMore(false); // หมดแล้วจ้า
                }
            }
        } catch (error) {
            console.error('Error loading list:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // โหลดข้อมูลใหม่ทุกครั้งที่เข้ามาที่หน้านี้
    useFocusEffect(
        useCallback(() => {
            loadData(true);
        }, [])
    );

    // แก้ไข: ส่งข้อมูลเดิม (item) ไปหน้า Add เพื่อให้กรอกข้อมูลเดิมรอไว้
    const handleEdit = (item) => {
        navigation.navigate('Add', { existingLog: item });
    };

    // ลบ: เปิด Modal ยืนยันก่อน
    const handleDelete = (id) => {
        setDeleteModal({ visible: true, id });
    };

    // ยืนยันลบจริง
    const confirmDelete = async () => {
        const idToDelete = deleteModal.id;
        if (!idToDelete) return;

        try {
            await db.runAsync(`DELETE FROM logs WHERE id = ?`, [idToDelete]);

            // ลบออกจาก State ทันที ไม่ต้องโหลดใหม่จาก DB ให้เสียเวลา
            setItems(prev => prev.filter(item => item.id !== idToDelete));

            showToast(t('delete_success'), 'success');
            setDeleteModal({ visible: false, id: null });
        } catch (error) {
            console.log("Delete error", error);
            showToast(t('error'), 'error');
        }
    };

    const openImage = (uri) => {
        setSelectedImage(uri);
        setModalVisible(true);
    };

    // ฟังก์ชันย่อยสำหรับ render แต่ละรายการ (Card)
    const renderItem = ({ item }) => {
        const dateObj = new Date(item.date);
        const dateStr = dateObj.toLocaleDateString(language === 'en' ? 'en-US' : 'th-TH', {
            year: 'numeric', month: 'short', day: 'numeric'
        });

        // แปลง JSON String กลับเป็น Array รูปภาพ
        const images = item.image_uris ? JSON.parse(item.image_uris) : [];

        return (
            <View style={styles.card}>
                {/* Header การ์ด: วันที่ + ปุ่มแก้ไข/ลบ */}
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Ionicons name="time-outline" size={14} color="#888" />
                        <Text style={styles.dateText}>{dateStr}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
                            <Ionicons name="pencil" size={18} color="#4A90E2" />
                            <Text style={styles.actionText}>{t('edit')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.actionBtn, { backgroundColor: '#FFEBEE' }]}>
                            <Ionicons name="trash-outline" size={18} color="#FF5252" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Body การ์ด: ข้อมูลน้ำหนัก/ออกกำลังกาย */}
                <View style={styles.cardBody}>
                    <View style={styles.infoCol}>
                        {item.weight > 0 && (
                            <View style={styles.statRow}>
                                <Ionicons name="scale-outline" size={18} color="#4A90E2" />
                                <Text style={styles.statValue}>{item.weight} {t('weight').split('(')[1].replace(')', '')}</Text>
                            </View>
                        )}

                        {(item.distance > 0 || item.duration_min > 0) && (
                            <View style={styles.statRow}>
                                <Ionicons name="fitness-outline" size={18} color="#e1b12c" />
                                <View>
                                    <Text style={styles.statValue}>{t('exercise')}</Text>
                                    <Text style={styles.subStat}>
                                        {item.distance > 0 ? `${item.distance} ${t('km')}` : ''}
                                        {item.distance > 0 && item.duration_min > 0 ? ' • ' : ''}
                                        {item.duration_min > 0 ? `${item.duration_min} ${t('min')}` : ''}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Footer การ์ด: รูปภาพ (ถ้ามี) */}
                {images.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                        {images.map((img, idx) => (
                            <TouchableOpacity key={idx} onPress={() => openImage(img)}>
                                <Image source={{ uri: img }} style={styles.thumbnail} />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                // เมื่อเลื่อนถึงขอบล่าง 50% ให้โหลดเพิ่ม
                onEndReached={() => {
                    if (!isLoading) loadData(false);
                }}
                onEndReachedThreshold={0.5}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>{t('no_records')}</Text>
                }
            />

            {/* Modal ดูรูปเต็มจอ */}
            <Modal
                visible={modalVisible}
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={() => setModalVisible(false)}
                    >
                        <Ionicons name="close-circle" size={40} color="#fff" />
                    </TouchableOpacity>
                    {selectedImage && (
                        <Image
                            source={{ uri: selectedImage }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            {/* Modal ยืนยันลบ */}
            <ConfirmationModal
                visible={deleteModal.visible}
                title={t('confirm_delete_title')}
                message={t('confirm_delete_msg')}
                confirmText={t('delete')}
                cancelText={t('cancel')}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteModal({ visible: false, id: null })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingBottom: 8,
    },
    dateText: {
        fontSize: 14,
        color: '#666',
        fontWeight: 'bold',
    },
    cardBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoCol: {
        flex: 1,
        gap: 12,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    statValue: {
        fontSize: 16,
        color: '#333',
        fontWeight: '600',
    },
    subStat: {
        fontSize: 14,
        color: '#E67E22', // Orange tint for activity details
        marginTop: 2,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 6,
        backgroundColor: '#F0F4F8',
        borderRadius: 8,
        gap: 4
    },
    actionText: {
        color: '#4A90E2',
        fontSize: 12,
        fontWeight: 'bold'
    },
    imageScroll: {
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f5f5f5',
        paddingTop: 10
    },
    thumbnail: {
        width: 80,
        height: 80,
        borderRadius: 10,
        backgroundColor: '#eee',
        marginRight: 10,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: '#999',
        fontSize: 16,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    fullImage: {
        width: '100%',
        height: '80%',
    },
    closeBtn: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 999
    }
});
