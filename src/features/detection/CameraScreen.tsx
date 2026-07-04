import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, useWindowDimensions} from 'react-native';
import {Camera, useCameraDevice, useCameraPermission} from 'react-native-vision-camera';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useAppDispatch} from '../../app/hooks';
import {addDocument} from '../documents/documentsSlice';
import {useContourDetection} from './useContourDetection';
import ContourOverlay from './ContourOverlay';
import {Point} from './types';
import {RootStackParamList} from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Camera'>;

export default function CameraScreen({navigation}: Props) {
  const {width, height} = useWindowDimensions();
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  const dispatch = useAppDispatch();
  const [statusLabel, setStatusLabel] = useState('Point the camera at a document');
  const capturingRef = useRef(false);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const capture = useCallback(
    async (corners: Point[] | null) => {
      if (capturingRef.current || camera.current == null) {
        return;
      }
      capturingRef.current = true;
      setStatusLabel('Capturing…');
      try {
        const photo = await camera.current.takePhoto({flash: 'off'});
        const id = `doc-${Date.now()}`;
        dispatch(
          addDocument({
            id,
            rawImageUri: `file://${photo.path}`,
            warpedImageUri: null,
            ocrText: null,
            createdAt: Date.now(),
          }),
        );
        navigation.navigate('Review', {documentId: id, corners});
      } finally {
        capturingRef.current = false;
        setStatusLabel('Point the camera at a document');
      }
    },
    [dispatch, navigation],
  );

  const handleStable = useCallback(
    (corners: Point[]) => {
      setStatusLabel('Held steady — capturing');
      capture(corners);
    },
    [capture],
  );

  const handleLostDetection = useCallback(() => {
    setStatusLabel('Point the camera at a document');
  }, []);

  const {frameProcessor, corners} = useContourDetection({
    onStable: handleStable,
    onLostDetection: handleLostDetection,
  });

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>Camera permission is required to scan documents.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>No camera device found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
        frameProcessor={frameProcessor}
        pixelFormat="yuv"
      />
      <ContourOverlay corners={corners} width={width} height={height} />

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{statusLabel}</Text>
      </View>

      <TouchableOpacity style={styles.manualCaptureButton} onPress={() => capture(null)}>
        <Text style={styles.manualCaptureText}>Manual capture</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000'},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24},
  permissionText: {color: '#fff', textAlign: 'center', marginBottom: 16, fontSize: 15},
  permissionButton: {backgroundColor: '#2563eb', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8},
  permissionButtonText: {color: '#fff', fontWeight: '700'},
  statusBar: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {color: '#fff', fontWeight: '600'},
  manualCaptureButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
  },
  manualCaptureText: {color: '#111', fontWeight: '700'},
});
