import {atom} from 'nanostores'
import {persistentAtom} from "@nanostores/persistent";

export const userId = persistentAtom<string>("userId", "")
export const beaconId = persistentAtom<string>("beaconId", "")
export const initialRefresh = persistentAtom<string>("initialRefresh", "false")