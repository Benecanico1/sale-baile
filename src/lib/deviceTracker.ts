import { syncChannel } from './cloudRequests';

export interface DeviceRecord {
  id: string;
  os: 'Android' | 'iOS' | 'Windows' | 'macOS' | 'Linux' | 'Otro';
  device_type: 'mobile' | 'tablet' | 'desktop';
  browser: 'Chrome' | 'Safari' | 'Samsung Internet' | 'Edge' | 'Firefox' | 'Opera' | 'Otro';
  is_installed: boolean;
  install_status: 'installed' | 'web_browser';
  install_method?: 'pwa_prompt' | 'standalone_mode' | 'ios_homescreen' | 'web_visit';
  screen_resolution: string;
  language: string;
  user_email?: string;
  first_seen: string;
  last_active: string;
  user_agent: string;
  install_timestamp?: string;
}

export interface DeviceStats {
  totalDevices: number;
  installedDevices: number;
  webDevices: number;
  androidCount: number;
  iosCount: number;
  windowsCount: number;
  macCount: number;
  otherCount: number;
  mobileCount: number;
  desktopCount: number;
  activeLast7Days: number;
}

const RTDB_DEVICES_URL = 'https://openclaw-nyj-ia-web-ddb56-default-rtdb.firebaseio.com/sale_baile/devices.json';
const STORAGE_DEVICE_ID = 'salebaile_device_id_v1';
const STORAGE_LOCAL_DEVICES = 'salebaile_devices_cache_v1';

export function detectDeviceOS(): 'Android' | 'iOS' | 'Windows' | 'macOS' | 'Linux' | 'Otro' {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'Otro';
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'Android';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Otro';
}

export function detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

export function detectBrowser(): 'Chrome' | 'Safari' | 'Samsung Internet' | 'Edge' | 'Firefox' | 'Opera' | 'Otro' {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'Otro';
  const ua = navigator.userAgent || '';
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
  if (/Edg/i.test(ua)) return 'Edge';
  if (/OPR|Opera/i.test(ua)) return 'Opera';
  if (/Firefox|FxiOS/i.test(ua)) return 'Firefox';
  if (/Chrome|CriOS/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) return 'Safari';
  return 'Otro';
}

export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIosStandalone = (navigator as any).standalone === true;
  const isAndroidApp = typeof document !== 'undefined' && document.referrer.includes('android-app://');
  return isStandalone || isIosStandalone || isAndroidApp;
}

export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(STORAGE_DEVICE_ID);
    if (!id) {
      const randomStr = Math.random().toString(36).substring(2, 9);
      id = `dev-${Date.now().toString(36)}-${randomStr}`;
      localStorage.setItem(STORAGE_DEVICE_ID, id);
    }
    return id;
  } catch (e) {
    return `dev-${Date.now().toString(36)}`;
  }
}

export function getLocalDevices(): DeviceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_LOCAL_DEVICES);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function saveLocalDevices(devices: DeviceRecord[]): void {
  try {
    localStorage.setItem(STORAGE_LOCAL_DEVICES, JSON.stringify(devices));
  } catch (e) {}
}

export async function fetchCloudDevices(): Promise<DeviceRecord[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(RTDB_DEVICES_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        saveLocalDevices(data);
        return data;
      }
      if (data && typeof data === 'object') {
        const list = Object.values(data) as DeviceRecord[];
        saveLocalDevices(list);
        return list;
      }
    }
  } catch (err) {
    console.warn('Could not fetch cloud devices:', err);
  }
  return getLocalDevices();
}

export async function registerOrUpdateDevice(userEmail?: string, forceInstalled?: boolean): Promise<DeviceRecord | null> {
  if (typeof window === 'undefined') return null;

  try {
    const deviceId = getOrCreateDeviceId();
    const os = detectDeviceOS();
    const deviceType = detectDeviceType();
    const browser = detectBrowser();
    const isInstalled = forceInstalled || isStandaloneApp();
    const now = new Date().toISOString();
    const resolution = typeof window.screen !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'unknown';
    const lang = navigator.language || 'es';
    const ua = navigator.userAgent || '';

    const currentList = await fetchCloudDevices();
    const existingIndex = currentList.findIndex((d) => d.id === deviceId);

    let record: DeviceRecord;

    if (existingIndex >= 0) {
      const existing = currentList[existingIndex];
      record = {
        ...existing,
        os,
        device_type: deviceType,
        browser,
        is_installed: existing.is_installed || isInstalled,
        install_status: existing.is_installed || isInstalled ? 'installed' : 'web_browser',
        install_method: isInstalled ? (existing.install_method || (os === 'iOS' ? 'ios_homescreen' : 'standalone_mode')) : existing.install_method,
        install_timestamp: isInstalled ? (existing.install_timestamp || now) : existing.install_timestamp,
        screen_resolution: resolution,
        language: lang,
        user_agent: ua,
        last_active: now,
        user_email: userEmail || existing.user_email,
      };
      currentList[existingIndex] = record;
    } else {
      record = {
        id: deviceId,
        os,
        device_type: deviceType,
        browser,
        is_installed: isInstalled,
        install_status: isInstalled ? 'installed' : 'web_browser',
        install_method: isInstalled ? (os === 'iOS' ? 'ios_homescreen' : 'standalone_mode') : 'web_visit',
        install_timestamp: isInstalled ? now : undefined,
        screen_resolution: resolution,
        language: lang,
        user_email: userEmail,
        first_seen: now,
        last_active: now,
        user_agent: ua,
      };
      currentList.unshift(record);
    }

    saveLocalDevices(currentList);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    fetch(RTDB_DEVICES_URL, {
      method: 'PUT',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentList),
    }).then(() => {
      clearTimeout(timeoutId);
      if (syncChannel) {
        try {
          syncChannel.postMessage({ type: 'DEVICE_REGISTERED', deviceId, timestamp: Date.now() });
        } catch (e) {}
      }
    }).catch((e) => {
      console.warn('Could not sync device to cloud:', e);
    });

    return record;
  } catch (err) {
    console.error('Error tracking device:', err);
    return null;
  }
}

export function getDeviceStats(devices: DeviceRecord[]): DeviceStats {
  const totalDevices = devices.length;
  const installedDevices = devices.filter((d) => d.is_installed || d.install_status === 'installed').length;
  const webDevices = totalDevices - installedDevices;

  let androidCount = 0;
  let iosCount = 0;
  let windowsCount = 0;
  let macCount = 0;
  let otherCount = 0;
  let mobileCount = 0;
  let desktopCount = 0;

  const nowTime = Date.now();
  const sevenDaysAgo = nowTime - 7 * 24 * 60 * 60 * 1000;
  let activeLast7Days = 0;

  devices.forEach((d) => {
    if (d.os === 'Android') androidCount++;
    else if (d.os === 'iOS') iosCount++;
    else if (d.os === 'Windows') windowsCount++;
    else if (d.os === 'macOS') macCount++;
    else otherCount++;

    if (d.device_type === 'mobile' || d.device_type === 'tablet') mobileCount++;
    else desktopCount++;

    if (d.last_active) {
      const activeTime = new Date(d.last_active).getTime();
      if (!isNaN(activeTime) && activeTime >= sevenDaysAgo) {
        activeLast7Days++;
      }
    }
  });

  return {
    totalDevices,
    installedDevices,
    webDevices,
    androidCount,
    iosCount,
    windowsCount,
    macCount,
    otherCount,
    mobileCount,
    desktopCount,
    activeLast7Days,
  };
}
