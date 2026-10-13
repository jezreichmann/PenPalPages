import { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, Check, ChevronDown, Heart, Mail, Menu, Play, Sparkles, X } from 'lucide-react';

const API_URL = (import.meta.env.VITE_WEBSITE_API_URL as string | undefined) || 'https://penpalpages-licences.fly.dev';
const BASE = import.meta.env.BASE_URL;
const SUPPORT_EMAIL = 'support@darkweatherstudios.com';
const INITIAL_CONFIG: SiteConfig = { productName: 'PenPal Pages', pricePence: 4999, currency: 'GBP', promotion: null, checkoutEnabled: false };

type Promotion = { code: string; discountPercent: number; headline: string };
type SiteConfig = { productName: string; pricePence: number; currency: string; promotion: Promotion | null; checkoutEnabled: boolean };
type TourStep = { eyebrow: string; title: string; copy: string; art: string; panel: string; item: string };

const TOUR_STEPS: TourStep[] = [
  { eyebrow: '01 · MAKE IT YOURS', title: 'Choose a paper mood.', copy: 'Start with a colour or a softly patterned background. Add a frame when the page feels right.', art: 'assets/backgrounds/petal.svg', panel: 'BACKGROUND', item: 'Petal notes' },
  { eyebrow: '02 · ADD A LITTLE DETAIL', title: 'Bring your note to life.', copy: 'Drop in a sticker, resize it, turn it, and adjust the colours on customisable designs.', art: 'assets/stickers/blue-flower.svg', panel: 'STICKERS', item: 'Blue flower' },
  { eyebrow: '03 · SEND SOMETHING REAL', title: 'Print, post, or keep a copy.', copy: 'Design an envelope and address labels, then print or export every page as a crisp PDF.', art: 'assets/borders/wildflower.svg', panel: 'BORDERS', item: 'Wildflower' },
];

const price = (pence: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);

