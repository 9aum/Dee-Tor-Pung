import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Platform
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import ErrorModal from '../components/ErrorModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { SelectionModal } from '../components/SelectionModal';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

export default function AddScreen({ navigation, route }) {
    const db = useSQLiteContext();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const isSubmitting = useRef(false);

    // State for form
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [weight, setWeight] = useState('');
    const [distance, setDistance] = useState('');
    const [duration, setDuration] = useState('');
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);

    // Edit Mode State
    const [editingId, setEditingId] = useState(null);

    // Modals
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [errorTitle, setErrorTitle] = useState('');
    const [duplicateModal, setDuplicateModal] = useState({ visible: false, data: null });
    const [showImageSourceModal, setShowImageSourceModal] = useState(false);

    React.useLayoutEffect(() => {
        navigation.setOptions({ title: t('tab_add') });
    }, [navigation, t]);

    // Load data if editing
    React.useEffect(() => {
        if (route.params?.existingLog) {
            const item = route.params.existingLog;
            setEditingId(item.id);
            setDate(new Date(item.date));
            setWeight(item.weight ? item.weight.toString() : '');
            setDistance(item.distance ? item.distance.toString() : '');
            setDuration(item.duration_min ? item.duration_min.toString() : '');
            setImages(item.image_uris ? JSON.parse(item.image_uris) : []);
        }
    }, [route.params]);

    const resetForm = () => {
        setWeight('');
        setDistance('');
        setDuration('');
        setImages([]);
        setDate(new Date());
        setEditingId(null);
        navigation.setParams({ existingLog: null });
    };

    const onChangeDate = async (event, selectedDate) => {
        const currentDate = selectedDate || date;
        setShowDatePicker(Platform.OS === 'ios');

        if (currentDate.toDateString() !== date.toDateString()) {
            await checkDuplicateDate(currentDate);
        }
        setDate(currentDate);
    };

    const checkDuplicateDate = async (checkDate) => {
        try {
            const year = checkDate.getFullYear();
            const month = String(checkDate.getMonth() + 1).padStart(2, '0');
            const day = String(checkDate.getDate()).padStart(2, '0');
            const datePattern = `${year}-${month}-${day}%`;

            const result = await db.getFirstAsync(
                `SELECT * FROM logs WHERE date LIKE ?`,
                [datePattern]
            );

            if (result) {
                // If editing the same ID, it's not a duplicate
                if (editingId && result.id === editingId) {
                    return null;
                }
                // Show Custom Modal instead of Alert
                setDuplicateModal({ visible: true, data: result });
                return result;
            }
            return null;
        } catch (e) {
            console.log("Check date error", e);
            return null;
        }
    };

    const confirmEditDuplicate = () => {
        const result = duplicateModal.data;
        if (result) {
            setEditingId(result.id);
            setWeight(result.weight ? result.weight.toString() : '');
            setDistance(result.distance ? result.distance.toString() : '');
            setDuration(result.duration_min ? result.duration_min.toString() : '');
            setImages(result.image_uris ? JSON.parse(result.image_uris) : []);
            setDate(new Date(result.date));
        }
        setDuplicateModal({ visible: false, data: null });
    };

    const cancelDuplicate = () => {
        setDuplicateModal({ visible: false, data: null });
        // Optional: Reset date to today if cancelled? 
        // For now, let user keep the selected date but just cancel the overwrite action.
    };

    const pickImage = () => {
        if (images.length >= 3) {
            setErrorTitle(t('full_limit'));
            setErrorMessage(t('full_limit_desc'));
            setShowErrorModal(true);
            return;
        }
        setShowImageSourceModal(true);
    };

    // ... openGallery, openCamera, removeImage unchanged ...

    const openGallery = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.5,
            });

            if (!result.canceled) {
                setImages([...images, result.assets[0].uri]);
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
                quality: 0.5,
            });

            if (!result.canceled) {
                setImages([...images, result.assets[0].uri]);
            }
        } catch (error) {
            showToast(t('error'), 'error');
        }
    };

    const removeImage = (indexToRemove) => {
        setImages(images.filter((_, index) => index !== indexToRemove));
    };

    const saveToDb = async () => {
        // ... unchanged ...
        if (isSubmitting.current) return;

        if (!weight && !distance && !duration) {
            setErrorTitle(t('missing_data'));
            setErrorMessage(t('missing_data_desc'));
            setShowErrorModal(true);
            return;
        }

        // Check for duplicates before saving
        // Only check if we are NOT already editing a specific ID (or if date changed significantly)
        // logic: checkDuplicateDate returns the existing record if found.
        const duplicate = await checkDuplicateDate(date);

        // If duplicate found and we are not just updating it (handled inside checkDuplicateDate logic for self-id), stop.
        if (duplicate) {
            return;
        }

        isSubmitting.current = true;
        setLoading(true);
        try {
            const savedImageUris = [];
            for (const uri of images) {
                try {
                    const filename = uri.split('/').pop();
                    const newPath = LegacyFileSystem.documentDirectory + filename;

                    await LegacyFileSystem.moveAsync({
                        from: uri,
                        to: newPath
                    });

                    savedImageUris.push(newPath);
                } catch (imgError) {
                    try {
                        await LegacyFileSystem.copyAsync({ from: uri, to: newPath });
                        savedImageUris.push(newPath);
                    } catch (retryError) {
                        console.error("Image Retry Error:", retryError);
                    }
                }
            }

            const isoDate = date.toISOString();

            if (editingId) {
                await db.runAsync(
                    `UPDATE logs SET date = ?, weight = ?, distance = ?, duration_min = ?, image_uris = ? WHERE id = ?`,
                    [
                        isoDate,
                        weight ? parseFloat(weight) : 0,
                        distance ? parseFloat(distance) : 0,
                        duration ? parseInt(duration) : 0,
                        JSON.stringify(savedImageUris),
                        editingId
                    ]
                );
            } else {
                await db.runAsync(
                    `INSERT INTO logs (date, weight, distance, duration_min, image_uris) VALUES (?, ?, ?, ?, ?)`,
                    [
                        isoDate,
                        weight ? parseFloat(weight) : 0,
                        distance ? parseFloat(distance) : 0,
                        duration ? parseInt(duration) : 0,
                        JSON.stringify(savedImageUris)
                    ]
                );
            }

            showToast(t('save_success'), 'success');
            resetForm();
            navigation.navigate('Dashboard');

        } catch (error) {
            console.error(error);
            setLoading(false);
            setErrorMessage(error.toString());
            setShowErrorModal(true);
        } finally {
            setLoading(false);
            isSubmitting.current = false;
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>

            {/* Row 1: General Info Section */}
            <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>
                    {editingId ? t('edit_data') : t('today_data')}
                </Text>
                <View style={styles.row}>
                    {/* Date Picker */}
                    <View style={[styles.col, { flex: 1.6 }]}>
                        <Text style={styles.subLabel}>{t('date')}</Text>
                        <TouchableOpacity
                            style={styles.dateBtn}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={28} color="#4A90E2" />
                            <Text style={styles.dateText}>
                                {date.toLocaleDateString(t('lang') === 'en' ? 'en-US' : 'th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Weight */}
                    <View style={styles.col}>
                        <Text style={styles.subLabel}>{t('weight')}</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.inputCompact}
                                keyboardType="numeric"
                                placeholder="0.0"
                                value={weight}
                                onChangeText={setWeight}
                            />
                        </View>
                    </View>
                </View>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    themeVariant="light"
                    onChange={onChangeDate}
                    maximumDate={new Date()}
                />
            )}

            {/* Row 2: Exercise Section */}
            <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>{t('exercise')}</Text>
                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.subLabel}>{t('distance')}</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.inputCompact}
                                keyboardType="numeric"
                                placeholder="0.0"
                                value={distance}
                                onChangeText={setDistance}
                            />
                        </View>
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.subLabel}>{t('duration')}</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.inputCompact}
                                keyboardType="numeric"
                                placeholder="0"
                                value={duration}
                                onChangeText={setDuration}
                            />
                        </View>
                    </View>
                </View>
            </View>

            {/* Row 3: Images */}
            <View style={styles.rowCenter}>
                {images.map((uri, index) => (
                    <View key={index} style={styles.imageWrapper}>
                        <Image source={{ uri }} style={styles.thumbnail} />
                        <TouchableOpacity
                            style={styles.deleteBadge}
                            onPress={() => removeImage(index)}
                        >
                            <Ionicons name="close" size={12} color="#fff" />
                        </TouchableOpacity>
                    </View>
                ))}
                {images.length < 3 && (
                    <TouchableOpacity style={styles.addImgBtn} onPress={pickImage}>
                        <Ionicons name="camera" size={24} color="#666" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Save Button */}
            <TouchableOpacity
                style={[styles.saveButton, loading && styles.disabledButton]}
                onPress={saveToDb}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.saveButtonText}>{t('save')}</Text>
                )}
            </TouchableOpacity>

            {/* Error Modal */}
            <ErrorModal
                visible={showErrorModal}
                title={errorTitle}
                errorText={errorMessage}
                onClose={() => setShowErrorModal(false)}
            />

            {/* Custom Confirmation Modal */}
            <ConfirmationModal
                visible={duplicateModal.visible}
                title={t('duplicate_date_title')}
                message={t('duplicate_date_msg')}
                confirmText={t('duplicate_yes')}
                cancelText={t('duplicate_no')}
                confirmColor="#4A90E2" // Blue for 'Edit'
                onConfirm={confirmEditDuplicate}
                onCancel={cancelDuplicate}
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
    content: {
        padding: 15,
    },
    row: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 15,
    },
    rowCenter: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    col: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    subLabel: {
        fontSize: 12,
        color: '#888',
        marginBottom: 4,
    },
    dateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F4F8',
        paddingVertical: 21, // Consistent padding
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E1E8ED',
        gap: 8,
        minHeight: 50, // Increased to 60 for large font safety and consistency
    },
    dateText: {
        fontSize: 16,
        color: '#333',
        flexShrink: 1,
    },
    inputWrapper: {
        backgroundColor: '#F0F4F8',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E1E8ED',
        minHeight: 55, // Exactly matches dateBtn
        justifyContent: 'center',
        paddingVertical: 10, // Consistent padding
    },
    inputCompact: {
        paddingHorizontal: 10,
        fontSize: 18, // Standardized large font
        color: '#333',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    sectionBox: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 15,
        padding: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4A90E2',
        marginBottom: 10,
    },
    imageWrapper: {
        position: 'relative',
    },
    thumbnail: {
        width: 60,
        height: 60,
        borderRadius: 10,
    },
    deleteBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: 'red',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fff',
    },
    addImgBtn: {
        width: 60,
        height: 60,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fafafa',
    },
    saveButton: {
        backgroundColor: '#4A90E2',
        padding: 15,
        borderRadius: 25,
        alignItems: 'center',
        elevation: 3,
    },
    disabledButton: {
        backgroundColor: '#B0C4DE',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
