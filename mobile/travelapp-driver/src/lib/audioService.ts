import * as Speech from 'expo-speech';
import { Vibration } from 'react-native';

let isAlertPlaying = false;
let alertSafetyTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Reproduce la alerta sonora fuerte y continua para el conductor cuando entra una nueva solicitud de viaje.
 * @param _customAudioUrl URL opcional
 */
export async function playTripRequestAlertSound(_customAudioUrl?: string): Promise<void> {
  try {
    if (isAlertPlaying) return;
    isAlertPlaying = true;

    if (alertSafetyTimer) clearTimeout(alertSafetyTimer);
    alertSafetyTimer = setTimeout(() => {
      stopTripRequestAlertSound();
    }, 15000);

    // Vibración persistente de solicitud entrante
    Vibration.vibrate([0, 500, 200, 500, 200, 500], true);

    // Locución hablada de alerta inmediata
    Speech.stop();
    Speech.speak('Nueva solicitud de viaje. Tocá la pantalla para aceptar.', {
      language: 'es-AR',
      rate: 1.05,
      pitch: 1.0,
      onDone: () => { isAlertPlaying = false; },
      onStopped: () => { isAlertPlaying = false; },
      onError: () => { isAlertPlaying = false; },
    });
  } catch (err) {
    isAlertPlaying = false;
    console.warn('Error playing trip request alert sound:', err);
  }
}

/**
 * Detiene inmediatamente el sonido de alerta de solicitud de viaje.
 */
export async function stopTripRequestAlertSound(): Promise<void> {
  try {
    isAlertPlaying = false;
    if (alertSafetyTimer) {
      clearTimeout(alertSafetyTimer);
      alertSafetyTimer = null;
    }
    Vibration.cancel();
    Speech.stop();
  } catch (err) {
    console.log('Error stopping alert sound:', err);
  }
}

/**
 * Reproduce la locución de seguridad al iniciar el viaje (Cinturón de seguridad).
 * @param customText Texto personalizado configurado desde el Dashboard
 * @param _customAudioUrl URL de audio (opcional)
 * @param voiceGender 'female' | 'male' para entonación femenina o masculina
 */
export async function playSeatbeltSafetyPrompt(
  customText?: string,
  _customAudioUrl?: string,
  voiceGender: 'female' | 'male' = 'female'
): Promise<void> {
  try {

    const textToSpeak = customText || 'Por tu seguridad, es importante que te coloques el cinturón de seguridad y verifiques tu destino. ¡Buen viaje!';
    Speech.stop();
    Speech.speak(textToSpeak, {
      language: 'es-AR',
      rate: 0.95,
      pitch: voiceGender === 'male' ? 0.8 : 1.15,
    });
  } catch (err) {
    console.warn('Error playing seatbelt safety prompt:', err);
  }
}

/**
 * Reproduce una notificación hablada personalizada o alerta sonoro según lo enviado desde el Dashboard Web.
 */
export function playCustomVoiceNotification(text: string, voiceGender: 'female' | 'male' = 'female'): void {
  try {
    if (!text) return;
    Vibration.vibrate([0, 300, 150, 300]);
    Speech.stop();
    Speech.speak(text, {
      language: 'es-AR',
      rate: 1.0,
      pitch: voiceGender === 'male' ? 0.8 : 1.15,
    });
  } catch (err) {
    console.warn('Error playing custom voice notification:', err);
  }
}
