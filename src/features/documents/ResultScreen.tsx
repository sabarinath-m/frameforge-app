import React, {useState} from 'react';
import {View, Image, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView} from 'react-native';
import RNFS from 'react-native-fs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useAppSelector} from '../../app/hooks';
import {RootStackParamList} from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

/**
 * OCR output is shown as an editable field, never saved verbatim without
 * a chance to fix it — recognition on a real document is never perfect,
 * and silently trusting it is how a wrong vendor name or total ends up
 * saved as fact.
 */
export default function ResultScreen({route, navigation}: Props) {
  const {documentId} = route.params;
  const document = useAppSelector(state => state.documents.items.find(d => d.id === documentId));
  const [text, setText] = useState(document?.ocrText ?? '');
  const [saving, setSaving] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  if (!document) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Document not found.</Text>
      </View>
    );
  }

  const imageUri = document.warpedImageUri ?? document.rawImageUri;

  const save = async () => {
    setSaving(true);
    try {
      const dir = `${RNFS.DocumentDirectoryPath}/scans/${documentId}`;
      await RNFS.mkdir(dir);
      const imageDest = `${dir}/document.jpg`;
      await RNFS.copyFile(imageUri.replace('file://', ''), imageDest);
      await RNFS.writeFile(`${dir}/text.txt`, text, 'utf8');
      setSavedPath(dir);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{uri: imageUri}} style={styles.image} resizeMode="contain" />

      <Text style={styles.label}>Extracted text (editable)</Text>
      <TextInput
        style={styles.textInput}
        value={text}
        onChangeText={setText}
        multiline
        placeholder="No text recognized"
      />

      <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save image + text'}</Text>
      </TouchableOpacity>

      {savedPath && <Text style={styles.savedNote}>Saved to {savedPath}</Text>}

      <TouchableOpacity
        style={styles.doneButton}
        onPress={() => navigation.popToTop()}>
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {padding: 16, alignItems: 'stretch'},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyText: {color: '#888'},
  image: {width: '100%', height: 320, backgroundColor: '#eee', borderRadius: 8, marginBottom: 16},
  label: {fontWeight: '600', marginBottom: 6},
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    minHeight: 140,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {color: '#fff', fontWeight: '700'},
  savedNote: {color: '#16a34a', textAlign: 'center', marginTop: 8, fontSize: 12},
  doneButton: {paddingVertical: 14, alignItems: 'center', marginTop: 8},
  doneButtonText: {color: '#2563eb', fontWeight: '600'},
});
