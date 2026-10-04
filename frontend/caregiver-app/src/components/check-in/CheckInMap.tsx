import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import type { Coordinates } from '@/services/checkIn';

type CheckInMapProps = { center: Coordinates | null; isOnline: boolean; isCurrentLocation: boolean };

export default function CheckInMap({ center, isOnline, isCurrentLocation }: CheckInMapProps) {
	const [mapState, setMapState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
	const source = center ? `https://www.openstreetmap.org/export/embed.html?bbox=${Math.max(-180, center.longitude - 0.008)},${Math.max(-90, center.latitude - 0.005)},${Math.min(180, center.longitude + 0.008)},${Math.min(90, center.latitude + 0.005)}&layer=mapnik` : '';

	useEffect(() => {
		setMapState('loading');
		const timeout = setTimeout(() => setMapState(state => state === 'ready' ? state : 'unavailable'), 15000);
		return () => clearTimeout(timeout);
	}, [source]);

	return (
		<div className="absolute inset-0 overflow-hidden bg-[#e4ebe6]">
			{source && isOnline && <iframe key={source} title={isCurrentLocation ? 'Map of your current location' : 'Map of the client residence'} src={source} referrerPolicy="no-referrer" tabIndex={-1} onLoad={() => setMapState('ready')} onError={() => setMapState('unavailable')} className="pointer-events-none absolute inset-0 h-full w-full border-0 opacity-85 grayscale-60 saturate-50" />}
			{(!source || !isOnline || mapState !== 'ready') && <div className="absolute inset-x-5 bottom-14 text-center text-sm leading-6 text-[#52675f]">{!isOnline ? 'Map unavailable offline' : !source ? 'Your location will appear here' : mapState === 'unavailable' ? 'The map could not load. Your GPS location is still available.' : 'Loading map...'}</div>}
			{center && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" role="img" aria-label={isCurrentLocation ? 'Your current location' : 'Client residence location'}>
				<span aria-hidden="true" className="check-in-pin-pulse absolute -inset-3 rounded-full border border-[#58a9a2]/30 bg-[#58a9a2]/20" />
				<span className="relative flex size-14 items-center justify-center rounded-full border-4 border-white/80 bg-[#58a9a2] text-white shadow-[0_4px_16px_rgba(38,103,91,0.2)]"><MapPin aria-hidden="true" className="size-6" strokeWidth={1.75} /></span>
			</div>}
			{source && isOnline && <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="absolute right-2 bottom-2 rounded bg-white/90 px-2 py-1 text-[10px] text-[#52675f]">OpenStreetMap contributors</a>}
			<style>{`
				@keyframes check-in-pin-pulse { 0%, 100% { transform: scale(1); opacity: .6; } 50% { transform: scale(1.25); opacity: .25; } }
				.check-in-pin-pulse { animation: check-in-pin-pulse 3s ease-in-out infinite; }
				@media (prefers-reduced-motion: reduce) { .check-in-pin-pulse { animation: none; } }
			`}</style>
		</div>
	);
}