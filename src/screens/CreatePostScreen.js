import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';
import apiClient from '../api/apiClient';

export default function CreatePostScreen({ navigation }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Post cannot be empty');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/posts', { content });
      Alert.alert('Success', 'Post created');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput style={styles.input} placeholder="What's happening?" multiline value={content} onChangeText={setContent} />
      <Button title={loading ? "Posting..." : "Post"} onPress={handleSubmit} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, minHeight: 120, textAlignVertical: 'top', marginBottom: 20 },
});