function App() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [configError, setConfigError] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [purchaseEmail, setPurchaseEmail] = useState('');
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState('');
  const [purchaseError, setPurchaseError] = useState('');
  const [contactBusy, setContactBusy] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contactError, setContactError] = useState('');
  const [tourStep, setTourStep] = useState(0);
  const [tourPlaying, setTourPlaying] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`${API_URL}/website/config`)
      .then(async (response) => {
        if (!response.ok) throw new Error('The live shop settings could not be loaded.');
        return response.json() as Promise<SiteConfig>;
      })
      .then((next) => { if (active) { setConfig(next); setConfigError(''); } })
      .catch(() => { if (active) { setConfig(INITIAL_CONFIG); setConfigError('Live pricing is temporarily unavailable. Displayed price is a preview.'); } });
    const query = new URLSearchParams(window.location.search);
    if (query.get('purchase') === 'success') setPurchaseMessage('Thanks. Your payment is being confirmed; Dark Weather Studios will follow up manually with your app access.');
    if (query.get('purchase') === 'cancel') setPurchaseMessage('Checkout was cancelled. No payment was taken.');
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!tourPlaying) return;
    const timer = window.setInterval(() => setTourStep((step) => (step + 1) % TOUR_STEPS.length), 5200);
    return () => window.clearInterval(timer);
  }, [tourPlaying]);

  const current = config ?? INITIAL_CONFIG;
  const promotion = current.promotion;
  const discountedPence = promoApplied && promotion ? current.pricePence - Math.floor(current.pricePence * promotion.discountPercent / 100) : current.pricePence;

  const applyPromo = () => {
    if (!promotion || promoCode.trim().toUpperCase() !== promotion.code.toUpperCase()) {
      setPromoApplied(false);
      setPurchaseError('That offer code is not active. Check the code and try again.');
      return;
    }
    setPurchaseError('');
    setPromoApplied(true);
  };

  const startCheckout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPurchaseError(''); setPurchaseMessage('');
    if (!config?.checkoutEnabled) {
      setPurchaseError('Secure checkout is not configured yet. Email support@darkweatherstudios.com for purchase details.');
      return;
    }
    setPurchaseBusy(true);
    try {
      const response = await fetch(`${API_URL}/website/checkout`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: purchaseEmail, promotionCode: promoApplied ? promoCode.trim().toUpperCase() : '' }),
      });
      const result = await response.json() as { checkoutUrl?: string; message?: string };
      if (!response.ok || !result.checkoutUrl) throw new Error(result.message || 'Secure checkout could not be started.');
      window.location.assign(result.checkoutUrl);
    } catch (failure) {
      setPurchaseError(failure instanceof Error ? failure.message : 'Checkout could not be reached. Try again or email support.');
    } finally { setPurchaseBusy(false); }
  };

  const sendContact = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setContactBusy(true); setContactError(''); setContactMessage('');
    try {
      const response = await fetch(`${API_URL}/website/contact`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: data.get('name'), email: data.get('email'), subject: data.get('subject'), message: data.get('message') }),
      });
      const result = await response.json() as { message?: string; emailNotified?: boolean };
      if (!response.ok) throw new Error(result.message || 'Your message could not be sent.');
      form.reset();
      setContactMessage(result.emailNotified
        ? 'Your note was sent to support@darkweatherstudios.com. We’ll be in touch.'
        : 'Your note is saved for Dark Weather Studios. For a direct reply, email support@darkweatherstudios.com.');
    } catch (failure) {
      setContactError(failure instanceof Error ? failure.message : `Please email ${SUPPORT_EMAIL} directly.`);
    } finally { setContactBusy(false); }
  };

  return <>
    {promotion && <a className="offer-ribbon" href="#get-app"><Sparkles size={14} />{promotion.headline || `A little extra: ${promotion.discountPercent}% off with ${promotion.code}`} <span>Use {promotion.code}</span><ArrowRight size={14} /></a>}
    <header className="site-header">
      <a className="brand" href="#top" aria-label="PenPal Pages home"><img src={`${BASE}assets/penpal-splash-icon.svg`} alt="" /><span>PenPal <b>Pages</b></span><small>by Dark Weather Studios</small></a>
      <button className="mobile-menu" type="button" aria-label={mobileMenu ? 'Close menu' : 'Open menu'} onClick={() => setMobileMenu((open) => !open)}>{mobileMenu ? <X /> : <Menu />}</button>
      <nav className={mobileMenu ? 'main-nav open' : 'main-nav'} aria-label="Main navigation">
        <a href="#features" onClick={() => setMobileMenu(false)}>The studio</a>
        <a href="#artwork" onClick={() => setMobileMenu(false)}>Fresh artwork</a>
        <a href="#demo" onClick={() => setMobileMenu(false)}>Take a tour</a>
        <a href="#about" onClick={() => setMobileMenu(false)}>About</a>
      </nav>
      <a className="header-buy" href="#get-app">Get PenPal Pages <ArrowRight size={15} /></a>
    </header>

    <main id="top">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-surface" aria-hidden="true"><div className="hero-flower flower-one">✳</div><div className="hero-flower flower-two">✿</div><span className="hero-note">A note made by you<br />means more.</span></div>
        <div className="hero-copy">
          <span className="eyebrow"><span /> WINDOWS STATIONERY STUDIO</span>
          <h1 id="hero-title">PenPal<br /><em>Pages.</em></h1>
          <p>Make a little stationery for someone you miss. Design a letter that feels like yours, then print it or send it as a PDF.</p>
          <div className="hero-actions"><a className="button button-coral" href="#get-app">Make your first page <ArrowRight size={16} /></a><a className="text-link" href="#demo"><Play size={14} /> See how it works</a></div>
          <div className="hero-footnote"><span><Check size={13} /> Made for Windows</span><span><Check size={13} /> Print-ready pages</span><span><Check size={13} /> Your files stay yours</span></div>
        </div>
        <div className="hero-workbench" aria-label="PenPal Pages editor example">
          <EditorPreview compact />
          <div className="hero-caption"><span>01 / A LETTER IN PROGRESS</span><span>Made in PenPal Pages</span></div>
        </div>
        <a className="scroll-cue" href="#features" aria-label="Scroll to features"><ArrowDown size={16} /></a>
      </section>

      <section id="features" className="manifesto section-pad">
        <div className="section-kicker">THE LITTLE THINGS, THOUGHT THROUGH</div>
        <div className="manifesto-grid"><h2>Not another template.<br /><em>Your letter, your way.</em></h2><p>PenPal Pages gives you a calm, capable desktop studio to compose a proper letter: choose the paper, place the details, find the words, and make something worth opening.</p></div>
        <div className="feature-lineup">
          <article><span className="feature-number">01</span><div className="feature-symbol symbol-paper"><img src={`${BASE}assets/backgrounds/petal.svg`} alt="Petal Notes paper pattern" /></div><h3>Paper with personality</h3><p>Soft patterns, seasonal backgrounds, colour swatches, and a growing library of borders.</p></article>
          <article><span className="feature-number">02</span><div className="feature-symbol symbol-sticker"><img src={`${BASE}assets/stickers/blue-flower.svg`} alt="Blue flower sticker" /></div><h3>Details that feel yours</h3><p>Drag stickers onto the page, resize and rotate them, and recolour customisable designs.</p></article>
          <article><span className="feature-number">03</span><div className="feature-symbol symbol-type">Aa</div><h3>Words, properly set</h3><p>Use installed fonts, style words individually, and arrange text exactly where it belongs.</p></article>
          <article><span className="feature-number">04</span><div className="feature-symbol symbol-print"><span>PDF</span><ArrowRight size={20} /></div><h3>Made to leave the screen</h3><p>Design matching envelopes and address labels. Print at home or export a crisp 300-DPI PDF.</p></article>
        </div>
      </section>

      <section className="editor-story">
        <div className="editor-story-copy"><span className="eyebrow light">A DESKTOP STUDIO, NOT A DESIGN DEGREE</span><h2>Everything you need.<br /><em>Nothing in the way.</em></h2><p>Work across A4, A5, US Letter or Legal pages. Move, group, align and layer objects on a real canvas, with history you can step through when a little experiment goes sideways.</p><a className="light-link" href="#get-app">Explore the features <ArrowRight size={15} /></a></div>
        <div className="editor-story-screen"><EditorPreview /></div>
      </section>

      <section id="artwork" className="artwork-section section-pad">
        <div className="artwork-heading"><div><span className="section-kicker">A COLLECTION THAT KEEPS GROWING</span><h2>New little things<br /><em>to put in the post.</em></h2></div><p>Fresh stickers, backgrounds and borders arrive regularly. Preview each pack in the app before adding it to your library.</p></div>
        <div className="artwork-gallery">
          <figure className="artwork-tile tile-large"><div className="artwork-image image-petal"><img src={`${BASE}assets/backgrounds/petal.svg`} alt="Petal Notes repeating stationery background" /></div><figcaption><span>BACKGROUND · SPRING LETTERS</span><strong>Petal notes</strong></figcaption></figure>
          <figure className="artwork-tile"><div className="artwork-image image-border"><img src={`${BASE}assets/borders/wildflower.svg`} alt="Wildflower stationery border" /></div><figcaption><span>BORDER · FIELD NOTES</span><strong>Wildflower frame</strong></figcaption></figure>
          <figure className="artwork-tile"><div className="artwork-image image-sticker"><img src={`${BASE}assets/stickers/mushroom.svg`} alt="Mushroom sticker" /></div><figcaption><span>STICKER · LITTLE WOODS</span><strong>Mushroom friend</strong></figcaption></figure>
        </div>
        <div className="release-note"><Sparkles size={17} /><p><strong>Small seasonal releases, often.</strong> New themes and limited-time collections are planned throughout the year.</p><a href="#get-app">See the shop <ArrowRight size={14} /></a></div>
      </section>

      <section id="demo" className="demo-section section-pad">
        <div className="demo-heading"><div><span className="section-kicker">A QUICK LOOK AROUND</span><h2>From blank page<br /><em>to happy postbox.</em></h2></div><button type="button" className={tourPlaying ? 'tour-control playing' : 'tour-control'} onClick={() => setTourPlaying((playing) => !playing)}><span>{tourPlaying ? 'Ⅱ' : <Play size={15} fill="currentColor" />}</span>{tourPlaying ? 'Pause the tour' : 'Play the 45-second tour'}</button></div>
        <div className="tour-frame">
          <div className="tour-screen"><EditorPreview step={tourStep} /></div>
          <div className="tour-side"><span className="tour-step">{TOUR_STEPS[tourStep].eyebrow}</span><h3>{TOUR_STEPS[tourStep].title}</h3><p>{TOUR_STEPS[tourStep].copy}</p><div className="tour-progress" aria-label={`Tour step ${tourStep + 1} of ${TOUR_STEPS.length}`}>{TOUR_STEPS.map((step, index) => <button key={step.title} aria-label={`Show tour step ${index + 1}`} aria-pressed={index === tourStep} onClick={() => { setTourStep(index); setTourPlaying(false); }} />)}</div><div className="tour-caption">A guided look at the editor<br /><small>Backgrounds · stickers · print tools</small></div></div>
        </div>
      </section>

      <section id="get-app" className="purchase-section section-pad">
        <div className="purchase-art"><img src={`${BASE}assets/stickers/envelope.svg`} alt="An illustrated envelope sticker from PenPal Pages" /><span>YOUR NEXT LETTER<br />STARTS HERE</span><div className="purchase-stamp">P<br />P</div></div>
        <div className="purchase-copy"><span className="eyebrow">ONE PURCHASE · A DESKTOP TO KEEP</span><h2>Make room for<br /><em>a better letter.</em></h2><p>PenPal Pages is a Windows desktop app. Buy once, then make as many pages as you like. New artwork packs are separate and optional.</p>
          <div className="price-row"><span>{config ? price(current.pricePence) : '—'}</span><small>one-time purchase</small></div>
          {configError && <p className="form-note warning">{configError}</p>}
          <form className="checkout-form" onSubmit={startCheckout}>
            <label htmlFor="purchase-email">Email for your order</label><input id="purchase-email" type="email" autoComplete="email" required value={purchaseEmail} onChange={(event) => setPurchaseEmail(event.target.value)} placeholder="you@example.com" />
            {promotion && <div className="promo-entry"><div><label htmlFor="promo-code">Offer code</label><span>{promotion.discountPercent}% off</span></div><div className="promo-input-row"><input id="promo-code" type="text" maxLength={24} autoComplete="off" value={promoCode} onChange={(event) => { setPromoCode(event.target.value); setPromoApplied(false); }} placeholder="Enter code" /><button type="button" className="button button-outline" onClick={applyPromo}>Apply</button></div>{promoApplied && <small className="promo-applied"><Check size={13} /> Code applied · {price(discountedPence)}</small>}</div>}
            <button className="button button-dark checkout-button" type="submit" disabled={!config?.checkoutEnabled || purchaseBusy}>{purchaseBusy ? 'Opening secure checkout…' : config?.checkoutEnabled ? <>Continue to secure checkout <ArrowRight size={16} /></> : 'Checkout not configured yet'}</button>
            {!config?.checkoutEnabled && <p className="form-note">Secure checkout is being set up. For purchase questions, <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>}
            {purchaseMessage && <p className="form-success" role="status">{purchaseMessage}</p>}
            {purchaseError && <p className="form-error" role="alert">{purchaseError}</p>}
          </form>
          <div className="purchase-assurance"><span><Check size={13} /> Secure card checkout</span><span><Check size={13} /> Manual app fulfilment</span></div>
        </div>
      </section>

      <section id="about" className="about-section section-pad">
        <div className="about-seal"><img src={`${BASE}assets/penpal-splash-icon.svg`} alt="PenPal Pages app mark" /></div>
        <div className="about-text"><span className="section-kicker">ABOUT DARK WEATHER STUDIOS</span><h2>Made for the<br /><em>people you miss.</em></h2><p>Dark Weather Studios makes thoughtful tools for small, meaningful moments. PenPal Pages began with a simple idea: a letter should feel like the person who sent it.</p><a href={`mailto:${SUPPORT_EMAIL}`} className="email-link"><Mail size={16} />{SUPPORT_EMAIL}</a></div>
        <form className="contact-form" onSubmit={sendContact}>
          <span className="contact-kicker">QUESTIONS, IDEAS, OR A QUERY?</span><h3>Write us a note.</h3>
          <label>Name<input name="name" type="text" required maxLength={120} autoComplete="name" /></label>
          <label>Email<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
          <label>Subject<input name="subject" type="text" required maxLength={160} /></label>
          <label>Your message<textarea name="message" required maxLength={4000} rows={4} /></label>
          <button className="button button-dark" type="submit" disabled={contactBusy}>{contactBusy ? 'Sending…' : <>Send your note <ArrowRight size={15} /></>}</button>
          <p className="contact-small">Your note is saved securely. For direct email, write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
          {contactMessage && <p className="form-success" role="status">{contactMessage}</p>}
          {contactError && <p className="form-error" role="alert">{contactError} <a href={`mailto:${SUPPORT_EMAIL}`}>Email support instead.</a></p>}
        </form>
      </section>
    </main>

    <footer className="site-footer"><a className="footer-brand" href="#top"><img src={`${BASE}assets/penpal-splash-icon.svg`} alt="" />PenPal Pages</a><span>Thoughtful stationery, by Dark Weather Studios.</span><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a><span>© {new Date().getFullYear()} Dark Weather Studios</span></footer>
  </>;
}

