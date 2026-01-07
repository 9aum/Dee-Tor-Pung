import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [weight, setWeight] = useState('');
  const [exercise, setExercise] = useState('');
  const [items, setItems] = useState([]);

  // โหลดข้อมูลเก่าตอนเปิดแอป
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('my_health_data');
      if (savedData !== null) {
        setItems(JSON.parse(savedData));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveData = async (newItems) => {
    try {
      await AsyncStorage.setItem('my_health_data', JSON.stringify(newItems));
    } catch (error) {
      Alert.alert('ผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
    }
  };

  const handleAdd = () => {
    if (!weight && !exercise) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกน้ำหนักหรือรายการที่ทำ');
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      weight,
      exercise,
      date: new Date().toLocaleDateString('th-TH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    };

    const newItems = [newItem, ...items];
    setItems(newItems);
    saveData(newItems); // บันทึกลงเครื่องทันที

    setWeight('');
    setExercise('');
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.dateText}>{item.date}</Text>
      </View>
      <View style={styles.cardContent}>
        {item.weight ? (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>น้ำหนัก:</Text>
            <Text style={styles.statValue}>{item.weight} กก.</Text>
          </View>
        ) : null}
        {item.exercise ? (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>กิจกรรม:</Text>
            <Text style={styles.statValue}>{item.exercise}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4A90E2" />

      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>ดีต่อพุง</Text>
        <Text style={styles.subtitle}>บันทึกสุขภาพง่ายๆ ด้วยตัวคุณเอง</Text>
      </View>

      {/* Input Section */}
      <View style={styles.inputContainer}>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.weightInput]}
            placeholder="น้ำหนัก (กก.)"
            keyboardType="numeric"
            value={weight}
            onChangeText={setWeight}
            placeholderTextColor="#999"
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="รายการออกกำลังกาย (เช่น วิ่ง 30 นาที)"
          value={exercise}
          onChangeText={setExercise}
          placeholderTextColor="#999"
        />

        <TouchableOpacity style={styles.button} onPress={handleAdd}>
          <Text style={styles.buttonText}>บันทึกข้อมูล</Text>
        </TouchableOpacity>
      </View>

      {/* List Section */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        style={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#4A90E2',
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#E3F2FD',
    textAlign: 'center',
    marginTop: 5,
  },
  inputContainer: {
    padding: 20,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  input: {
    backgroundColor: '#F0F4F8',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    color: '#333',
  },
  weightInput: {
    flex: 1,
  },
  button: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  cardContent: {
    gap: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    width: 70,
  },
  statValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});
