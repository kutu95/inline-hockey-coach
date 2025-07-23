// Push Notification Utilities
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Register service worker
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  } else {
    throw new Error('Push notifications are not supported');
  }
}

// Request notification permission
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications');
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notification permission denied');
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// Subscribe to push notifications
export async function subscribeToPushNotifications(userId) {
  try {
    // Register service worker
    const registration = await registerServiceWorker();
    
    // Request permission
    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) {
      throw new Error('Notification permission not granted');
    }

    // Get push subscription
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    // Save subscription to database
    await saveSubscriptionToDatabase(subscription, userId);

    console.log('Push notification subscription successful:', subscription);
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    throw error;
  }
}

// Save subscription to database
async function saveSubscriptionToDatabase(subscription, userId) {
  const { supabase } = await import('./supabase');
  
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      subscription: subscription,
      created_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Error saving subscription to database:', error);
    throw error;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(userId) {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
    }

    // Remove from database
    await removeSubscriptionFromDatabase(userId);
    
    console.log('Unsubscribed from push notifications');
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    throw error;
  }
}

// Remove subscription from database
async function removeSubscriptionFromDatabase(userId) {
  const { supabase } = await import('./supabase');
  
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error removing subscription from database:', error);
    throw error;
  }
}

// Check if push notifications are supported
export function isPushNotificationSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Get current subscription status
export async function getSubscriptionStatus() {
  if (!isPushNotificationSupported()) {
    return { supported: false };
  }

  const permission = Notification.permission;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  return {
    supported: true,
    permission,
    subscribed: !!subscription
  };
} 