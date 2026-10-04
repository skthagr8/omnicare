import { Activity, Footprints, Thermometer } from 'lucide-react';
import type { InstrumentId } from '@/services/pointOfCare';

export const instruments = [
	{ id: 'tug' as InstrumentId, name: 'TUG', fullName: 'Timed Up and Go', description: 'Record mobility and balance observations from the timed assessment.', icon: Footprints },
	{ id: 'cmai' as InstrumentId, name: 'CMAI', fullName: 'Cohen-Mansfield Agitation Inventory', description: 'Record the assessed frequency of agitation-related behaviors.', icon: Activity },
	{ id: 'braden' as InstrumentId, name: 'Braden', fullName: 'Braden Scale', description: 'Record the pressure-injury risk assessment and skin observations.', icon: Thermometer },
];