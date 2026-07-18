const BOOKS = [
  'Bhagavad Gita',
  'Valmiki Ramayana',
  'Principal Upanishads',
  'Yoga Sutras',
  'Ashtavakra Gita',
  'Uddhava Gita',
];

const FAQS = [
  {
    question: 'How does AskGod choose a passage?',
    answer: 'AskGod searches chapter themes and individual verses, then ranks the strongest candidates against the complete meaning of your question. It opens the full chapter and highlights the selected verse so you can read it in context.',
  },
  {
    question: 'Which divine books can I explore?',
    answer: 'The library includes the Bhagavad Gita, Valmiki Ramayana, principal Upanishads, Yoga Sutras, Shiva Sutras, and other attributed works. The library page lists every available book and chapter.',
  },
  {
    question: 'Can I read Sanskrit, English, and Hindi?',
    answer: 'Available chapters preserve Sanskrit and attributed English translations. Hindi is offered where a validated Hindi translation is available, with a mobile language switcher for comfortable reading.',
  },
  {
    question: 'Is AskGod professional advice?',
    answer: 'No. AskGod supports spiritual reflection and study. It is not a substitute for medical, legal, or financial advice, and urgent concerns should be taken to a qualified professional.',
  },
];

function DiscoveryContent() {
  return (
    <section className="discovery-content" aria-labelledby="discovery-title">
      <div className="discovery-intro">
        <p className="discovery-kicker">Read beyond the highlighted verse</p>
        <h2 id="discovery-title">How AskGod works</h2>
        <p>
          AskGod connects a personal question to a relevant passage, then opens the complete chapter so the guidance remains grounded in its original context and attributed edition.
        </p>
        <a href="/books/" className="discovery-library-link">Explore the crawlable divine books library</a>
      </div>

      <div className="discovery-books" aria-label="Available divine books">
        {BOOKS.map(book => <span key={book}>{book}</span>)}
      </div>

      <div className="discovery-faq">
        <h2>Questions about AskGod</h2>
        {FAQS.map(item => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export { FAQS };
export default DiscoveryContent;

