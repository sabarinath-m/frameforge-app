import React from 'react';
import {View, Text, Image, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useAppSelector} from '../../app/hooks';
import {RootStackParamList} from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Documents'>;

export default function DocumentListScreen({navigation}: Props) {
  const documents = useAppSelector(state => state.documents.items);

  return (
    <View style={styles.container}>
      <FlatList
        data={documents}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('Result', {documentId: item.id})}>
            <Image
              source={{uri: item.warpedImageUri ?? item.rawImageUri}}
              style={styles.thumbnail}
            />
            <View style={styles.rowText}>
              <Text style={styles.title} numberOfLines={1}>
                {item.ocrText ? item.ocrText.split('\n')[0] : 'Untitled scan'}
              </Text>
              <Text style={styles.subtitle}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No documents scanned yet.</Text>}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Camera')}>
        <Text style={styles.fabText}>+ Scan document</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  list: {padding: 16},
  row: {flexDirection: 'row', alignItems: 'center', paddingVertical: 10},
  thumbnail: {width: 56, height: 56, borderRadius: 6, backgroundColor: '#eee', marginRight: 12},
  rowText: {flex: 1},
  title: {fontSize: 15, fontWeight: '600'},
  subtitle: {fontSize: 12, color: '#888', marginTop: 2},
  empty: {textAlign: 'center', color: '#999', marginTop: 60},
  fab: {
    backgroundColor: '#2563eb',
    margin: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  fabText: {color: '#fff', fontWeight: '700', fontSize: 15},
});
