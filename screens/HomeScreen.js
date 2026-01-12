/**
 * HomeScreen.js (Dashboard)
 * 
 * หน้าแรกของแอป แสดงภาพรวมข้อมูล (Dashboard)
 * หน้าที่หลัก:
 * 1. ดึงข้อมูลสรุปรายเดือน (น้ำหนักเฉลี่ย, ระยะทางรวม) จากฐานข้อมูล
 * 2. แสดงกราฟแนวโน้มน้ำหนัก (Line Chart)
 * 3. สุ่มแสดงรูปภาพที่เคยบันทึกไว้ (Slider)
 * 4. แสดงคำคมและรูปโปรไฟล์
 */

import React, { useState, useCallback, useLayoutEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite'; // Hook เชื่อมต่อฐานข้อมูล
import { useFocusEffect, useNavigation } from '@react-navigation/native'; // Hook สำหรับรู้ว่าหน้าจอถูกโฟกัส
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit'; // ไลบรารีกราฟ

import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window'); // หาความกว้างหน้าจอ

export default function HomeScreen() {
    const db = useSQLiteContext();
    const navigation = useNavigation();
    const { t, language } = useLanguage();

    // -- State Variables --
    const [currentDate, setCurrentDate] = useState(new Date()); // เดือนปัจจุบันที่แสดงโชว์
    const [stats, setStats] = useState({
        avgWeight: 0,
        totalDist: 0,
        totalTime: 0
    });
    const [slideImages, setSlideImages] = useState([]);
    const [chartData, setChartData] = useState({
        labels: ["0"],
        datasets: [{ data: [0] }]
    });

    // Profile State
    const [profile, setProfile] = useState({
        nickname: 'เพื่อน',
        imageUri: null,
        quote: 'สู้ๆ นะครับ'
    });

    /**
     * loadDashboard()
     * ฟังก์ชันหัวใจหลัก: ดึงข้อมูลสรุปจาก DB มาแสดง
     */
    const loadDashboard = async () => {
        // เตรียมตัวแปรสำหรับ Query เดือน (เช่น '2025-01%')
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const monthPrefix = `${year}-${month}`;

        try {
            // 1. ดึงข้อมูลโปรไฟล์ (ชื่อรูป, คำคม)
            const profileResult = await db.getFirstAsync("SELECT * FROM profile WHERE id = 1");
            if (profileResult) {
                let randomQuote = "สู้ๆ นะครับ";
                if (profileResult.quotes) {
                    const quotesArr = JSON.parse(profileResult.quotes); // แปลง JSON String กลับเป็น Array
                    if (quotesArr.length > 0) {
                        // สุ่มคำคม 1 อัน
                        randomQuote = quotesArr[Math.floor(Math.random() * quotesArr.length)];
                    }
                }
                setProfile({
                    nickname: profileResult.nickname || 'เพื่อน',
                    imageUri: profileResult.image_uri,
                    quote: randomQuote
                });
            }

            // 2. คำนวณสถิติ (Stats) ด้วย SQL Aggregate Functions
            // AVG = หาค่าเฉลี่ย, SUM = หาผลรวม
            const statsResult = await db.getAllAsync(
                `SELECT 
          AVG(CASE WHEN weight > 0 THEN weight ELSE NULL END) as avgWeight, 
          SUM(distance) as totalDist, 
          SUM(duration_min) as totalTime 
         FROM logs 
         WHERE date LIKE ?`,
                [`${monthPrefix}%`] // ค้นหาเฉพาะเดือนนี้ (เช่น date ขึ้นต้นด้วย '2025-01')
            );

            // 3. เตรียมข้อมูลกราฟ
            const chartResult = await db.getAllAsync(
                `SELECT date, weight FROM logs 
         WHERE date LIKE ? AND weight > 0 
         ORDER BY date ASC`,
                [`${monthPrefix}%`]
            );

            // 4. ดึงรูปภาพทั้งหมดของเดือนนี้มาโชว์สไลด์
            const imageResult = await db.getAllAsync(
                `SELECT image_uris FROM logs WHERE date LIKE ? AND image_uris IS NOT NULL`,
                [`${monthPrefix}%`]
            );

            // -- Update State UI --

            const row = statsResult[0];
            setStats({
                avgWeight: row?.avgWeight ? row.avgWeight.toFixed(1) : "0.0",
                totalDist: row?.totalDist ? row.totalDist.toFixed(1) : "0.0",
                totalTime: row?.totalTime ? row.totalTime : 0
            });

            // ปั้นข้อมูลใส่กราฟ (Chart Data)
            if (chartResult.length > 0) {
                const labels = chartResult.map(item => new Date(item.date).getDate().toString()); // แกน X: วันที่
                const data = chartResult.map(item => item.weight); // แกน Y: น้ำหนัก

                // ลดจำนวน Label แกน X เพื่อไม่ให้รกเกินไป (โชว์ตัวเว้น 3 ตัว)
                const optimizedLabels = labels.map((l, i) =>
                    (i === 0 || i === labels.length - 1 || i % 4 === 0) ? l : ''
                );
                setChartData({ labels: optimizedLabels, datasets: [{ data }] });
            } else {
                setChartData({ labels: ["Start"], datasets: [{ data: [0] }] });
            }

            // สุ่มรูปภาพ 5 รูปมาแสดง
            let allImages = [];
            imageResult.forEach(row => {
                if (row.image_uris) {
                    const uris = JSON.parse(row.image_uris);
                    allImages = [...allImages, ...uris];
                }
            });
            // เทคนิคการสุ่มแบบบ้านๆ: sort random แล้วตัดมา 5 อัน
            setSlideImages(allImages.sort(() => 0.5 - Math.random()).slice(0, 5));

        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    };

    // useFocusEffect: ทำงานทุกครั้งที่หน้านี้ถูกเปิดขึ้นมา (หรือกดกลับมาหน้านี้)
    useFocusEffect(
        useCallback(() => {
            loadDashboard();
        }, [currentDate]) // ถ้าเปลี่ยนเดือน (currentDate เปลี่ยน) ก็โหลดใหม่ด้วย
    );

    // ปรับแต่ง Header ด้านบน (แสดงรูปโปรไฟล์ และชื่อ)
    useLayoutEffect(() => {
        navigation.setOptions({
            headerLeft: () => (
                <TouchableOpacity
                    style={{ marginLeft: 15 }}
                    onPress={() => navigation.navigate('Profile')}
                >
                    {profile.imageUri ? (
                        <Image source={{ uri: profile.imageUri }} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#fff' }} />
                    ) : (
                        <Ionicons name="person-circle" size={32} color="#fff" />
                    )}
                </TouchableOpacity>
            ),
            title: `Hi, ${profile.nickname}`
        });
    }, [navigation, profile, language]);

    const changeMonth = (delta) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };

    const formatMonth = (date) => {
        return date.toLocaleDateString(language === 'en' ? 'en-US' : 'th-TH', { month: 'long', year: 'numeric' });
    };

    return (
        <ScrollView style={styles.container}>

            {/* Quote Banner (คำคม) */}
            <View style={styles.quoteContainer}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#4A90E2" style={{ marginRight: 8 }} />
                <Text style={styles.quoteText}>"{profile.quote}"</Text>
            </View>

            {/* 1. Month Selector (ปุ่มเปลี่ยนเดือน) */}
            <View style={styles.monthSelector}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowBtn}>
                    <Ionicons name="chevron-back" size={20} color="#666" />
                </TouchableOpacity>
                <Text style={styles.monthText}>{formatMonth(currentDate)}</Text>
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowBtn}>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
            </View>

            {/* 2. Compact Chart (กราฟเส้น) */}
            <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>{t('weight_trend')}</Text>
                {chartData.datasets[0].data[0] !== 0 ? (
                    <LineChart
                        data={chartData}
                        width={width - 30}
                        height={160}
                        withInnerLines={false}
                        chartConfig={{
                            backgroundColor: "#fff",
                            backgroundGradientFrom: "#fff",
                            backgroundGradientTo: "#fff",
                            decimalPlaces: 1,
                            color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
                            propsForDots: { r: "3" }
                        }}
                        bezier
                        style={styles.chart}
                    />
                ) : (
                    <View style={styles.emptyChart}>
                        <Text style={styles.emptyText}>{t('no_records')}</Text>
                    </View>
                )}
            </View>

            {/* 3. Compact Stats (การ์ดแสดงสถิติ 3 ช่อง) */}
            <View style={styles.statsContainer}>
                <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="scale-outline" size={20} color="#4A90E2" />
                    <Text style={styles.statValue}>{stats.avgWeight}</Text>
                    <Text style={styles.statLabel}>{t('weight').split(' ')[0]}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="footsteps-outline" size={20} color="#4cd137" />
                    <Text style={styles.statValue}>{stats.totalDist}</Text>
                    <Text style={styles.statLabel}>{t('km')}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#FFF8E1' }]}>
                    <Ionicons name="timer-outline" size={20} color="#e1b12c" />
                    <Text style={styles.statValue}>{stats.totalTime}</Text>
                    <Text style={styles.statLabel}>{t('min')}</Text>
                </View>
            </View>

            {/* 4. Compact Slider (สไลด์รูปภาพ) */}
            <View style={styles.sliderContainer}>
                <Text style={styles.sectionTitle}>{t('summary_7_days')}</Text>
                {slideImages.length > 0 ? (
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                        {slideImages.map((uri, index) => (
                            <Image
                                key={index}
                                source={{ uri }}
                                style={styles.slideImage}
                                resizeMode="cover"
                            />
                        ))}
                    </ScrollView>
                ) : (
                    <View style={styles.emptySlide}>
                        <Ionicons name="image-outline" size={30} color="#ccc" />
                        <Text style={styles.emptyText}>{t('no_records')}</Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    quoteContainer: {
        flexDirection: 'row',
        backgroundColor: '#F0F8FF',
        padding: 12,
        marginHorizontal: 15,
        marginTop: 15,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quoteText: {
        fontSize: 14,
        fontStyle: 'italic',
        color: '#555',
        textAlign: 'center',
        flex: 1,
    },
    monthSelector: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        backgroundColor: '#fff',
    },
    arrowBtn: {
        padding: 5,
    },
    monthText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        minWidth: 120,
        textAlign: 'center',
    },
    chartContainer: {
        alignItems: 'center',
        marginBottom: 5,
    },
    chartTitle: {
        fontSize: 12,
        color: '#888',
        alignSelf: 'flex-start',
        marginLeft: 20,
        marginBottom: 2,
    },
    chart: {
        borderRadius: 10,
        paddingRight: 30, // fix cutoff right label
    },
    emptyChart: {
        width: width - 30,
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        marginBottom: 15,
        marginTop: 5,
        gap: 8,
    },
    statCard: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 11,
        color: '#666',
    },
    sliderContainer: {
        marginBottom: 50, // Space for footer
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 20,
        marginBottom: 5,
        color: '#888',
    },
    slideImage: {
        width: width - 30,
        height: 160, // Compact height
        marginHorizontal: 15,
        borderRadius: 15,
    },
    emptySlide: {
        height: 120,
        marginHorizontal: 15,
        backgroundColor: '#f9f9f9',
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
        borderStyle: 'dashed',
    },
    emptyText: {
        color: '#888',
        marginTop: 5,
        fontSize: 12,
    },
});
