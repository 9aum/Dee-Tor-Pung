import React, { Suspense } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

// Icons
import { Ionicons } from '@expo/vector-icons';

// Screens
import HomeScreen from './screens/HomeScreen';
import AddScreen from './screens/AddScreen';
import ListScreen from './screens/ListScreen';
import ProfileScreen from './screens/ProfileScreen';

// DB Service
import { migrateDbIfNeeded } from './services/database';

// Contexts
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#4A90E2' },
        headerTintColor: '#fff',
        headerTitleAlign: 'center',
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
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: 'gray',
        tabBarLabelStyle: { fontSize: 12, paddingBottom: 5 },
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

function RootStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileStack}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LanguageProvider>
        <ToastProvider>
          <SafeAreaProvider>
            <SQLiteProvider databaseName="deetorpung.db" onInit={migrateDbIfNeeded} useSuspense>
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
