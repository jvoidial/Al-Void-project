import React, { useContext, useState } from 'react';
import { View, Text, Image, Button, Alert, StyleSheet } from 'react-native';
import apiClient from '../api/apiClient';
import { AuthContext } from '../context/AuthContext';

export default function PostItem({ post }) {
  const { userToken } = useContext(AuthContext);
  const [tipping, setTipping] = useState(false);
  const date = new Date(post.CreatedAt).toLocaleString();
  const mediaUrl = post.MediaURL;
  const isImage = mediaUrl && (mediaUrl.match(/\.(jpeg|jpg|png|gif)$/i) || mediaUrl.includes('image'));

  const sendTip = async () => {
    setTipping(true);
    try {
      await apiClient.post('/tips/solana', { to: post.UserID, amount: 0.001 });
      Alert.alert('Tip sent', 'Thank you for supporting!');
    } catch (err) {
      Alert.alert('Tip failed', err.response?.data?.error || 'Try again later');
    } finally {
      setTipping(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.username}>{post.Username || 'Anonymous'}</Text>
      <Text style={styles.content}>{post.Content}</Text>
      {mediaUrl && isImage && <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" />}
      {mediaUrl && !isImage && <Text style={styles.videoNote}>🎥 Video attached</Text>}
      <View style={styles.actions}>
        <Button title={tipping ? "Tipping..." : "Tip 0.001 SOL"} onPress={sendTip} disabled={tipping} />
      </View>
      <Text style={styles.date}>{date}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 16, margin: 8, elevation: 2 },
  username: { fontWeight: 'bold', marginBottom: 4 },
  content: { fontSize: 16, marginBottom: 8 },
  media: { width: '100%', height: 200, borderRadius: 8, marginTop: 8 },
  videoNote: { marginTop: 8, color: '#555' },
  actions: { marginTop: 10, marginBottom: 5 },
  date: { fontSize: 12, color: '#888', textAlign: 'right' },
});
