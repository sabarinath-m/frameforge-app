import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import DocumentListScreen from '../features/documents/DocumentListScreen';
import CameraScreen from '../features/detection/CameraScreen';
import ReviewScreen from '../features/documents/ReviewScreen';
import ResultScreen from '../features/documents/ResultScreen';
import {Point} from '../features/detection/types';

export type RootStackParamList = {
  Documents: undefined;
  Camera: undefined;
  Review: {documentId: string; corners: Point[] | null};
  Result: {documentId: string};
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Documents"
          component={DocumentListScreen}
          options={{title: 'Frameforge'}}
        />
        <Stack.Screen name="Camera" component={CameraScreen} options={{headerShown: false}} />
        <Stack.Screen name="Review" component={ReviewScreen} options={{title: 'Adjust corners'}} />
        <Stack.Screen name="Result" component={ResultScreen} options={{title: 'Scanned document'}} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
