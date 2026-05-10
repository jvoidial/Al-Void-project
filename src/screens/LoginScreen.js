import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import apiClient from '../api/apiClient';
import { AuthContext } from '../context/AuthContext';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Enter username and password');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/login', { username, password });
      await signIn(res.data.token);
    } catch (err) {
      Alert.alert('Login failed', err.response?.data?.error || 'Check credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Void</Text>
      <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {loading ? <ActivityIndicator /> : <Button title="Login" onPress={handleLogin} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#1a1a2e' },
  title: { fontSize: 40, fontWeight: 'bold', color: '#e94560', marginBottom: 40, textAlign: 'center' },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 16 },
});
