import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';
import apiClient from '../api/apiClient';
import MediaUploader from '../components/MediaUploader';

export default function CreatePostScreen({ navigation }) {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() && !mediaUrl) {
      Alert.alert('Error', 'Enter text or add media');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/posts', { content, media_url: mediaUrl });
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
      <TextInput
        style={styles.input}
        placeholder="What's happening?"
        multiline
        value={content}
        onChangeText={setContent}
      />
      <MediaUploader onUploadComplete={(url) => setMediaUrl(url)} />
      {mediaUrl !== '' && <Text style={styles.success}>Media attached</Text>}
      <Button title={loading ? "Posting..." : "Post"} onPress={handleSubmit} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, minHeight: 120, textAlignVertical: 'top', marginBottom: 20 },
  success: { color: 'green', marginBottom: 10 },
});
