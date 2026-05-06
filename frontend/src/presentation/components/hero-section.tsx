import { Mail, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@application/i18n/i18n-context';

export const HeroSection = () => {
  const { t } = useTranslation();

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
      <div>
        <p className="mb-4 text-sm uppercase tracking-[0.2em] text-slate-300">
          {t('landing.hero.tag')}
        </p>
        <h1 className="font-serif text-4xl leading-tight text-gray-100 md:text-5xl">
          {t('landing.hero.title')}
        </h1>
        <p className="mt-6 max-w-xl text-base text-slate-300 md:text-lg">
          {t('landing.hero.subtitle')}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/design"
            className="inline-flex items-center gap-2 rounded-md bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-200"
          >
            <Sparkles className="h-4 w-4" />
            {t('landing.hero.designerCta')}
          </Link>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 rounded-md border border-slate-500 bg-slate-800 px-5 py-3 text-sm font-medium text-gray-100 transition hover:bg-slate-700"
          >
            <Mail className="h-4 w-4" />
            {t('landing.hero.contactCta')}
          </a>
        </div>
      </div>

      <div className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/70 p-2 shadow-glow lg:ml-8 lg:w-[560px] lg:justify-self-end lg:p-3">
        <img
          src="/images/main.png"
          alt="Monument craftsmanship preview"
          className="h-[380px] w-full rounded-xl object-contain object-center"
        />
      </div>
    </section>
  );
};