function EditorPreview({ compact = false, step = 0 }: { compact?: boolean; step?: number }) {
  const demo = TOUR_STEPS[step];
  const paperImage = step === 1 ? 'blue-botanics.svg' : step === 2 ? 'lemon-grid.svg' : 'petal.svg';
  return <div className={compact ? 'editor-preview compact' : 'editor-preview'}>
    <div className="preview-topbar"><span className="preview-brand"><img src={`${BASE}assets/penpal-splash-icon.svg`} alt="" />PenPal <b>Pages</b></span><span className="preview-file">A little note.pen <i>Saved</i></span><div className="preview-actions"><span>↶</span><span>↷</span><span>Print</span><b>Export PDF</b></div></div>
    <div className="preview-workspace">
      <aside className="preview-rail"><div className="preview-tabs"><b>Backgrounds</b><span>Borders</span><span>Stickers</span><span>Text</span></div><div className="preview-rail-title">{demo.panel}</div><div className="preview-thumbs"><img src={`${BASE}${demo.art}`} alt="" /><img src={`${BASE}assets/backgrounds/blue-botanics.svg`} alt="" /><img src={`${BASE}assets/backgrounds/lemon-grid.svg`} alt="" /><img src={`${BASE}assets/borders/scallop.svg`} alt="" /></div><small>More artwork in the shop ↗</small></aside>
      <div className="preview-canvas"><div className="preview-paper" style={{ backgroundImage: `url("${BASE}assets/backgrounds/${paperImage}")` }}><div className="paper-border"><span className="paper-label">A LITTLE NOTE FOR YOU</span><strong>Dear friend,</strong><p>Somewhere in the middle<br />of an ordinary day, I thought<br />of you.</p><img className="paper-sticker" src={`${BASE}${demo.art}`} alt="" /><span className="paper-signoff">With love,</span><i>Me</i></div></div><div className="preview-canvas-foot">A4 · 100% <span>⊞ Guides</span></div></div>
      {!compact && <aside className="preview-properties"><b>Properties</b><small>{demo.item}</small><span>Position</span><div className="property-controls"><i>X&nbsp; 246</i><i>Y&nbsp; 382</i></div><span>Size</span><div className="property-controls"><i>↔&nbsp; 116</i><i>↕&nbsp; 116</i></div><div className="property-color"><i></i><i></i><i></i><small>Customise colours</small></div></aside>}
    </div>
  </div>;
}

export default App;