/**
 * App.js
 * 
 * นี่คือไฟล์หลักของแอปพลิเคชัน (Entry Point) เปรียบเสมือนประตูหน้าบ้าน
 * หน้าที่หลักของไฟล์นี้คือ:
 * 1. ตั้งค่าระบบ Navigation (การเปลี่ยนหน้า) ทั้งแบบ Tab และ Stack
 * 2. ตั้งค่า Provider ต่างๆ ที่จำเป็น (Database, User Interface, Language)
 * 3. จัดการ State ตั้งต้นของแอป
 */

import React, { Suspense, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar'; // ไลบรารีสำหรับจัดการแถบ Navigation Bar ของ Android

// Navigation Libraries (จัดการการเปลี่ยนหน้า)
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'; // เมนูด้านล่าง
import { createNativeStackNavigator } from '@react-navigation/native-stack'; // การซ้อนหน้า (เช่น กดจาก list -> detail)

// Services & Components
import { SQLiteProvider } from 'expo-sqlite'; // เชื่อมต่อฐานข้อมูล SQLite
import { StatusBar } from 'expo-status-bar'; // จัดการแถบสถานะด้านบน (Battery, Wifi)
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'; // จัดการพื้นที่ปลอดภัยของหน้าจอ (ติ่งหน้าจอ iPhone)

// Icons
import { Ionicons } from '@expo/vector-icons'; // ไอคอนสวยงามจาก Expo

// Screens (หน้าต่างๆ ในแอปของเรา)
import HomeScreen from './screens/HomeScreen';
import AddScreen from './screens/AddScreen';
import ListScreen from './screens/ListScreen';
import ProfileScreen from './screens/ProfileScreen';

// DB Service (ฟังก์ชันเตรียมฐานข้อมูล)
import { migrateDbIfNeeded } from './services/database';

// Contexts (ตัวแปร Global ที่ใช้ร่วมกันทั้งแอป)
import { LanguageProvider } from './context/LanguageContext'; // จัดการภาษา (ไทย/อังกฤษ)
import { ToastProvider } from './context/ToastContext'; // จัดการแจ้งเตือน Toast

// สร้างตัวจัดการ Navigation
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// หน้าจอ Loading ชั่วคราว (แสดงตอนรอฐานข้อมูลพร้อม)
function LoadingFallback() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4A90E2" />
      <Text>Loading Database...</Text>
    </View>
  );
}

// Import Hook
import { useLanguage } from './context/LanguageContext';

/**
 * MainTabs Component
 * จัดการเมนูแท็บด้านล่าง (Home / Add / List)
 */
function MainTabs() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage(); // ดึงฟังก์ชันแปลภาษามาใช้

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#4A90E2' },
        headerTintColor: '#fff',
        headerTitleAlign: 'center',
        // ปรับแต่ง Tab Bar ด้านล่าง
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarActiveTintColor: '#4A90E2', // สีไอคอนตอนเลือก
        tabBarInactiveTintColor: 'gray',   // สีไอคอนตอนไม่ได้เลือก
        tabBarLabelStyle: { fontSize: 12, paddingBottom: 5 },
        // กำหนดไอคอนให้แต่ละหน้า
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'List') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Add') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          }
          return <Ionicons name={iconName} size={28} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{
          title: t('tab_home'),
          tabBarLabel: t('tab_home')
        }}
      />
      <Tab.Screen
        name="Add"
        component={AddScreen}
        options={{
          title: t('tab_add'),
          tabBarLabel: t('tab_add')
        }}
      />
      <Tab.Screen
        name="List"
        component={ListScreen}
        options={{
          title: t('tab_list'),
          tabBarLabel: t('tab_list')
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * ProfileStack Component
 * แยกหน้านี้ออกมาเป็น Stack เผื่อในอนาคตจะมีหน้าย่อยๆ ใน Profile อีก
 */
function ProfileStack() {
  const { t } = useLanguage();
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{
          title: t('tab_profile'),
          headerStyle: { backgroundColor: '#4A90E2' },
          headerTintColor: '#fff',
          headerTitleAlign: 'center',
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * RootStack Component
 * โครงสร้างหลักรวมทุกอย่างเข้าด้วยกัน
 */
function RootStack() {
  return (
    <Stack.Navigator>
      {/* หน้าหลัก (ที่มี 3 แท็บ) */}
      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      {/* หน้า Profile (แยกออกมาเพื่อให้ซ้อนทับหน้าหลักได้ ถ้าต้องการ) */}
      <Stack.Screen
        name="Profile"
        component={ProfileStack}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

/**
 * App Function (Component หลักเริ่มต้นทำงานที่นี่)
 */
export default function App() {
  // useEffect คือฟังก์ชันที่จะทำงาน 1 ครั้งตอนเปิดแอป
  // ในที่นี้ใช้ตั้งค่า Navigation Bar ของ Android ให้เป็นสีขาว
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync("white");
      NavigationBar.setButtonStyleAsync("dark");
    }
  }, []);

  return (
    // Suspense: รอโหลด Component
    <Suspense fallback={<LoadingFallback />}>
      {/* LanguageProvider: ระบบภาษา (ไทย/อังกฤษ) ครอบทั้งแอป */}
      <LanguageProvider>
        {/* ToastProvider: ระบบแจ้งเตือนแบบป้ายเล็ก ครอบทั้งแอป */}
        <ToastProvider>
          {/* SafeAreaProvider: จัดการพื้นที่หน้าจอให้ปลอดภัย (ไม่ทับติ่ง) */}
          <SafeAreaProvider>
            {/* SQLiteProvider: จัดการฐานข้อมูล */}
            <SQLiteProvider databaseName="deetorpung.db" onInit={migrateDbIfNeeded} useSuspense>
              {/* NavigationContainer: กล่องใหญ่สำหรับระบบนำทาง */}
              <NavigationContainer>
                <StatusBar style="light" />
                <RootStack />
              </NavigationContainer>
            </SQLiteProvider>
          </SafeAreaProvider>
        </ToastProvider>
      </LanguageProvider>
    </Suspense>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
