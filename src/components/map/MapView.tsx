import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { EventItem } from '../../types';
import { formatEventSchedule } from '../../lib/dateUtils';
import { getGenreRadarBadge } from '../../lib/danceCategories';
import { MapPin, Calendar } from 'lucide-react';

interface MapViewProps {
  events: EventItem[];
  onSelectEvent?: (event: EventItem) => void;
  isMinimized?: boolean;
}

const createRadarMarkerIcon = (evt: EventItem) => {
  const badge = getGenreRadarBadge(evt.genre_family || 'salsa-y-bachata');
  const color = badge.pinColor || '#ff2d55';
  const icon = badge.icon || '💃';
  const venueName = evt.venue_name || evt.city || 'Pista de Baile';
  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);cursor:pointer;pointer-events:auto;user-select:none;">
      <div style="background:#080c14;border:1.5px solid ${color};border-radius:10px;padding:3px 8px;box-shadow:0 4px 16px rgba(0,0,0,0.95),0 0 14px ${color}66;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-bottom:3px;min-width:68px;max-width:140px;text-align:center;backdrop-filter:blur(8px);">
        <div style="color:${color};font-weight:900;font-size:10px;letter-spacing:0.5px;text-transform:uppercase;white-space:nowrap;display:flex;align-items:center;gap:3px;line-height:1.2;">
          <span style="font-size:10px;">${icon}</span><span>${badge.genreUpper || 'BAILE'}</span>
        </div>
        <div style="color:#f8fafc;font-weight:800;font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px;line-height:1.2;margin-top:1px;">${venueName}</div>
      </div>
      <div style="background-color:${color};width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2.5px solid white;box-shadow:0 4px 18px rgba(0,0,0,0.8),0 0 18px ${color};">
        <span style="transform:rotate(45deg);color:white;font-weight:900;font-size:13px;">${icon}</span>
      </div>
      <div style="width:3px;height:32px;background:linear-gradient(to bottom, ${color}, rgba(255,255,255,0.9), transparent);box-shadow:0 0 12px ${color},0 0 24px ${color};border-radius:2px;margin-top:-2px;pointer-events:none;"></div>
    </div>`;
  return L.divIcon({ className: 'radar-map-pin', html, iconSize: [0, 0], iconAnchor: [0, 0], popupAnchor: [0, -78] });
};

export const MapView: React.FC<MapViewProps> = ({ events, onSelectEvent, isMinimized }) => {
  const [mapCenter] = useState<{ lat: number; lng: number }>({ lat: -34.6037, lng: -58.3816 });
  const visibleEvents = useMemo(() => events.filter((evt) => evt.status === 'publicado' && !evt.is_cancelled && evt.flyer_url && evt.latitude && evt.longitude), [events]);
  const MapController: React.FC<{ center: [number, number] }> = ({ center }) => { const map = useMap(); React.useEffect(() => { map.setView(center, 13); }, [center, map]); return null; };
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-[#07070a]">
      <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={13} scrollWheelZoom={true} style={{ height: isMinimized ? 100 : 420, width: '100%', background: '#07070a' }}>
        <TileLayer url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${import.meta.env.VITE_CARTO_API_KEY || ''}`} subdomains="abcd" maxZoom={20} />
        <MapController center={[mapCenter.lat, mapCenter.lng]} />
        {visibleEvents.map((evt) => (
          <Marker key={evt.id} position={[evt.latitude, evt.longitude]} icon={createRadarMarkerIcon(evt)} eventHandlers={{ click: () => onSelectEvent?.(evt) }}>
            <Popup closeButton={false} minWidth={260} maxWidth={280}>
              <div className="bg-oled-950 text-white rounded-2xl overflow-hidden shadow-2xl border border-white/10 p-0">
                <div className="px-3 pt-2.5 pb-1.5 border-b border-white/10">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-dance-coral"><span>{evt.category || 'Evento'}</span></div>
                  <h4 className="font-black text-sm text-white truncate">{evt.title}</h4>
                  <div className="text-[11px] text-slate-400 truncate flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-500"/> {evt.venue_name || evt.city}</div>
                </div>
                <div className="relative aspect-[4/3] w-full bg-oled-900 overflow-hidden">
                  <img src={evt.flyer_url} alt={evt.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-3 space-y-2">
                  <div className="text-[11px] text-slate-300 flex items-center gap-1"><Calendar className="w-3 h-3 text-dance-coral"/> {formatEventSchedule(evt.start_time, evt.end_time).dateLabel}</div>
                  <button onClick={() => onSelectEvent?.(evt)} className="w-full py-2 bg-gradient-to-r from-dance-crimson to-dance-coral text-white text-xs font-black rounded-xl">Ver detalles</button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="bg-zinc-950 px-4 py-3 text-[11px] text-zinc-400 border-t border-zinc-800 flex items-center justify-between">
        <span>Mapa oscuro • {visibleEvents.length} eventos</span>
        <span>CartoDB Dark</span>
      </div>
    </div>
  );
};
