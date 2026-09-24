import { EN_APP } from './app';
import { EN_COMPONENTS } from './components';
import { EN_CONTENT } from './content';
import { EN_LIB } from './lib';

/** Every English string, keyed by its Persian source text. */
export const EN: Record<string, string> = { ...EN_CONTENT, ...EN_LIB, ...EN_COMPONENTS, ...EN_APP };
