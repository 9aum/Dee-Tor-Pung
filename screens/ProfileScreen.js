/**
 * ProfileScreen.js
 * 
 * หน้า "โปรไฟล์และการตั้งค่า"
 * ฟีเจอร์หลัก:
 * 1. แก้ไขข้อมูลส่วนตัว (ชื่อเล่น, เป้าหมาย, รูปโปรไฟล์)
 * 2. จัดการคำคม (Quotes) ที่จะไปโชว์หน้า Dashboard
 * 3. เปลี่ยนภาษา (ไทย <-> อังกฤษ)
 * 4. ล้างข้อมูลทั้งหมด (Reset Database) **อันตราย**
 */

import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy'; // จัดการไฟล์
import { Ionicons } from '@expo/vector-icons';

import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { SelectionModal } from '../components/SelectionModal';
import ErrorModal from '../components/ErrorModal';

export default function ProfileScreen({ navigation }) {
    const db = useSQLiteContext();
    const { t, language, switchLanguage } = useLanguage(); // ใช้ Hook ภาษา เพื่อสลับภาษา
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);

    // Error State
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [errorTitle, setErrorTitle] = useState('');

    // Reset Modal State (สำหรับปุ่มล้างข้อมูล)
    const [showResetModal, setShowResetModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Image Picker Modal State
    const [showImageSourceModal, setShowImageSourceModal] = useState(false);

    // Profile Data State
    const [nickname, setNickname] = useState('');
    const [goal, setGoal] = useState('');
    const [imageUri, setImageUri] = useState(null);
    const [quotes, setQuotes] = useState([]);

    // Input สำหรับเพิ่มคำคมใหม่
    const [newQuote, setNewQuote] = useState('');

    useEffect(() => {
        loadProfile();
        // อัปเดต Title ของ Header ตามภาษาที่เลือก
        navigation.setOptions({ title: t('tab_profile') });
    }, [language]);

    // โหลดข้อมูล Profile จาก DB
    const loadProfile = async () => {
        try {
            const result = await db.getFirstAsync("SELECT * FROM profile WHERE id = 1");
            if (result) {
                setNickname(result.nickname || '');
                setGoal(result.goal || '');
                setImageUri(result.image_uri);
                if (result.quotes) {
                    setQuotes(JSON.parse(result.quotes));
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const pickImage = () => {
        setShowImageSourceModal(true);
    };

    const openGallery = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true, // อนุญาตให้ Crop
                aspect: [1, 1], // บังคับสัดส่วน 1:1 (สี่เหลี่ยมจัตุรัส)
                quality: 0.5,
            });

            if (!result.canceled) {
                setImageUri(result.assets[0].uri);
            }
        } catch (error) {
            showToast(t('error'), 'error');
        }
    };

    const openCamera = async () => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
                setErrorTitle(t('camera_permission'));
                setErrorMessage(t('camera_permission_desc'));
                setShowErrorModal(true);
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled) {
                setImageUri(result.assets[0].uri);
            }
        } catch (error) {
            showToast(t('error'), 'error');
        }
    };

    // เพิ่มคำคมลงใน Array
    const addQuote = () => {
        if (newQuote.trim().length > 0) {
            setQuotes([...quotes, newQuote.trim()]);
            setNewQuote('');
        }
    };

    // ลบคำคมออกจาก Array ตาม Index
    const deleteQuote = (index) => {
        const updated = quotes.filter((_, i) => i !== index);
        setQuotes(updated);
    };

    /**
     * saveProfile()
     * บันทึกข้อมูลทั้งหมดลงตาราง profile
     */
    const saveProfile = async () => {
        setLoading(true);
        try {
            let finalImageUri = imageUri;

            // ตรวจสอบ: ถ้ารูปภาพยังเป็น Temporary (แคช) ต้องย้ายไปที่ Document Directory ก่อน
            if (imageUri && !imageUri.includes(LegacyFileSystem.documentDirectory)) {
                const filename = 'profile_' + Date.now() + '.jpg';
                const newPath = LegacyFileSystem.documentDirectory + filename;

                // พยายามใช้ copyAsync ก่อน ถ้าไม่ได้ค่อยใช้ moveAsync
                try {
                    await LegacyFileSystem.copyAsync({ from: imageUri, to: newPath });
                } catch (copyError) {
                    console.log("copyAsync failed, trying moveAsync", copyError);
                    await LegacyFileSystem.moveAsync({ from: imageUri, to: newPath });
                }

                finalImageUri = newPath;
            }

            // Update ข้อมูลลง DB
            await db.runAsync(
                `UPDATE profile SET nickname = ?, goal = ?, image_uri = ?, quotes = ? WHERE id = 1`,
                [nickname, goal, finalImageUri, JSON.stringify(quotes)]
            );

            showToast(t('save_success'), 'success');

        } catch (error) {
            console.error(error);
            setErrorMessage(error.toString());
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setShowResetModal(true);
    };

    // ยืนยันการล้างข้อมูล (เรียกใช้ฟังก์ชัน resetDatabase จาก service)
    const confirmReset = async () => {
        try {
            setLoading(true);
            const { resetDatabase } = require('../services/database');
            await resetDatabase(db);

            setShowResetModal(false);
            // รอแป๊บนึงค่อยโชว์ Success Msg
            setTimeout(() => setShowSuccessModal(true), 100);
        } catch (e) {
            setErrorMessage(e.toString());
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header: รูปโปรไฟล์ */}
            <View style={styles.header}>
                <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.profileImage} />
                    ) : (
                        <View style={styles.placeholderImage}>
                            <Ionicons name="person" size={50} color="#ccc" />
                        </View>
                    )}
                    <View style={styles.cameraIcon}>
                        <Ionicons name="camera" size={20} color="#fff" />
                    </View>
                </TouchableOpacity>
                <Text style={styles.hint}>{t('change_photo')}</Text>
            </View>

            {/* Language Switcher (ปุ่มเปลี่ยนภาษา) */}
            <View style={styles.langContainer}>
                <Text style={styles.label}>{t('language')}</Text>
                <View style={styles.langRow}>
                    <TouchableOpacity
                        style={[styles.langBtn, language === 'th' && styles.langBtnActive]}
                        onPress={() => switchLanguage('th')}
                    >
                        <Text style={[styles.langText, language === 'th' && styles.langTextActive]}>ไทย</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
                        onPress={() => switchLanguage('en')}
                    >
                        <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>English</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Form: ชื่อเล่น, เป้าหมาย */}
            <View style={styles.form}>
                <Text style={styles.label}>{t('nickname')}</Text>
                <TextInput
                    style={styles.input}
                    value={nickname}
                    onChangeText={setNickname}
                    placeholder={t('nickname')}
                />

                <Text style={styles.label}>{t('health_goal')}</Text>
                <TextInput
                    style={styles.input}
                    value={goal}
                    onChangeText={setGoal}
                    placeholder={t('health_goal')}
                    multiline
                />

                {/* ส่วนจัดการคำคม */}
                <Text style={styles.label}>{t('quotes')} ({quotes.length})</Text>
                <View style={styles.addQuoteRow}>
                    <TextInput
                        style={[styles.input, styles.quoteInput]}
                        value={newQuote}
                        onChangeText={setNewQuote}
                        placeholder={t('add_quote_placeholder')}
                    />
                    <TouchableOpacity onPress={addQuote} style={styles.addBtn}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {quotes.map((q, i) => (
                    <View key={i} style={styles.quoteItem}>
                        <Text style={styles.quoteText}>"{q}"</Text>
                        <TouchableOpacity onPress={() => deleteQuote(i)}>
                            <Ionicons name="trash-outline" size={20} color="red" />
                        </TouchableOpacity>
                    </View>
                ))}

                {/* ปุ่มบันทึก */}
                <TouchableOpacity
                    style={[styles.saveBtn, loading && styles.disabledBtn]}
                    onPress={saveProfile}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveText}>{t('save')}</Text>
                    )}
                </TouchableOpacity>

                {/* ปุ่มล้างข้อมูลทั้งหมด (สีแดง) */}
                <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: '#FF6B6B', marginTop: 0 }]}
                    onPress={handleReset}
                    disabled={loading}
                >
                    <Text style={styles.saveText}>{t('reset_data')}</Text>
                </TouchableOpacity>
            </View>

            <ErrorModal
                visible={showErrorModal}
                title={errorTitle}
                errorText={errorMessage}
                onClose={() => setShowErrorModal(false)}
            />

            {/* Reset Confirmation Modal */}
            <ConfirmationModal
                visible={showResetModal}
                title={t('reset_confirm_title')}
                message={t('reset_confirm_msg')}
                confirmText={t('reset_data')}
                cancelText={t('cancel')}
                confirmColor="#FF5252"
                onConfirm={confirmReset}
                onCancel={() => setShowResetModal(false)}
            />

            {/* Success Modal */}
            <ConfirmationModal
                visible={showSuccessModal}
                title={t('success')}
                message={t('reset_success')}
                confirmText={t('ok')}
                cancelText={null}
                confirmColor="#4cd137"
                onConfirm={() => {
                    setShowSuccessModal(false);
                    navigation.navigate('Dashboard');
                }}
            />

            {/* Image Source Selection Modal */}
            <SelectionModal
                visible={showImageSourceModal}
                title={t('choose_image')}
                onClose={() => setShowImageSourceModal(false)}
                options={[
                    {
                        text: t('take_photo'),
                        icon: 'camera',
                        onPress: openCamera
                    },
                    {
                        text: t('choose_album'),
                        icon: 'images',
                        onPress: openGallery
                    },
                    {
                        text: t('cancel'),
                        isCancel: true,
                        onPress: () => setShowImageSourceModal(false)
                    }
                ]}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    imagePicker: {
        position: 'relative',
        marginBottom: 10,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    placeholderImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#4A90E2',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    hint: {
        color: '#888',
        fontSize: 14,
    },
    form: {
        padding: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#444',
        marginBottom: 8,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#F7F9FC',
        padding: 15,
        borderRadius: 10,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E1E8ED',
    },
    addQuoteRow: {
        flexDirection: 'row',
        gap: 10,
    },
    quoteInput: {
        flex: 1,
    },
    addBtn: {
        backgroundColor: '#4cd137',
        width: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },
    quoteItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#FFF8E1',
        borderRadius: 10,
        marginTop: 8,
    },
    quoteText: {
        flex: 1,
        color: '#333',
        fontStyle: 'italic',
        marginRight: 10,
    },
    saveBtn: {
        backgroundColor: '#4A90E2',
        padding: 18,
        borderRadius: 15,
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    disabledBtn: {
        backgroundColor: '#A0C4E8',
    },
    saveText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    langContainer: {
        paddingHorizontal: 20,
        marginBottom: 10
    },
    langRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 5
    },
    langBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#eee',
        backgroundColor: '#fff'
    },
    langBtnActive: {
        backgroundColor: '#4A90E2',
        borderColor: '#4A90E2'
    },
    langText: {
        color: '#666',
        fontWeight: '600'
    },
    langTextActive: {
        color: '#fff'
    }
});
