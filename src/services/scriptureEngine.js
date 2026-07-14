// Client-side Scripture Query Router & Ebook Engine

const API_KEY_KEY = 'askgod_gemini_api_key';

export function getStoredApiKey() {
  return localStorage.getItem(API_KEY_KEY) || import.meta.env.VITE_GEMINI_API_KEY || '';
}

export function setStoredApiKey(key) {
  if (key) {
    localStorage.setItem(API_KEY_KEY, key.trim());
  } else {
    localStorage.removeItem(API_KEY_KEY);
  }
}

// Fetch summaries.json from public static directory
export async function fetchSummaries() {
  const response = await fetch('/data/summaries.json');
  if (!response.ok) {
    throw new Error('Failed to load scripture summaries catalog.');
  }
  return response.json();
}

// Fetch a specific ebook database file on-demand
export async function fetchBookEbook(bookId) {
  const response = await fetch(`/data/ebooks/${bookId}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load ebook database for: ${bookId}`);
  }
  return response.json();
}

// Local Fallback Matcher (TF-IDF keyword similarity score)
export function routeLocally(question, summaries) {
  const query = question.toLowerCase();

  // High-priority direct keyword mappings
  if (query.includes('brother') || query.includes('cousin') || query.includes('relative')) {
    return { bookId: 'gita', chapter: 1, verse: 28, routingReason: "Selected Bhagavad Gita Chapter 1, as it directly addresses Prince Arjuna's grief and moral crisis regarding his brothers and relatives on the battlefield." };
  }
  if (query.includes('wonder') || query.includes('greatest wonder') || query.includes('marvel')) {
    return { bookId: 'yaksha_prashna', chapter: 1, verse: 1, routingReason: "Selected Yaksha Prashna Chapter 1, which contains Yudhishthira's famous answer on the greatest wonder of the world." };
  }
  if (query.includes('witness') || query.includes('pleasure and pain') || (query.includes('pleasure') && query.includes('pain'))) {
    return { bookId: 'uddhava_gita', chapter: 1, verse: 1, routingReason: "Selected Uddhava Gita Chapter 1, explaining the Self as the silent witness of pleasure and pain." };
  }
  if ((query.includes('states') && query.includes('consciousness')) || query.includes('aum') || query.includes('om') || query.includes('turiya')) {
    return { bookId: 'mandukya_upanishad', chapter: 1, verse: 2, routingReason: "Selected Mandukya Upanishad Chapter 1, which details the four states of consciousness (waking, dreaming, deep sleep, and Turiya)." };
  }
  if (query.includes('death') || query.includes('nachiketa') || query.includes('immortality')) {
    return { bookId: 'katha_upanishad', chapter: 1, verse: 2, routingReason: "Selected Katha Upanishad Chapter 1, which discusses Nachiketa's dialogue with Death regarding the afterlife and immortality." };
  }
  if (query.includes('meditation') || query.includes('focus') || query.includes('concentrate') || query.includes('still')) {
    return { bookId: 'yoga_sutras', chapter: 1, verse: 2, routingReason: "Selected Patanjali Yoga Sutras Chapter 1, detailing the definitions of Yoga, focus, and stilled mental fluctuations." };
  }
  if (query.includes('work') || query.includes('duty') || query.includes('result') || query.includes('expectation') || query.includes('action')) {
    return { bookId: 'gita', chapter: 2, verse: 47, routingReason: "Selected Bhagavad Gita Chapter 2, Verse 47, which outlines performing duty without attachment to the results." };
  }
  if (query.includes('anxious') || query.includes('stress') || query.includes('depressed') || query.includes('depress') || query.includes('fear') || query.includes('anger')) {
    return { bookId: 'gita', chapter: 2, verse: 56, routingReason: "Selected Bhagavad Gita Chapter 2, Verse 56, advising on maintaining a steady, undisturbed mind amidst grief, fear, and anger." };
  }
  if (query.includes('two birds') || query.includes('bird') || query.includes('truth') || query.includes('satyameva')) {
    return { bookId: 'mundaka_upanishad', chapter: 3, verse: 1, routingReason: "Selected Mundaka Upanishad Chapter 3, containing the metaphor of two birds on a tree and the victory of truth." };
  }
  if (query.includes('rare') || query.includes('human birth') || query.includes('grace')) {
    return { bookId: 'vivekachudamani', chapter: 1, verse: 2, routingReason: "Selected Vivekachudamani Chapter 1, explaining the rarity of a human birth and divine grace." };
  }
  if (query.includes('time') || query.includes('time heals') || query.includes('righteousness')) {
    return { bookId: 'ramayana', chapter: 1, verse: 1, routingReason: "Selected Valmiki Ramayana Chapter 1, detailing Rama's qualities and righteousness." };
  }

  // Fallback to token score matching
  const words = query.split(/\s+/).filter(w => w.length > 2);
  let bestMatch = { bookId: 'gita', chapter: 2, verse: 47, score: 0 };

  for (const book of summaries) {
    for (const ch of book.chapters) {
      let score = 0;
      const text = `${book.bookName} ${ch.name} ${ch.summary}`.toLowerCase();
      for (const word of words) {
        if (text.includes(word)) {
          score += 1;
        }
      }
      if (score > bestMatch.score) {
        bestMatch = {
          bookId: book.bookId,
          chapter: ch.id,
          verse: 1,
          score
        };
      }
    }
  }

  return {
    bookId: bestMatch.bookId,
    chapter: bestMatch.chapter,
    verse: bestMatch.verse,
    routingReason: `Selected ${bestMatch.bookId} Chapter ${bestMatch.chapter} based on keyword match for: ${words.join(', ')}.`
  };
}

