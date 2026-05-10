import React, { useState } from 'react';
import { View, Button, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../api/apiClient';

export default function MediaUploader({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your gallery');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPreview(result.assets[0].uri);
      uploadFile(result.assets[0]);
    }
  };

  const uploadFile = async (asset) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('media', {
      uri: asset.uri,
      name: asset.fileName || 'media.jpg',
      type: asset.mimeType || 'image/jpeg',
    });
    try {
      const res = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploadComplete(res.data.url);
    } catch (err) {
      Alert.alert('Upload failed', err.response?.data?.error || err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View>
      <Button title="Pick Image/Video" onPress={pickMedia} disabled={uploading} />
      {uploading && <ActivityIndicator />}
      {preview && <Image source={{ uri: preview }} style={{ width: 200, height: 200, marginTop: 10 }} />}
    </View>
  );
}
