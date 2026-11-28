/**
 * US State Coordinates and Metadata
 * Contains centroids and full names for all 50 states + territories
 */

export interface StateCoordinates {
  latitude: number;
  longitude: number;
}

export interface StateMetadata {
  name: string;
  coordinates: StateCoordinates;
}

/**
 * US State Centroids (approximate geographic centers)
 * Source: USGS Geographic Names Information System
 */
export const STATE_COORDINATES: Record<string, StateCoordinates> = {
  // Continental US States
  AL: { latitude: 32.806671, longitude: -86.791130 },
  AK: { latitude: 61.370716, longitude: -152.404419 },
  AZ: { latitude: 33.729759, longitude: -111.431221 },
  AR: { latitude: 34.969704, longitude: -92.373123 },
  CA: { latitude: 36.116203, longitude: -119.681564 },
  CO: { latitude: 39.059811, longitude: -105.311104 },
  CT: { latitude: 41.597782, longitude: -72.755371 },
  DE: { latitude: 39.318523, longitude: -75.507141 },
  FL: { latitude: 27.766279, longitude: -81.686783 },
  GA: { latitude: 33.040619, longitude: -83.643074 },
  HI: { latitude: 21.094318, longitude: -157.498337 },
  ID: { latitude: 44.240459, longitude: -114.478828 },
  IL: { latitude: 40.349457, longitude: -88.986137 },
  IN: { latitude: 39.849426, longitude: -86.258278 },
  IA: { latitude: 42.011539, longitude: -93.210526 },
  KS: { latitude: 38.526600, longitude: -96.726486 },
  KY: { latitude: 37.668140, longitude: -84.670067 },
  LA: { latitude: 31.169546, longitude: -91.867805 },
  ME: { latitude: 44.693947, longitude: -69.381927 },
  MD: { latitude: 39.063946, longitude: -76.802101 },
  MA: { latitude: 42.230171, longitude: -71.530106 },
  MI: { latitude: 43.326618, longitude: -84.536095 },
  MN: { latitude: 45.694454, longitude: -93.900192 },
  MS: { latitude: 32.741646, longitude: -89.678696 },
  MO: { latitude: 38.456085, longitude: -92.288368 },
  MT: { latitude: 46.921925, longitude: -110.454353 },
  NE: { latitude: 41.125370, longitude: -98.268082 },
  NV: { latitude: 38.313515, longitude: -117.055374 },
  NH: { latitude: 43.452492, longitude: -71.563896 },
  NJ: { latitude: 40.298904, longitude: -74.521011 },
  NM: { latitude: 34.840515, longitude: -106.248482 },
  NY: { latitude: 42.165726, longitude: -74.948051 },
  NC: { latitude: 35.630066, longitude: -79.806419 },
  ND: { latitude: 47.528912, longitude: -99.784012 },
  OH: { latitude: 40.388783, longitude: -82.764915 },
  OK: { latitude: 35.565342, longitude: -96.928917 },
  OR: { latitude: 44.572021, longitude: -122.070938 },
  PA: { latitude: 40.590752, longitude: -77.209755 },
  RI: { latitude: 41.680893, longitude: -71.511780 },
  SC: { latitude: 33.856892, longitude: -80.945007 },
  SD: { latitude: 44.299782, longitude: -99.438828 },
  TN: { latitude: 35.747845, longitude: -86.692345 },
  TX: { latitude: 31.054487, longitude: -97.563461 },
  UT: { latitude: 40.150032, longitude: -111.862434 },
  VT: { latitude: 44.045876, longitude: -72.710686 },
  VA: { latitude: 37.769337, longitude: -78.169968 },
  WA: { latitude: 47.400902, longitude: -121.490494 },
  WV: { latitude: 38.491226, longitude: -80.954453 },
  WI: { latitude: 44.268543, longitude: -89.616508 },
  WY: { latitude: 42.755966, longitude: -107.302490 },

  // Territories
  AS: { latitude: -14.270972, longitude: -170.132217 },  // American Samoa
  DC: { latitude: 38.897438, longitude: -77.026817 },    // District of Columbia
  GU: { latitude: 13.444304, longitude: 144.793731 },    // Guam
  MP: { latitude: 15.097500, longitude: 145.673600 },    // Northern Mariana Islands
  PR: { latitude: 18.220833, longitude: -66.590149 },    // Puerto Rico
  VI: { latitude: 18.335765, longitude: -64.896335 },    // US Virgin Islands
};

/**
 * US State Full Names
 */
export const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',

  // Territories
  AS: 'American Samoa',
  DC: 'District of Columbia',
  GU: 'Guam',
  MP: 'Northern Mariana Islands',
  PR: 'Puerto Rico',
  VI: 'US Virgin Islands',
};

/**
 * Get coordinates for a state by abbreviation
 * Returns US geographic center as fallback for unknown states
 */
export function getStateCoordinates(stateAbbr: string): StateCoordinates {
  return STATE_COORDINATES[stateAbbr] || { latitude: 39.8283, longitude: -98.5795 }; // US center
}

/**
 * Get full state name from abbreviation
 * Returns abbreviation as fallback for unknown states
 */
export function getStateName(stateAbbr: string): string {
  return STATE_NAMES[stateAbbr] || stateAbbr;
}

/**
 * Get complete state metadata (name + coordinates)
 */
export function getStateMetadata(stateAbbr: string): StateMetadata {
  return {
    name: getStateName(stateAbbr),
    coordinates: getStateCoordinates(stateAbbr),
  };
}