// Perform client-side Gemini call
async function callGemini(systemInstruction, prompt, schema) {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    throw new Error('API Key Missing');
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema
      },
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      }
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `HTTP error ${response.status}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty response from Gemini API');
  }
  return JSON.parse(text);
}

// Dual-stage routing: Stage 1 (Chapter) -> Stage 2 (Verse)
export async function routeQuery(question, summaries) {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    console.log('No API Key configured. Routing locally...');
    return routeLocally(question, summaries);
  }

  try {
    // Stage 1: Chapter Routing (Macro)
    const bookSummariesContext = summaries.map(book => {
      const chaptersText = book.chapters.map(ch => `Chapter ${ch.id} (${ch.name}): ${ch.summary}`).join('\n');
      return `BOOK: ${book.bookName} (ID: ${book.bookId})\n${chaptersText}`;
    }).join('\n\n=======\n\n');

    const systemInstruction1 = `You are AskGod, an intelligent router for Hindu scriptures.
Your job is to read the seeker's question, inspect the available books and their chapter summaries below, and select the single best book and chapter that addresses their query.

INSTRUCTIONS:
- Return the selection in a JSON object with 'bookId' (string) and 'chapter' (integer).
- You MUST choose from the available book IDs and their actual chapters listed in the context. Do not make up book IDs or chapter numbers.
- Conform strictly to the requested JSON schema.`;

    const schema1 = {
      type: "OBJECT",
      properties: {
        bookId: { type: "STRING" },
        chapter: { type: "INTEGER" }
      },
      required: ["bookId", "chapter"]
    };

    console.log(`Routing query via Gemini Stage 1 (Chapter): "${question}"`);
    const stage1 = await callGemini(systemInstruction1, `Seeker's question: "${question}"\n\nScripture Catalog:\n${bookSummariesContext}`, schema1);
    console.log(`Stage 1 routed to Book: ${stage1.bookId}, Chapter: ${stage1.chapter}`);

    // Fetch the target ebook verses
    const ebook = await fetchBookEbook(stage1.bookId);
    const chapterVerses = ebook.verses.filter(v => Number(v.chapter) === Number(stage1.chapter));
    if (chapterVerses.length === 0) {
      throw new Error(`No verses found in chapter ${stage1.chapter} of book ${stage1.bookId}`);
    }

    // Stage 2: Verse Selector (Micro)
    // Optimization: If the chapter has more than 50 verses (like Ramayana Kandas), pre-filter candidates
    let candidateVerses = chapterVerses;
    if (chapterVerses.length > 50) {
      const queryWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const scored = chapterVerses.map(v => {
        let score = 0;
        const text = `${v.sanskrit} ${v.english || ''} ${v.english_alt || ''}`.toLowerCase();
        queryWords.forEach(w => {
          if (text.includes(w)) score += 1;
        });
        return { verse: v, score };
      });
      scored.sort((a, b) => b.score - a.score);
      const top50 = scored.slice(0, 50).map(s => s.verse);
      candidateVerses = top50.sort((a, b) => Number(a.verse) - Number(b.verse));
      console.log(`Client-side pre-filtered ${chapterVerses.length} verses to top 50 candidates for Stage 2.`);
    }

    const versesContext = candidateVerses.map(v => {
      const translation = v.english || v.english_alt || '';
      return `Verse ${v.verse}: Sanskrit: "${v.sanskrit}" | Translation: "${translation}"`;
    }).join('\n');

    const systemInstruction2 = `You are AskGod, an intelligent router for Hindu scriptures.
Your job is to read the seeker's question, inspect the verses of the selected chapter provided below, and identify the single best matching verse number to answer the seeker's query.

INSTRUCTIONS:
- Identify the matching verse number (integer). It MUST be one of the existing verse numbers in the list.
- Provide a brief, one-sentence explanation of why this specific verse is the perfect match for the seeker's question.
- Conform strictly to the requested JSON schema.`;

    const schema2 = {
      type: "OBJECT",
      properties: {
        verse: { type: "INTEGER", description: "The matching verse number" },
        routingReason: { type: "STRING", description: "A brief, comforting explanation of why this specific verse is selected" }
      },
      required: ["verse", "routingReason"]
    };

    console.log(`Routing query via Gemini Stage 2 (Verse): "${question}" inside Chapter ${stage1.chapter}`);
    const stage2 = await callGemini(systemInstruction2, `Seeker's question: "${question}"\n\nChapter Verses:\n${versesContext}`, schema2);
    console.log(`Stage 2 routed to Verse: ${stage2.verse}`);

    return {
      bookId: stage1.bookId,
      chapter: stage1.chapter,
      verse: stage2.verse,
      routingReason: stage2.routingReason
    };

  } catch (error) {
    console.warn('Client-side Gemini routing failed. Falling back to local keyword matcher...', error.message);
    return routeLocally(question, summaries);
  }
}

