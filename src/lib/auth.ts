import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

const FACE_ID_PREF_KEY = 'lr_face_id_enabled';

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  await supabase.auth.signOut();
  await SecureStore.deleteItemAsync(FACE_ID_PREF_KEY);
}

export async function checkFaceIdAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return isEnrolled;
}

export async function authenticateWithFaceId(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock LR',
    fallbackLabel: 'Use password',
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function getFaceIdPreference(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(FACE_ID_PREF_KEY);
  return value === 'true';
}

export async function setFaceIdPreference(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(FACE_ID_PREF_KEY, enabled ? 'true' : 'false');
}
