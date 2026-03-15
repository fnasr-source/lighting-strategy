import { useCallback, useEffect, useState } from 'react';
import { deck, slides, Slide } from '../data/presentation';

const gradients = [
  'from-slate-950 via-slate-900 to-blue-950',
  'from-slate-950 via-slate-900 to-emerald-950',
  'from-slate-950 via-slate-900 to-indigo-950',
  'from-slate-950 via-slate-900 to-amber-950',
];

const frameworkLabels = ['Hero', 'Problem', 'Guide', 'Plan', 'CTA', 'Outcome'];

const HighlightedText = ({ text }: { text: string }) => {
  if (!text.includes('*')) {
    return <>{text}</>;
  }

  return (
    <>
      {text.split('*').map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="text-accent">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
};

const slideTheme = (index: number) => gradients[index % gradients.length];

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const TimelineLayout = () => (
  <div className="mt-10 flex w-full flex-col gap-10">
    <div className="grid grid-cols-2 gap-4 text-center text-sm uppercase tracking-[0.3em] text-white/55 md:grid-cols-4">
      {['Discovery', 'Trust Build', 'Conversion', 'Retention'].map((label) => (
        <div key={label} className="rounded-full border border-white/10 bg-white/5 px-4 py-3">
          {label}
        </div>
      ))}
    </div>
    <div className="relative flex items-center justify-between gap-3">
      <div className="absolute left-0 right-0 top-5 h-px bg-white/15" />
      {['Awareness', 'Interest', 'Evaluation', 'Conversation', 'Qualification', 'Close'].map((step, index) => (
        <div key={step} className="relative z-10 flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent bg-slate-950 text-sm font-semibold text-white">
            {index + 1}
          </div>
          <div className="max-w-20 text-center text-xs text-white/75 md:text-sm">{step}</div>
        </div>
      ))}
    </div>
  </div>
);

const FrameworkLayout = () => (
  <div className="mt-10 grid gap-4 md:grid-cols-3">
    {frameworkLabels.map((label, index) => (
      <div
        key={label}
        className="rounded-3xl border border-white/10 bg-black/30 p-5 backdrop-blur-sm transition duration-300 hover:border-accent/40"
      >
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
          {index + 1}
        </div>
        <h3 className="text-lg font-semibold text-white">{label}</h3>
      </div>
    ))}
  </div>
);

const SlideView = ({
  slide,
  slideIndex,
  totalSlides,
  isPreview = false,
}: {
  slide?: Slide;
  slideIndex: number;
  totalSlides: number;
  isPreview?: boolean;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!slide?.image) {
      setIsLoaded(false);
      return;
    }

    setIsLoaded(false);
    const image = new Image();
    image.src = slide.image;
    image.onload = () => setIsLoaded(true);
  }, [slide?.image]);

  if (!slide) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-white">
        End of presentation
      </div>
    );
  }

  const titleLines = slide.title.length > 0 ? slide.title : ['Untitled Slide'];
  const contentScale = isPreview ? 'scale-[0.25] origin-top-left w-[400%] h-[400%]' : 'w-full h-full';
  const showCoverLayout = slideIndex === 0;

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-slate-950 ${isPreview ? 'pointer-events-none select-none' : ''}`}
      dir="rtl"
    >
      <div className={`${contentScale} ${isPreview ? 'absolute left-0 top-0' : 'relative'}`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${slideTheme(slideIndex)}`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(204,159,83,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.14),transparent_35%)]" />
        {slide.image ? (
          <div className="absolute inset-0">
            <img
              src={slide.image}
              alt=""
              className={`h-full w-full object-cover transition-opacity duration-1000 ${isLoaded ? 'opacity-25' : 'opacity-0'}`}
            />
            <div className="absolute inset-0 bg-slate-950/70" />
          </div>
        ) : null}

        <div className="relative z-10 flex h-full flex-col px-8 py-8 md:px-14 md:py-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70">
                Strategy Preview
              </div>
              {slide.kicker ? (
                <div className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-accent">
                  {slide.kicker}
                </div>
              ) : null}
            </div>
            <div className="text-right text-xs uppercase tracking-[0.3em] text-white/55">
              Slide {slideIndex + 1} / {totalSlides}
            </div>
          </div>

          <div className={`grid flex-1 gap-8 pt-8 ${showCoverLayout ? 'items-end md:grid-cols-[1.2fr_0.8fr]' : 'items-start lg:grid-cols-[1.2fr_0.8fr]'}`}>
            <div className="flex flex-col justify-center gap-6">
              {slide.tag ? (
                <p className="text-sm uppercase tracking-[0.35em] text-accent/90">{slide.tag}</p>
              ) : null}
              <div className="space-y-3">
                {titleLines.map((line, index) => (
                  <h1
                    key={index}
                    className={
                      showCoverLayout
                        ? index === 0
                          ? 'text-4xl font-bold leading-tight text-white md:text-6xl'
                          : 'text-3xl font-bold leading-tight text-accent md:text-5xl'
                        : index === 0
                          ? 'text-3xl font-bold leading-tight text-white md:text-5xl'
                          : 'text-2xl font-semibold leading-tight text-accent md:text-4xl'
                    }
                  >
                    <HighlightedText text={line} />
                  </h1>
                ))}
              </div>

              {slide.subtitle ? <p className="max-w-3xl text-lg text-white/70 md:text-xl">{slide.subtitle}</p> : null}
              {slide.summary ? (
                <p className="max-w-3xl text-lg leading-8 text-white/85 md:text-2xl md:leading-10">{slide.summary}</p>
              ) : null}

              {slide.layout === 'timeline' ? <TimelineLayout /> : null}
              {slide.layout === 'story-framework' ? <FrameworkLayout /> : null}

              {slide.bullets && slide.bullets.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {slide.bullets.map((bullet) => (
                    <div
                      key={bullet}
                      className="rounded-3xl border border-white/10 bg-black/25 px-5 py-4 text-base leading-7 text-white/85 backdrop-blur-sm md:text-lg"
                    >
                      {bullet}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-4">
              {showCoverLayout ? (
                <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Deck</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">{deck.title}</h2>
                  {deck.subtitle ? <p className="mt-3 text-base leading-7 text-white/70">{deck.subtitle}</p> : null}
                  {slide.cta ? <p className="mt-6 text-sm uppercase tracking-[0.25em] text-accent">{slide.cta}</p> : null}
                </div>
              ) : null}

              {slide.evidence && slide.evidence.length > 0 ? (
                <div className="grid gap-4">
                  {slide.evidence.map((item) => (
                    <div
                      key={`${item.heading}-${item.detail}`}
                      className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
                    >
                      <p className="text-xs uppercase tracking-[0.3em] text-accent/90">{item.heading}</p>
                      <p className="mt-3 text-sm leading-7 text-white/80 md:text-base">{item.detail}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {slide.sources && slide.sources.length > 0 ? (
                <div className="rounded-[2rem] border border-white/10 bg-black/25 p-5 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Sources</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {slide.sources.map((source) => (
                      <span key={source} className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/70">
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {slide.cta && !showCoverLayout ? (
                <div className="rounded-[2rem] border border-accent/20 bg-accent/10 p-5 text-sm uppercase tracking-[0.25em] text-accent">
                  {slide.cta}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-end justify-between gap-6 pt-6">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/45">{deck.presenter || 'Admireworks'}</p>
              <p className="mt-2 text-sm text-white/60">{deck.clientName || deck.title}</p>
            </div>
            <div className="flex items-center gap-4">
              {deck.lastUpdated ? <p className="text-xs uppercase tracking-[0.3em] text-white/45">{deck.lastUpdated}</p> : null}
              <img src="./admireworks-white.png" alt="Admireworks" className="h-10 opacity-85 md:h-14" />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 h-1 w-full bg-white/10">
            <div
              className="h-full bg-accent transition-all duration-500"
              style={{ width: `${((slideIndex + 1) / totalSlides) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const WebinarPresentation = () => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [presenterMode, setPresenterMode] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const currentSlide = slides[currentSlideIndex];
  const nextSlide = slides[currentSlideIndex + 1];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedTime((previous) => previous + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const broadcastSlideChange = useCallback((index: number) => {
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }

    const channel = new BroadcastChannel('admireworks_presentation_sync');
    channel.postMessage({ type: 'CHANGE_SLIDE', index });
    channel.close();
  }, []);

  const goToNextSlide = useCallback(() => {
    setCurrentSlideIndex((previous) => {
      const nextIndex = previous < slides.length - 1 ? previous + 1 : previous;
      if (nextIndex !== previous) {
        broadcastSlideChange(nextIndex);
      }
      return nextIndex;
    });
  }, [broadcastSlideChange]);

  const goToPrevSlide = useCallback(() => {
    setCurrentSlideIndex((previous) => {
      const nextIndex = previous > 0 ? previous - 1 : previous;
      if (nextIndex !== previous) {
        broadcastSlideChange(nextIndex);
      }
      return nextIndex;
    });
  }, [broadcastSlideChange]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'Enter') {
        goToNextSlide();
      } else if (event.key === 'ArrowLeft') {
        goToPrevSlide();
      } else if ((event.code === 'KeyP' || event.key.toLowerCase() === 'p') && !event.ctrlKey && !event.metaKey) {
        setPresenterMode((previous) => !previous);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextSlide, goToPrevSlide]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }

    const channel = new BroadcastChannel('admireworks_presentation_sync');
    channel.onmessage = (event) => {
      if (event.data?.type === 'CHANGE_SLIDE') {
        setCurrentSlideIndex(event.data.index);
      }
    };

    return () => channel.close();
  }, []);

  useEffect(() => {
    document.title = deck.title;

    const updateMeta = (property: string, content: string) => {
      let element = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(property.startsWith('og:') ? 'property' : 'name', property);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    updateMeta('description', deck.subtitle || deck.title);
    updateMeta('og:title', deck.title);
    updateMeta('og:description', deck.subtitle || deck.title);
    updateMeta('og:type', 'website');
  }, []);

  useEffect(() => {
    [currentSlideIndex + 1, currentSlideIndex + 2].forEach((index) => {
      const image = slides[index]?.image;
      if (image) {
        const preload = new Image();
        preload.src = image;
      }
    });
  }, [currentSlideIndex]);

  if (presenterMode) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-white">
        <div className="flex h-14 items-center justify-between border-b border-white/10 bg-black/40 px-4">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-accent">Presenter View</span>
            <span className="text-sm text-white/55">{formatTime(elapsedTime)}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span>
              Slide {currentSlideIndex + 1} / {slides.length}
            </span>
            <button
              onClick={() => setPresenterMode(false)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 transition hover:bg-white/10"
            >
              Exit
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 flex-col border-r border-white/10 p-4">
            <div className="mb-2 text-xs uppercase tracking-[0.3em] text-white/45">Current Slide</div>
            <div className="relative flex-1 overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
              <SlideView slide={currentSlide} slideIndex={currentSlideIndex} totalSlides={slides.length} />
              <div className="absolute inset-0 flex opacity-0 transition hover:opacity-100">
                <div className="flex w-1/2 cursor-pointer items-center justify-start pl-4" onClick={goToPrevSlide}>
                  <div className="rounded-full bg-black/50 p-2 text-white">←</div>
                </div>
                <div className="flex w-1/2 cursor-pointer items-center justify-end pr-4" onClick={goToNextSlide}>
                  <div className="rounded-full bg-black/50 p-2 text-white">→</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-[34%] flex-col gap-4 bg-slate-950 p-4">
            <div className="flex h-1/3 flex-col">
              <div className="mb-2 text-xs uppercase tracking-[0.3em] text-white/45">Next Slide</div>
              <div className="flex-1 overflow-hidden rounded-3xl border border-white/10 bg-black">
                <SlideView slide={nextSlide} slideIndex={currentSlideIndex + 1} totalSlides={slides.length} isPreview />
              </div>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="mb-2 text-xs uppercase tracking-[0.3em] text-white/45">Speaker Notes</div>
              <div className="flex-1 overflow-y-auto rounded-3xl border border-white/10 bg-white/5 p-6 text-lg leading-8 text-white/90">
                {currentSlide?.speakerNotes}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <SlideView slide={currentSlide} slideIndex={currentSlideIndex} totalSlides={slides.length} />

      <div className="absolute inset-0 z-50 flex">
        <div className="h-full w-1/4 cursor-pointer" onClick={goToPrevSlide} title="Previous slide" />
        <div className="h-full w-1/2" />
        <div className="h-full w-1/4 cursor-pointer" onClick={goToNextSlide} title="Next slide" />
      </div>

      <div className="absolute right-8 top-8 z-50 flex gap-2 opacity-0 transition-opacity duration-300 hover:opacity-100">
        <button
          onClick={() => setPresenterMode(true)}
          className="rounded-full bg-black/50 p-3 text-white transition hover:bg-black/80"
          title="Presenter mode (P)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default WebinarPresentation;
