import L001 from './cards/L001.json';
import L002 from './cards/L002.json';
import L003 from './cards/L003.json';
import L005 from './cards/L005.json';
import L013 from './cards/L013.json';
import T001 from './cards/T001.json';
import T003 from './cards/T003.json';
import T004 from './cards/T004.json';
import T006 from './cards/T006.json';
import T009 from './cards/T009.json';
import P001 from './cards/P001.json';
import P002 from './cards/P002.json';
import P003 from './cards/P003.json';
import P004 from './cards/P004.json';
import P011 from './cards/P011.json';
import I001 from './cards/I001.json';
import I003 from './cards/I003.json';
import I004 from './cards/I004.json';
import I005 from './cards/I005.json';
import C001 from './cards/C001.json';
import C002 from './cards/C002.json';
import C008 from './cards/C008.json';
import D001 from './cards/D001.json';
import D002 from './cards/D002.json';
import D004 from './cards/D004.json';
import W001 from './cards/W001.json';
import W002 from './cards/W002.json';
import pack from './card-packs/poster-core-prototype.json';
import compatibility from './compatibility/poster-core-prototype.json';

export const prototypeLibraryData: unknown = {
  packs: [{ ...pack, cards: [
    L001, L002, L003, L005, L013,
    T001, T003, T004, T006, T009,
    P001, P002, P003, P004, P011,
    I001, I003, I004, I005,
    C001, C002, C008,
    D001, D002, D004,
    W001, W002,
  ] }],
  compatibility,
};
