import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export const Toast = ({ message, type = 'success', visible, onHide }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        if (visible) {
            // Show
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 50, // Top position
                    duration: 400,
                    useNativeDriver: true,
                })
            ]).start();

            // Auto hide
            const timer = setTimeout(() => {
                hide();
            }, 3000);

            return () => clearTimeout(timer);
        } else {
            hide();
        }
    }, [visible]);

    const hide = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start(() => onHide && onHide());
    };

    const getBackgroundColor = () => {
        switch (type) {
            case 'success': return '#4cd137';
            case 'error': return '#e84118';
            case 'info': return '#00a8ff';
            default: return '#333';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return 'checkmark-circle';
            case 'error': return 'alert-circle';
            case 'info': return 'information-circle';
            default: return 'notifications';
        }
    };

    if (!visible && fadeAnim._value === 0) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: getBackgroundColor(),
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                }
            ]}
        >
            <Ionicons name={getIcon()} size={24} color="#fff" />
            <Text style={styles.text}>{message}</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        alignSelf: 'center',
        width: width * 0.9,
        padding: 15,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        zIndex: 9999, // On top of everything
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    text: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        flex: 1
    }
});
