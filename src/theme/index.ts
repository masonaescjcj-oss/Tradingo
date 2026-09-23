export const colors = {
  bg: '#0E1320',
  surface: '#171F31',
  surfaceDeep: '#131A2B',
  raised: '#1F2940',
  raisedEdge: '#151C2E',
  line: '#2A3550',
  lineSoft: '#1C2438',
  text: '#F1F4F9',
  text2: '#AEB8CC',
  text3: '#8792AB',
  muted: '#7D89A6',
  faint: '#56627D',

  bull: '#2BD47D',
  bullEdge: '#179457',
  bullInk: '#04301A',
  bullText: '#5BE39A',
  bullSoft: 'rgba(43,212,125,0.12)',
  bullSheet: '#0F2A1E',
  bullSheetLine: '#1D5A3C',

  bear: '#FF5A6E',
  bearEdge: '#C7384C',
  bearInk: '#3D0711',
  bearText: '#FF8A99',
  bearSoft: 'rgba(255,90,110,0.12)',
  bearSheet: '#2F1218',
  bearSheetLine: '#6A2230',

  gold: '#FFC53D',
  goldEdge: '#C98F0A',
  goldInk: '#3B2A00',
  goldSoft: 'rgba(255,197,61,0.14)',
  goldCard: '#1F1A10',
  goldCardLine: '#5A4418',

  flame: '#FF9433',
  sky: '#5AB0FF',
  skyText: '#8CC8FF',
  skyInk: '#07233F',
  skySoft: 'rgba(90,176,255,0.10)',
} as const;

export const fonts = {
  regular: 'Vazirmatn_400Regular',
  medium: 'Vazirmatn_500Medium',
  bold: 'Vazirmatn_700Bold',
  extra: 'Vazirmatn_800ExtraBold',
  black: 'Vazirmatn_900Black',
  display: 'Lalezar_400Regular',
  mono: 'JetBrainsMono_700Bold',
  monoHeavy: 'JetBrainsMono_800ExtraBold',
} as const;

/** Width of the phone-like content column on large (web) screens. */
export const MAX_WIDTH = 520;
