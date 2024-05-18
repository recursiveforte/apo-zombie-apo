import {atom} from 'nanostores'
import {persistentAtom} from "@nanostores/persistent";

export const userId = persistentAtom<string>("userId", "")