import presentationData from '../../content/slides.json';

export interface DeckMeta {
  title: string;
  subtitle?: string;
  clientName?: string;
  presenter?: string;
  lastUpdated?: string;
  structureVersion: string;
}

export interface EvidenceItem {
  heading: string;
  detail: string;
}

export interface Slide {
  id: number;
  section: string;
  kicker?: string;
  title: string[];
  tag?: string;
  subtitle?: string;
  summary?: string;
  bullets?: string[];
  evidence?: EvidenceItem[];
  sources?: string[];
  speakerNotes: string;
  cta?: string;
  image?: string;
  imagePrompt?: string;
  visualDirection?: string;
  imageStatus?: string;
  layout?: 'timeline' | 'story-framework';
}

interface PresentationFile {
  deck: DeckMeta;
  slides: Array<
    Omit<Slide, 'title' | 'speakerNotes'> & {
      title: string | string[];
      speakerNotes?: string;
    }
  >;
}

function normalizeTitle(title: string | string[]): string[] {
  if (Array.isArray(title)) {
    return title.filter(Boolean);
  }

  return title
    .split(/\s*[|]\s*|\s+-\s+(?=[^-]+$)/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

const rawPresentation = presentationData as PresentationFile;

export const deck = rawPresentation.deck;

export const slides: Slide[] = rawPresentation.slides.map((slide, index) => ({
  ...slide,
  id: slide.id ?? index + 1,
  title: normalizeTitle(slide.title),
  speakerNotes: slide.speakerNotes ?? slide.summary ?? 'No speaker notes added yet.',
}));
