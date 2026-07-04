import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import Svg, {Polygon} from 'react-native-svg';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useAppDispatch, useAppSelector} from '../../app/hooks';
import {setWarpedImage, setOcrText} from './documentsSlice';
import {warpToFlatRectangle} from '../../native/perspectiveWarp';
import {Point} from '../detection/types';
import {RootStackParamList} from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>;

const HANDLE_RADIUS = 16;

/**
 * The manual corner-adjustment fallback the spec calls for. Auto-detected
 * corners (when available) seed the initial handle positions; the user
 * can drag any of the 4 handles before confirming. This is genuinely
 * interactive, low-frequency UI state — plain React state is the right
 * tool here, in contrast to CameraScreen's shared-value approach for
 * per-frame data. Different data, different tool, on purpose.
 */
export default function ReviewScreen({route, navigation}: Props) {
  const {documentId, corners: detectedCorners} = route.params;
  const {width: screenWidth} = useWindowDimensions();
  const dispatch = useAppDispatch();
  const document = useAppSelector(state => state.documents.items.find(d => d.id === documentId));

  const [imageSize, setImageSize] = useState<{width: number; height: number} | null>(null);
  const [handles, setHandles] = useState<Point[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handlesRef = useRef<Point[]>([]);

  const displayWidth = screenWidth;
  const displayHeight = imageSize ? (imageSize.height / imageSize.width) * displayWidth : 0;
  const scale = imageSize ? displayWidth / imageSize.width : 1;

  useEffect(() => {
    if (!document) return;
    Image.getSize(
      document.rawImageUri,
      (width, height) => setImageSize({width, height}),
      () => setError('Could not read captured image dimensions'),
    );
  }, [document]);

  useEffect(() => {
    if (!imageSize) return;
    const initial: Point[] =
      detectedCorners && detectedCorners.length === 4
        ? detectedCorners.map(p => ({x: p.x * scale, y: p.y * scale}))
        : [
            {x: displayWidth * 0.1, y: displayHeight * 0.1},
            {x: displayWidth * 0.9, y: displayHeight * 0.1},
            {x: displayWidth * 0.9, y: displayHeight * 0.9},
            {x: displayWidth * 0.1, y: displayHeight * 0.9},
          ];
    setHandles(initial);
    handlesRef.current = initial;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSize]);

  const panResponders = useMemo(
    () =>
      [0, 1, 2, 3].map(index =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onPanResponderMove: (_evt, gesture) => {
            const start = handlesRef.current[index];
            if (!start) return;
            const next = [...handlesRef.current];
            next[index] = {x: start.x + gesture.dx, y: start.y + gesture.dy};
          },
          onPanResponderGrant: () => {
            handlesRef.current = handlesRef.current.map((h, i) => (i === index ? {...h} : h));
          },
          onPanResponderRelease: (_evt, gesture) => {
            setHandles(prev => {
              const next = [...prev];
              next[index] = {x: prev[index].x + gesture.dx, y: prev[index].y + gesture.dy};
              handlesRef.current = next;
              return next;
            });
          },
        }),
      ),
    [],
  );

  const confirm = async () => {
    if (!document || handles.length !== 4) return;
    setProcessing(true);
    setError(null);
    try {
      const originalSpaceCorners = handles.map(p => ({x: p.x / scale, y: p.y / scale}));
      const warpedUri = await warpToFlatRectangle(document.rawImageUri, originalSpaceCorners);
      dispatch(setWarpedImage({id: documentId, warpedImageUri: warpedUri}));

      const result = await TextRecognition.recognize(warpedUri);
      dispatch(setOcrText({id: documentId, ocrText: result.text}));

      navigation.replace('Result', {documentId});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  if (!document || !imageSize) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Drag the corners to match the document edges</Text>
      <View style={{width: displayWidth, height: displayHeight}}>
        <Image
          source={{uri: document.rawImageUri}}
          style={{width: displayWidth, height: displayHeight}}
          resizeMode="contain"
        />
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          {handles.length === 4 && (
            <Polygon
              points={handles.map(p => `${p.x},${p.y}`).join(' ')}
              fill="rgba(37,99,235,0.15)"
              stroke="#2563eb"
              strokeWidth={2}
            />
          )}
        </Svg>
        {handles.map((point, index) => (
          <View
            key={index}
            {...panResponders[index].panHandlers}
            style={[
              styles.handle,
              {left: point.x - HANDLE_RADIUS, top: point.y - HANDLE_RADIUS},
            ]}
          />
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.confirmButton} onPress={confirm} disabled={processing}>
        {processing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.confirmButtonText}>Confirm &amp; extract text</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000', alignItems: 'center', paddingTop: 12},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000'},
  hint: {color: '#fff', marginBottom: 8, fontSize: 13},
  handle: {
    position: 'absolute',
    width: HANDLE_RADIUS * 2,
    height: HANDLE_RADIUS * 2,
    borderRadius: HANDLE_RADIUS,
    backgroundColor: '#2563eb',
    borderWidth: 2,
    borderColor: '#fff',
  },
  error: {color: '#f87171', marginTop: 8, paddingHorizontal: 16, textAlign: 'center'},
  confirmButton: {
    backgroundColor: '#2563eb',
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 220,
    alignItems: 'center',
  },
  confirmButtonText: {color: '#fff', fontWeight: '700'},
});
