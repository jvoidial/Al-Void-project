import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PostItem({ post }) {
  const date = new Date(post.CreatedAt).toLocaleString();
  return (
    <View style={styles.card}>
      <Text style={styles.username}>{post.Username || 'Anonymous'}</Text>
      <Text style={styles.content}>{post.Content}</Text>
      <Text style={styles.date}>{date}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 16, marginHorizontal: 16, marginVertical: 8, elevation: 2 },
  username: { fontWeight: 'bold', marginBottom: 4 },
  content: { fontSize: 16, marginBottom: 8 },
  date: { fontSize: 12, color: '#888', textAlign: 'right' },
});