// Client-side on-demand Hindi Translator for the 11-verse window
export async function translateVersesToHindi(verses, targetVerse, bookName, chapterNum) {
  const apiKey = getStoredApiKey();
  if (!apiKey) return;

  const targetIdx = verses.findIndex(v => Number(v.verse) === Number(targetVerse));
  if (targetIdx === -1) return;

  const startIdx = Math.max(0, targetIdx - 5);
  const endIdx = Math.min(verses.length - 1, targetIdx + 5);
  const windowVerses = verses.slice(startIdx, endIdx + 1);
  const toTranslate = windowVerses.filter(v => !v.hindi || v.hindi.trim() === '');

  if (toTranslate.length === 0) return;

  try {
    console.log(`On-demand translating ${toTranslate.length} verses to Hindi via Gemini...`);
    const translationPrompt = `Translate the following ancient scripture verses into clear, authentic, and poetic Hindi translation.
    
    Verses to translate:
    ${toTranslate.map(v => `Verse ${v.verse}: Sanskrit: "${v.sanskrit}" | English: "${v.english || v.english_alt || ''}"`).join('\n')}
    
    Return the translations in a JSON array of objects conforming strictly to this schema:
    [
      { "verse": <number>, "hindi": "<Hindi translation>" }
    ]`;

    const schema = {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          verse: { type: "INTEGER" },
          hindi: { type: "STRING" }
        },
        required: ["verse", "hindi"]
      }
    };

    const translations = await callGemini(
      "You are a professional Sanskrit-to-Hindi translator.",
      translationPrompt,
      schema
    );

    translations.forEach(t => {
      const match = verses.find(v => Number(v.verse) === Number(t.verse));
      if (match) {
        match.hindi = t.hindi;
      }
    });
    console.log(`Successfully translated and cached ${translations.length} verses to Hindi client-side.`);
  } catch (err) {
    console.warn("Client-side Hindi translation failed:", err.message);
  }
}
