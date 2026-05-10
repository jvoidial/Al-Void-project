import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export default function PostItem({ post }) {
  const date = new Date(post.CreatedAt).toLocaleString();
  const mediaUrl = post.MediaURL;
  const isImage = mediaUrl && (mediaUrl.match(/\.(jpeg|jpg|png|gif)$/i) || mediaUrl.includes('image'));
  return (
    <View style={styles.card}>
      <Text style={styles.username}>{post.Username || 'Anonymous'}</Text>
      <Text style={styles.content}>{post.Content}</Text>
      {mediaUrl && isImage && <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" />}
      {mediaUrl && !isImage && <Text style={styles.videoNote}>🎥 Video attached</Text>}
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
  date: { fontSize: 12, color: '#888', textAlign: 'right', marginTop: 8 },
});
