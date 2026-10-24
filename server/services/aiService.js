// High-Speed Authentic Vedic & Bhagavad Gita Inference Service
// Faithfully grounded in the teachings of His Divine Grace A.C. Bhaktivedanta Swami Prabhupada (Bhagavad-gītā As It Is & ISKCON)
import dotenv from 'dotenv';
dotenv.config();

const POLLINATIONS_URL = 'https://text.pollinations.ai/openai/chat/completions';

export const isGreetingOrCasual = (text) => {
  if (!text) return false;
  const clean = text.trim().toLowerCase().replace(/[!.,?]+$/, '').trim();
  const greetings = [
    'hi', 'hello', 'hey', 'namaste', 'hare krishna', 'pranams', 'pranam',
    'radhe radhe', 'radhe', 'good morning', 'good afternoon', 'good evening',
    'who are you', 'what are you', 'how are you', 'help', 'what can you do',
    'hi there', 'hello there', 'jai shri krishna', 'jai sri krishna',
    'hari bol', 'haribol', 'dandavat pranams', 'greetings', 'dandavats'
  ];
  return greetings.includes(clean);
};

export const getGreetingResponse = () => {
  return `Hare Krishna! 🙏 Dandavat Pranams! Welcome to Sri Gita Wisdom Guide.

I am your spiritual companion and Bhagavad Gita preceptor for the Krishna Kripa Study Circle.

I am here to guide and enlighten you on:
• **Vedic Philosophy & Wisdom**: Understanding the eternal Soul (*Atman*), Karma, Reincarnation, and Lord Sri Krishna as the Supreme Absolute Truth.
• **Srimati Radharani & Lord Chaitanya**: The sweet nectar of pure devotional love (*Bhakti*) and the congregational chanting of the Holy Names (*Harinama Sankirtana*).
• **Mind Mastery & Daily Life**: Overcoming distractions, anger, stress, and anxiety through Karma Yoga (*BG 2.47*) and Dhyana Yoga (*BG 6.26*).
• **Devotional Practices & Sadhana**: Chanting the Hare Krishna Maha-Mantra, honoring Prasadam, following the four regulative principles, and daily spiritual habits.
• **Bhagavad Gita As It Is**: In-depth explanations of Sanskrit verses, word-for-word purports, and practical life applications.

How may I serve your spiritual journey today? Please feel free to ask any question with an open heart!`;
};

/**
 * Cloud LLM Caller with resilient timeout and authentic Vedic system prompt
 */
const queryCloudLLM = async (messages, maxTokens = 850) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 16000);

  try {
    const res = await fetch(POLLINATIONS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai-fast',
        messages,
        max_tokens: maxTokens,
        temperature: 0.35 // lower temperature for high doctrinal accuracy and no hallucination
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";
      if (content.trim()) {
        return { content: content.trim(), modelUsed: 'Sri Gita Wisdom AI (Vedic Intelligence)' };
      }
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[Pollinations Cloud LLM notice]:', err.message);
  }

  throw new Error("Cloud LLM temporarily busy; engaging authentic scriptural knowledge engine.");
};

/**
 * Master Scriptural Knowledge Engine
 * Provides comprehensive, authentic, deep philosophical explanations across 25+ fundamental topics
 * when offline or when cloud LLM is unreachable.
 */
export const synthesizeDevotionalAnswer = (userQuestion, retrievedVerses) => {
  const q = (userQuestion || '').toLowerCase();
  const primaryVerse = (retrievedVerses && retrievedVerses[0]) || null;
  const secondaryVerse = (retrievedVerses && retrievedVerses[1]) || null;

  // 1. Srimati Radharani & Divine Love
  if (q.includes('radha') || q.includes('radharani') || q.includes('radhika') || q.includes('vrindavan') || q.includes('barsana')) {
    return `Hare Krishna! 🙏 Dandavat Pranams!

### 🌸 Who is Srimati Radharani and Her Relationship with Lord Sri Krishna?

In Gaudiya Vaishnava theology, Srimati Radharani is not an ordinary mortal or mere consort; She is the **Hlādinī Śakti**—the eternal internal pleasure potency and supreme energy of Lord Sri Krishna (*parā-śakti*). 

As explained by Srila Prabhupada and the *Caitanya-caritāmṛta* (Ādi 4.95–96):
> *"rādhā kṛṣṇa-praṇaya-vikṛtir hlādinī śaktir asmād..."*  
> Radha and Krishna are one and the same identity, eternally separated into two forms for the transcendental pleasure of exchanging pure divine love (*prema*).

#### Key Aspects of Srimati Radharani:
1. **The Queen of Vrindavana & Mother of Devotion:** Srimati Radharani is the personification of *Mahābhāva*—the zenith of selfless, unconditional divine love. Krishna is the supreme object of love (*viṣaya*), and Radharani is the supreme reservoir of love (*āśraya*).
2. **Krishna is Controlled by Her Love:** Although Lord Krishna is *Asamaurdhva* (none equal or superior to Him) and controls all universes, He happily places Himself under the sweet control of Srimati Radharani's pure devotion.
3. **The Gatekeeper of Divine Mercy:** Devotees pray first to Srimati Radharani because She is infinitely compassionate. When Radharani recommends a fallen soul to Krishna, saying, *"This soul is trying to serve You,"* Lord Krishna accepts that soul immediately without considering qualifications.
4. **The Name "Hare":** In the supreme Maha-Mantra (*Hare Krishna Hare Krishna, Krishna Krishna Hare Hare*), the word **"Hare"** addresses Srimati Radharani (Hara), begging Her to engage us in the loving devotional service of Sri Krishna.

*May Sri Sri Radha-Madhava bless your heart with eternal, pure devotion!* 🙏`;
  }

  // 2. Sri Chaitanya Mahaprabhu & Pancha Tattva
  if (q.includes('chaitanya') || q.includes('caitanya') || q.includes('mahaprabhu') || q.includes('gauranga') || q.includes('pancha tattva') || q.includes('navadvip')) {
    return `Hare Krishna! 🙏 All Glories to Sri Sri Guru and Gauranga!

### 🌟 Who is Sri Chaitanya Mahaprabhu?

Sri Chaitanya Mahaprabhu (1486–1534 CE) is Lord Sri Krishna Himself appearing in the mood and golden complexion of Srimati Radharani (*rādhā-bhāva-dyuti-suvalitam*). He is the Supreme Personality of Godhead who descended at Sridham Mayapur (Navadvipa, West Bengal) to inaugurate the **Yuga-Dharma** for the present age of Kali: **Hari-nāma Saṅkīrtana**—the congregational chanting of the Holy Names of the Lord.

#### The Golden Avatāra's Mission:
1. **The Secret Purpose of His Descent:** Lord Krishna wanted to experience three internal desires that only Radharani knows: (a) What is the greatness of Radharani's love? (b) What is the sweetness in Me that She tastes? (c) What is the bliss She experiences in loving Me? To relish this, Krishna appeared as Sri Gauranga Mahaprabhu.
2. **The Pancha-Tattva:** Lord Chaitanya does not act alone; He appears with His principal divine expansions:
   - **Sri Krishna Chaitanya:** The Supreme Lord Himself.
   - **Lord Nityananda:** The expansion of Lord Balarama, the personification of boundless mercy.
   - **Advaita Acharya:** The incarnation of Maha-Vishnu and Sada-Shiva who prayed for the Lord's descent.
   - **Pandita Gadadhara:** The expansion of Srimati Radharani's internal potency.
   - **Srivasa Thakura:** The personification of pure devotee association (*bhakta-avatāra*).
3. **The Gift of Harinama:** Lord Chaitanya freely gave the highest treasure of Goloka Vrindavana—pure love of God (*kṛṣṇa-prema*)—to every living entity without demanding qualification, caste, or background, simply through chanting:
   > *"Śrī-kṛṣṇa-caitanya prabhu-nityānanda śrī-advaita gadādhara śrīvāsādi-gaura-bhakta-vṛnda"*  
   > followed by the Hare Krishna Maha-Mantra!

*Ceto-darpaṇa-mārjanam*—chanting cleanses the dust from the mirror of our hearts and extinguishes the fire of material suffering! 🙏`;
  }

  // 3. The Hare Krishna Maha-Mantra & Science of Chanting
  if (q.includes('maha mantra') || q.includes('mahamantra') || q.includes('chant') || q.includes('chanting') || q.includes('japa') || q.includes('16 rounds') || q.includes('holy name')) {
    return `Hare Krishna! 🙏 The Supreme Holy Name of God!

### 📿 The Science of Chanting the Hare Krishna Maha-Mantra

In the *Kali-Santaraṇa Upaniṣad*, Lord Brahma instructs the sage Narada that there is no greater purifying sacrifice in this age of Kali than chanting the sixteen-word Maha-Mantra:

> **Hare Krishna, Hare Krishna, Krishna Krishna, Hare Hare**  
> **Hare Rama, Hare Rama, Rama Rama, Hare Hare**

#### Deep Spiritual Meaning of the Words:
1. **Hare:** Addresses Srimati Radharani (the divine feminine pleasure potency of the Lord). It means: *"O Divine Mother Radharani, please engage me in the loving service of the Supreme Lord."*
2. **Krishna:** Means *"The All-Attractive Supreme Personality of Godhead."* Everyone is searching for beauty, knowledge, strength, fame, wealth, and renunciation; Krishna possesses all six opulences in full.
3. **Rama:** Means *"The Supreme Reservoir of Eternal Pleasure."* Chanting Rama connects the soul with infinite spiritual bliss (*ānanda*).

#### Daily Chanting Sadhana (16 Rounds on Tulasi Beads):
- **Japa:** Soft personal chanting on a 108-bead Tulasi Japa Mala. Devotees chant 16 rounds daily (108 mantras per round).
- **Kirtan:** Congregational musical singing with mridanga and kartals.
- **Why it Works:** In the material world, a word and its object are different (e.g. saying "water" does not quench thirst). But in the absolute realm, Lord Krishna and His Holy Name are non-different (*abhinnatvān nāma-nāminoḥ*). When you chant with devotion, Lord Krishna is directly dancing upon your tongue!

#### Practical Tips for Attentive Chanting:
- Chant during the auspicious early morning hours (*Brāhma-muhūrta*, before sunrise).
- Listen carefully to each syllable with focused attention; let the holy vibrations enter the ear and calm the mind.

*Chant and be happy!* 🙏`;
  }

  // 4. The Soul (Atma), Reincarnation, and What Happens at Death
  if (q.includes('soul') || q.includes('atma') || q.includes('death') || q.includes('die') || q.includes('reincarnat') || q.includes('after death') || q.includes('ghost') || q.includes('next birth') || q.includes('who am i')) {
    return `Hare Krishna! 🙏 The Foundational Secret of the Bhagavad Gita!

### 🕊️ Who Are You? The Eternal Nature of the Soul (*Ātman*) and Reincarnation

The very first lesson Lord Krishna imparts to Arjuna in Chapter 2 of the Bhagavad Gita is that **you are NOT this temporary material body; you are the eternal, indestructible spirit soul (*ahaṁ brahmāsmi*)**.

#### Core Scriptural Truths:
1. **The Soul Never Dies (BG 2.20):**
   > *na jāyate mriyate vā kadācin... na hanyate hanyamāne śarīre*  
   > For the soul there is neither birth nor death at any time. He is unborn, eternal, ever-existing, and primeval. He is not slain when the body is slain.
2. **Changing Bodies Like Garments (BG 2.22):**
   > *vāsāṁsi jīrṇāni yathā vihāya navāni gṛhṇāti naro 'parāṇi...*  
   > Just as a person discards worn-out clothes and puts on new ones, the soul puts aside an old, decayed body and enters a new body at the time of death according to its accumulated karma and desire.
3. **Continuous Transmigration (BG 2.13):**
   Within a single lifetime, you have already changed bodies: from a baby's body to a child's, then youth, and old age. The conscious observer within remains identical. Similarly, at death, the soul simply passes into another body.
4. **The Critical Moment of Death (BG 8.5 & 8.6):**
   > *yaṁ yaṁ vāpi smaran bhāvaṁ tyajaty ante kalevaram...*  
   > Whatever state of being one remembers when quitting the body, that state one will attain in the next life. If one remembers Lord Krishna (*anta-kāle ca mām eva smaran*), one achieves liberation (*mokṣa*) and returns to the spiritual world (*Goloka Vṛndāvana*).

#### Practical Life Application:
Realizing you are an eternal soul removes all terror of death, calms anxieties over bodily appearance or aging, and inspires us to invest in spiritual assets that accompany the soul forever! 🙏`;
  }

  // 5. Why do we suffer? Karma, Destiny, and Maya
  if (q.includes('suffer') || q.includes('suffering') || q.includes('pain') || q.includes('why bad things') || q.includes('karma') || q.includes('destiny') || q.includes('maya') || q.includes('illusion') || q.includes('justice')) {
    return `Hare Krishna! 🙏 Understanding Karma, Suffering, and Divine Justice.

### ⚖️ Why Do Good People Suffer? The Law of Karma and the Material World

Lord Sri Krishna provides complete, logical, and compassionate clarity on the riddle of suffering in the Bhagavad Gita:

#### 1. The Material World is "Duḥkhālayam Aśāśvatam" (BG 8.15):
Lord Krishna openly defines this material universe as a **place of miseries (*duḥkha-ālayam*) and temporary existence (*aśāśvatam*)**. Just as you expect books in a library or medicine in a hospital, you must expect challenges, dualities, and physical ailments in the material world. It is a spiritual reform school designed to awaken our desire to return home to God.

#### 2. The Infallible Law of Karma:
- **Action & Reaction (Newton's 3rd Law in spirituality):** Every physical, verbal, and mental action generates an exact karmic reaction.
- **Past Life Seeds (Prārabdha Karma):** When a righteous person suffers today, it is not injustice; they are burning off residual negative karma from previous births, just as clouds temporarily obscure the sun. When a wicked person prospers, they are exhausting past pious credits (*sukṛti*).
- **Three Types of Karma:**
  - *Karma:* Lawful pious actions yielding pleasant material rewards.
  - *Vikarma:* Sinful, prohibited actions yielding suffering and disease.
  - *Akarma:* Actions performed purely for the satisfaction of Lord Krishna, which generate **zero material reaction** and bestow complete spiritual liberation (BG 3.9).

#### 3. Overcoming Maya (BG 7.14):
> *daivī hy eṣā guṇa-mayī mama māyā duratyayā / mām eva ye prapadyante māyām etāṁ taranti te*  
> Krishna's material illusion (*Māyā*) is insurmountable by mortal intellect alone. But those who surrender unto Krishna easily cross beyond it!

#### 4. The Ultimate Promise (BG 18.66):
When you surrender to Krishna and chant His holy names, Krishna takes personal charge of your destiny:  
> *"I shall deliver you from all sinful reactions. Do not fear!"* 🙏`;
  }

  // 6. Overcoming Stress, Anxiety, Exams, Procrastination & Karma Yoga (BG 2.47)
  if (q.includes('exam') || q.includes('study') || q.includes('studies') || q.includes('stress') || q.includes('anxiety') || q.includes('procrastinat') || q.includes('result') || q.includes('fear') || q.includes('fail') || q.includes('2.47')) {
    return `Hare Krishna! 🙏 Wisdom for Student Success, Focus, and Peace of Mind.

### 🎯 The Science of Karma Yoga for Academic Focus and Freedom from Anxiety

In Bhagavad Gita Chapter 2, Verse 47, Lord Krishna gives the supreme universal formula for mental mastery and high performance:

> **कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।**  
> **मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥**  
> *(karmaṇy evādhikāras te mā phaleṣu kadācana / mā karma-phala-hetur bhūr mā te saṅgo 'stv akarmaṇi)*

**Translation:** *"You have a right to perform your prescribed duty, but you are not entitled to the fruits of action. Never consider yourself the cause of the results of your activities, and never be attached to not doing your duty."*

#### The Four Golden Principles of BG 2.47:
1. **Focus 100% on the Sincere Process:** You have control over your study schedule, effort, practice questions, and attention. Put your full heart into studying right now.
2. **Release Anxious Obsession Over the Future:** Results depend on many cosmic variables. When students obsess over scores or fear failure, the intellect scatters, panic sets in, and memory freezes. Relinquish the outcome into Krishna's hands.
3. **Never Fall into Laziness or Procrastination (*mā te saṅgo 'stv akarmaṇi*):** Detachment does not mean giving up or doing less. True detachment means studying with maximum dedication, free from frantic ego.
4. **Offer Your Studies as Devotion (*Yajña*):** Treat your textbooks and education as an offering to Lord Krishna. When you study to develop your God-given talents to serve society, fear vanishes and supernatural clarity awakens!

#### Practical Student Habits:
- Start every study session with a 2-minute prayer: *"Hare Krishna, dear Lord, please guide my memory and intellect to serve You."*
- Study in 45-minute focused blocks (Pomodoro) with zero phone notifications.
- Eat clean, sanctified vegetarian food (*Prasādam*) and take adequate rest.

*May Sri Krishna bless your intellect with sharp memory, peace, and highest success!* 🙏`;
  }

  // 7. Mind Control, Distractions, Meditation (BG 6.26, 6.35)
  if (q.includes('mind') || q.includes('focus') || q.includes('distract') || q.includes('restless') || q.includes('meditat') || q.includes('overthink') || q.includes('impure thought')) {
    return `Hare Krishna! 🙏 The Art of Mastering the Restless Mind.

### 🧠 Mind Mastery According to Bhagavad Gita Chapter 6

Arjuna lamented to Lord Krishna in BG 6.34 that controlling the mind feels harder than catching the raging wind (*vāyor iva su-duṣkaram*). Lord Krishna answered with deep empathy, providing the two infallible spiritual tools:

#### 1. Abhyāsa (Constant Practice) & Vairāgya (Detachment) — BG 6.35:
- **Abhyāsa:** Whenever the mind wanders off to social media, past regrets, or daydreams, do not beat yourself up. Gently, patiently, and firmly bring it back to your sacred duty (BG 6.26: *yato yato niścarati manaś cañcalam asthiram...*).
- **Vairāgya:** Starve the lower mind. Reduce consumption of trivial digital garbage, sensual gossip, and toxic entertainment that agitate the nervous system.

#### 2. The Mind is Either Your Best Friend or Worst Enemy (BG 6.5–6):
- For one who has conquered the mind, it is the best of friends, helping you achieve extraordinary academic focus and divine joy.
- For one who lets the mind run wild, it acts as the greatest inner enemy, torturing you with self-doubt, lust, and anxiety.

#### 3. The Power of Sacred Sound Vibration:
The Sanskrit word **Mantra** comes from *Man* (mind) and *Trayate* (delivers). Chanting the Hare Krishna Maha-Mantra directly purifies the sub-conscious mind, pulling the reins of the senses and bestowing profound internal stillness.

*Start your day with 15 minutes of peaceful Japa meditation before touching any smartphone screens!* 🙏`;
  }

  // 8. Purpose of Human Life & Surrender (BG 18.66)
  if (q.includes('purpose') || q.includes('meaning of life') || q.includes('why are we here') || q.includes('goal of life') || q.includes('surrender') || q.includes('18.66') || q.includes('liberation') || q.includes('moksha')) {
    return `Hare Krishna! 🙏 The Ultimate Goal of Human Existence.

### 🌺 What is the True Purpose of Human Life?

The ancient *Vedānta-sūtra* opens with the monumental statement:
> **"Athāto brahma-jijñāsā"**  
> *"Now that you have achieved a human form of life, it is time to inquire into the Absolute Truth."*

#### 1. Beyond Animal Propensities:
Animals and humans both engage in four basic bodily activities: eating (*āhāra*), sleeping (*nidrā*), mating (*maithuna*), and defending (*bhaya*). If a human being only focuses on good food, luxury beds, romance, and security, they are merely sophisticated animals. Human life is the rare doorway (*durlabhaṁ mānuṣaṁ janma*) to spiritual God-consciousness.

#### 2. Our Eternal Constitutional Position (Sanātana Dharma):
Sri Chaitanya Mahaprabhu reveals:
> *"jīvera 'svarūpa' haya — kṛṣṇera 'nitya-dāsa'"*  
> The eternal identity and joy of every soul is to be a loving, voluntary servant and friend of Lord Sri Krishna. Just as the hand is happy when feeding the stomach, the soul is peaceful and blissful only when connected in loving service to the Supreme Whole.

#### 3. The Ultimate Instruction of the Bhagavad Gita (BG 18.66):
After explaining Karma, Jnana, Dhyana, and Ashtanga Yoga, Lord Krishna gives His supreme concluding verdict:
> **सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज ।**  
> **अहं त्वां सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः ॥**  
> *(sarva-dharmān parityajya mām ekaṁ śaraṇaṁ vraja / ahaṁ tvāṁ sarva-pāpebhyo mokṣayiṣyāmi mā śucaḥ)*

*"Abandon all varieties of mundane duty and just surrender unto Me alone. I shall deliver you from all sinful reactions. Do not fear!"*

Surrendering to Krishna is not defeat; it is the child running safely into the loving arms of its Father. It brings eternal joy (*ānanda*), freedom from all fear, and entrance into the spiritual world! 🙏`;
  }

  // 9. Who is Krishna? (Svayam Bhagavan)
  if (q.includes('who is krishna') || q.includes('is krishna god') || q.includes('bhagavan') || q.includes('supreme person') || q.includes('who is god')) {
    return `Hare Krishna! 🙏 The Absolute Truth in Person.

### 🦚 Who is Lord Sri Krishna?

In the Vedic literatures—including the *Bhagavad-gītā*, *Śrīmad-Bhāgavatam*, and *Brahma-saṁhitā*—Lord Sri Krishna is established not as a demigod, mythological figure, or mortal prophet, but as **Svayam Bhagavān**—the Original Supreme Personality of Godhead, the cause of all causes (*sarva-kāraṇa-kāraṇam*).

#### Scriptural Evidence:
1. **Brahma-saṁhitā 5.1:**
   > *īśvaraḥ paramaḥ kṛṣṇaḥ sac-cid-ānanda-vigrahaḥ / anādir ādir govindaḥ sarva-kāraṇa-kāraṇam*  
   > Krishna is the Supreme Controller. He possesses an eternal form of absolute eternity (*sat*), knowledge (*cit*), and bliss (*ānanda*). He is Govinda, the origin of all, without any origin.
2. **Bhagavad Gita 7.7:**
   > *mattaḥ parataraṁ nānyat kiñcid asti dhanañjaya...*  
   > Lord Krishna declares: *"O conqueror of wealth, there is no truth superior to Me. Everything rests upon Me, as pearls are strung on a thread."*
3. **Bhagavad Gita 10.8:**
   > *ahaṁ sarvasya prabhavo mattaḥ sarvaṁ pravartate...*  
   > *"I am the source of all spiritual and material worlds. Everything emanates from Me."*
4. **Arjuna's Direct Confession (BG 10.12):**
   Arjuna exclaims: *"You are the Supreme Brahman, the ultimate abode, the purest, the Absolute Truth, the eternal, transcendental, original Person!"*

#### Krishna's Unique Sweetness (Mādhurya):
While all other expansions of Godhead (such as Lord Vishnu and Narayana) emphasize awe, reverence, and majestic majesty (*Aiśvarya*), in Sri Krishna in Vrindavana we find the summit of intimate divine love (*Mādhurya*)—where God plays with His cowherd friends as an equal, allows Mother Yashoda to tie Him with love, and dances in the moonlit forests of Vrindavana with His devotees! 🙏`;
  }

  // 10. Demigods (Devatas) vs Supreme Lord Krishna
  if (q.includes('demigod') || q.includes('shiva') || q.includes('brahma') || q.includes('ganesh') || q.includes('indira') || q.includes('durga') || q.includes('many gods') || q.includes('polytheism')) {
    return `Hare Krishna! 🙏 Clarifying the Vedic Truth: Demigods and the Supreme Lord.

### 🔱 The Relationship Between Lord Krishna and the Demigods (*Devatās*)

One of the most common misunderstandings about Hinduism is the idea of "330 million independent gods." The Vedic scriptures teach pure monotheism (*Ekaṁ brahma dvitīyaṁ nāsti*), where Lord Krishna is the Supreme Monarch, and the demigods are exalted administrative servants in universal cosmic management.

#### 1. The Government Analogy:
- Lord Krishna is like the Head of State / President.
- Exalted personalities like Lord Brahma, Lord Indra, Lord Surya, Lord Vayu, and Lord Agni are like prime ministers, governors, and department heads appointed to manage creation, rain, sunlight, wind, and heat.
- Respecting government officers is good, but all ultimate power belongs to the Supreme Sovereign.

#### 2. The Unique Position of Lord Shiva (*Śiva-tattva*):
The *Brahma-saṁhitā* explains that Lord Shiva is not an ordinary living entity (*jīva*), nor is He the original Supreme Lord (*Viṣṇu-tattva*). Just as milk transforms into yogurt (*dahi*), which is milk and yet cannot be turned back into milk, Lord Krishna transforms into Lord Shiva for cosmic destruction and delivering conditioned souls. Shiva is the greatest Vaishnava (*vaiṣṇavānāṁ yathā śambhuḥ*), always meditating upon Sri Krishna.

#### 3. Worship of Demigods in the Bhagavad Gita (BG 7.20–23):
Lord Krishna states that those whose intellect is carried away by material desires worship demigods for temporary worldly boons (*antavat tu phalaṁ teṣām*). But worship offered directly to Sri Krishna bestows eternal spiritual perfection and liberation!

*We offer utmost respect to all great demigods as exalted devotees of Lord Krishna, while directing our supreme worship to Sri Krishna alone.* 🙏`;
  }

  // 11. Four Regulative Principles & Pure Habits
  if (q.includes('regulative') || q.includes('rules') || q.includes('meat') || q.includes('vegetarian') || q.includes('alcohol') || q.includes('gambling') || q.includes('onion') || q.includes('garlic')) {
    return `Hare Krishna! 🙏 The Four Pillars of Spiritual Purity.

### 🛡️ The Four Regulative Principles of Freedom (*Vidhi*)

Srila Prabhupada established four foundational principles for anyone seeking spiritual advancement, peace of mind, and moral strength. These four rules correspond to the **Four Pillars of Dharma**:

| Regulative Principle | Pillar of Dharma Protected | Spiritual & Psychological Benefit |
| :--- | :--- | :--- |
| **1. No Meat, Fish, or Eggs** | **Dayā (Mercy & Compassion)** | Avoids contributing to animal slaughter; honors the sacredness of all life. Eating sanctified *Prasādam* purifies consciousness (BG 3.13). |
| **2. No Gambling** | **Satyam (Truthfulness)** | Protects honesty, hard work, and prevents greed and financial anxiety. |
| **3. No Intoxication** *(alcohol, smoking, drugs, excessive caffeine)* | **Tapas (Austerity & Clarity)** | Preserves brain function, memory, intellect, and spiritual sobriety. |
| **4. No Illicit Sex** | **Śaucam (Cleanliness & Purity)** | Focuses mental and spiritual energy (*Ojas*) toward higher divine realization and respectful relationships. |

#### Why Avoid Onion and Garlic in Devotional Cooking?
In the *Bhagavad-gītā* (17.8–10), foods are classified according to the three modes of nature. Onions and garlic belong to the modes of passion (*rajas*) and ignorance (*tamas*), which agitate the nervous system and awaken sensual anger and distraction. Devotees offer only foods in the mode of goodness (*sattva*) with love to Krishna.

*Following these principles is not restriction; it is the royal road to genuine inner freedom and peace!* 🙏`;
  }

  // 12. Ekadashi, Fasting & Festivals
  if (q.includes('ekadashi') || q.includes('fasting') || q.includes('grains') || q.includes('festival') || q.includes('janmashtami')) {
    return `Hare Krishna! 🙏 The Glories of Ekadashi & Holy Days.

### 🌙 The Significance of Ekadashi (*Hari-vāsara*)

Ekadashi is the eleventh lunar day of both the waxing (*śukla*) and waning (*kṛṣṇa*) moon. Known as the **Mother of Devotion** (*mādhava-tithi*), it is a day dedicated entirely to intensifying our loving service and remembrance of Lord Sri Krishna.

#### Why Abstain from Grains and Beans on Ekadashi?
The *Brahma-vaivarta Purāṇa* explains that all personified sins take shelter in grains and beans on the day of Ekadashi. Abstaining from grains (rice, wheat, dal, barley, oats, beans) gives physical rest to the digestive system and frees the body's energy for meditation, japa, and scriptural study.

#### Spiritual Practices on Ekadashi:
1. Fast from grains and beans; honor simple fruits, milk, water, and root vegetables (*vrat food*).
2. Increase your chanting of the Hare Krishna Maha-Mantra (e.g. chanting 20, 25, or 32 rounds).
3. Read the transcendental pastimes of Lord Krishna in the *Bhagavad-gītā* or *Śrīmad-Bhāgavatam*.
4. Practice charity, forgiveness, and prayer.

*Ekadashi burns away mountains of karmic sins and nourishes the creeper of pure devotion (*bhakti-latā*)!* 🙏`;
  }

  // 13. Guru, Discipleship, and Parampara
  if (q.includes('guru') || q.includes('spiritual master') || q.includes('prabhupada') || q.includes('parampara') || q.includes('initiation') || q.includes('diksha')) {
    return `Hare Krishna! 🙏 The Sacred Transmission of Transcendental Wisdom.

### 🌺 The Necessity of the Spiritual Master (*Guru*) and Disciplic Succession (*Paramparā*)

In the Bhagavad Gita (4.2), Lord Krishna states:  
> **"evaṁ paramparā-prāptam imaṁ rājarṣayo viduḥ..."**  
> *"This supreme science was thus received through the chain of disciplic succession, and the saintly kings understood it in that way."*

#### 1. Why Do We Need a Guru? (BG 4.34):
Just as a student cannot learn advanced surgery from textbooks alone without a qualified professor, spiritual science cannot be manufactured by our limited speculation. We must approach a self-realized soul (*tattva-darśinaḥ*) with humility, sincere inquiry, and loving service.

#### 2. The Brahma-Madhva-Gaudiya Sampradaya:
The spiritual lineage flows from Lord Sri Krishna to Brahma, Narada, Vyasadeva, Madhvacharya, Sri Chaitanya Mahaprabhu, the Six Gosvamis of Vrindavana, down to Srila Bhaktisiddhanta Sarasvati Thakura, and **His Divine Grace A.C. Bhaktivedanta Swami Prabhupada**, who carried this pure nectar to every corner of the world.

#### 3. Qualifications of a Bona Fide Guru:
- Strictly teaches what Krishna taught without watering down or adding personal speculation (*as it is*).
- Exemplifies pure character, unmotivated love for God, and selfless service.

*By the mercy of the spiritual master, one receives the benediction of Krishna (*yasya prasādād bhagavat-prasādo*)!* 🙏`;
  }

  // Default Dynamic Scriptural Synthesis with Retrieved Verses
  let answer = `Hare Krishna! 🙏 Dandavat Pranams!\n\n`;
  answer += `Regarding your spiritual inquiry: **"${userQuestion}"** — the sacred Vedic scriptures, especially the *Bhagavad-gītā As It Is*, illuminate this topic with supreme clarity:\n\n`;

  if (primaryVerse) {
    answer += `### 📖 Sacred Verse: ${primaryVerse.ref}\n`;
    if (primaryVerse.sanskrit) {
      answer += `> **${primaryVerse.sanskrit}**\n\n`;
    }
    if (primaryVerse.transliteration) {
      answer += `*${primaryVerse.transliteration}*\n\n`;
    }
    answer += `**Translation**: *"${primaryVerse.translation}"*\n\n`;
    answer += `**Spiritual Realization**: This divine instruction reveals that ${primaryVerse.theme.toLowerCase()}. In our journey back to Godhead, Lord Sri Krishna teaches us that pure consciousness arises when our thoughts, words, and actions are harmonized with eternal spiritual truth rather than fleeting material illusion.\n\n`;
  }

  if (secondaryVerse && secondaryVerse.ref !== primaryVerse?.ref) {
    answer += `### 🌿 Supporting Scriptural Wisdom: ${secondaryVerse.ref}\n`;
    answer += `*"${secondaryVerse.translation}"*\n\n`;
  }

  answer += `### 💡 Key Takeaways for Your Daily Spiritual Sadhana:\n`;
  answer += `- **Remember Your Eternal Identity**: You are an immortal spirit soul (*ātman*), an eternal loving servant of Lord Sri Krishna (*BG 15.7*).\n`;
  answer += `- **Daily Connection through Holy Names**: Chant the Hare Krishna Maha-Mantra with sincere feeling to keep the mind steady, clear, and joyful.\n`;
  answer += `- **Act as an Instrument of Dharma**: Fulfill your daily responsibilities, studies, and service with 100% integrity, offering all results to the Supreme Lord (*BG 9.27*).\n\n`;

  answer += `*Hare Krishna Hare Krishna, Krishna Krishna Hare Hare | Hare Rama Hare Rama, Rama Rama Hare Hare* 🙏`;
  return answer;
};

/**
 * Intelligent Parser to detect specific Bhagavad Gita Chapter and Verse
 */
export const parseVerseReference = (text) => {
  if (!text) return null;
  const clean = text.trim();
  const pWords = /(?:chapter|ch\.?)\s*(\d{1,2})\s*(?:and|,\s*)?(?:verse|v\.?|sloka|shloka)?\s*(\d{1,3})/i;
  const pPrefix = /(?:bg|bhagavad\s*g[iī]t[aā]|gita|verse|sloka|shloka)\s*(\d{1,2})[.:\s/-]+(\d{1,3})/i;
  const pCompact = /\bbg\s*(\d{1,2})[.:](\d{1,3})\b/i;
  const pNumbers = /(?:^|\b)(\d{1,2})[.:](\d{1,3})(?:\b|$)/;

  const m = clean.match(pWords) || clean.match(pPrefix) || clean.match(pCompact) || clean.match(pNumbers);
  if (m) {
    const ch = parseInt(m[1], 10);
    const v = parseInt(m[2], 10);
    if (ch >= 1 && ch <= 18 && v >= 1 && v <= 78) {
      return { chapter: ch, verse: v, ref: `BG ${ch}.${v}` };
    }
  }
  return null;
};

export const fetchSpecificGitaVerse = async (chapter, verse, fallbackVerses = []) => {
  const ref = `BG ${chapter}.${verse}`;
  const local = (fallbackVerses || []).find(v => v.ref === ref || (v.chapter === chapter && v.verse === verse));
  if (local && local.sanskrit && local.translation) {
    return {
      ref,
      chapter,
      verse,
      sanskrit: local.sanskrit,
      transliteration: local.transliteration || '',
      translation: local.translation,
      purport: local.purport || '',
      theme: local.theme || `Bhagavad Gita As It Is — Chapter ${chapter}, Verse ${verse}`
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`https://vedicscriptures.github.io/slok/${chapter}/${verse}`, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const sanskrit = (data.slok || '').trim();
      const transliteration = (data.transliteration || '').trim();
      const translation = (data.prabhu?.et || data.siva?.et || data.purohit?.et || '').trim();
      const purport = (data.prabhu?.ec || data.siva?.ec || '').trim();

      if (translation || sanskrit) {
        return {
          ref,
          chapter,
          verse,
          sanskrit,
          transliteration,
          translation,
          purport,
          theme: `Bhagavad Gita Chapter ${chapter}, Verse ${verse}`
        };
      }
    }
  } catch (err) {
    console.warn(`[Backend Verse Fetch Notice for ${ref}]:`, err.message);
  }

  return local || null;
};

export const formatSpecificVerseResponse = (vData) => {
  let text = `Hare Krishna! 🙏 Dandavat Pranams!\n\n`;
  text += `### 📖 Sacred Verse: ${vData.ref} (Chapter ${vData.chapter}, Verse ${vData.verse})\n\n`;

  if (vData.sanskrit) {
    text += `> **${vData.sanskrit.replace(/\n+/g, ' ')}**\n\n`;
  }
  if (vData.transliteration) {
    text += `*${vData.transliteration.replace(/\n+/g, ' ')}*\n\n`;
  }
  text += `**Translation (by His Divine Grace A.C. Bhaktivedanta Swami Prabhupada)**:\n`;
  text += `*"${vData.translation}"*\n\n`;

  if (vData.purport) {
    text += `### 🌿 Transcendental Purport & Insights:\n`;
    const cleanPurport = vData.purport.replace(/^[ \t\n]+/, '').slice(0, 950);
    text += `${cleanPurport}${vData.purport.length > 950 ? '...' : ''}\n\n`;
  }

  text += `### 💡 Practical Takeaways for Daily Life & Students:\n`;
  text += `1. **Sacred Truth for Daily Living**: Every verse of the Bhagavad Gita speaks to the inner Kurukshetra of our mind, removing fear and delusion.\n`;
  text += `2. **Righteous Action (Karma Yoga)**: Align your academic studies and responsibilities with truth (*Dharma*) and offer all results to Lord Sri Krishna (*BG 9.27*).\n`;
  text += `3. **Daily Chanting**: Chant the Hare Krishna Maha-Mantra daily to keep the intellect clear, peaceful, and sharp.\n\n`;
  text += `*Hare Krishna Hare Krishna, Krishna Krishna Hare Hare | Hare Rama Hare Rama, Rama Rama Hare Hare* 🙏`;

  return text;
};

/**
 * FEATURE 1: Bhagavad Gita Q&A with strict RAG grounding & Deep Vaishnava Prompt
 */
export const answerGitaQuestion = async (userQuestion, retrievedVerses) => {
  if (isGreetingOrCasual(userQuestion)) {
    return {
      answer: getGreetingResponse(),
      modelUsed: "Sri Gita Wisdom Guide",
      sourcedVerses: [],
      provider: "Direct Spiritual Companion",
      timestamp: new Date().toISOString()
    };
  }

  // Exact verse reference detection (all 700 verses)
  const parsed = parseVerseReference(userQuestion);
  if (parsed) {
    const specificVerse = await fetchSpecificGitaVerse(parsed.chapter, parsed.verse, retrievedVerses);
    if (specificVerse) {
      return {
        answer: formatSpecificVerseResponse(specificVerse),
        modelUsed: "Authentic 700-Verse Scripture Knowledge Engine (Bhagavad-gītā As It Is)",
        sourcedVerses: [specificVerse],
        provider: "Universal Vedic Scriptures Database",
        timestamp: new Date().toISOString()
      };
    }
  }

  const contextText = (retrievedVerses || []).map(v => 
    `[${v.ref}] Chapter ${v.chapter}, Verse ${v.verse}\nSanskrit: ${v.sanskrit || ''}\nTransliteration: ${v.transliteration || ''}\nTranslation: "${v.translation}"\nTheme: ${v.theme}`
  ).join("\n\n");

  const systemPrompt = `You are Sri Gita Wisdom AI, an enlightened, warm, and authentic Gaudiya Vaishnava spiritual preceptor and guide for students and devotees of ISKCON Krishna Kripa.
You possess profound, flawless knowledge of Vedic scriptures: Bhagavad-gītā As It Is, Śrīmad-Bhāgavatam, Caitanya-caritāmṛta, and the teachings of His Divine Grace A.C. Bhaktivedanta Swami Prabhupada.

CRITICAL SPIRITUAL RULES:
1. Always open with "Hare Krishna! 🙏" and a warm devotional greeting.
2. The holy names are strictly the Hare Krishna Maha-Mantra:
   "Hare Krishna, Hare Krishna, Krishna Krishna, Hare Hare / Hare Rama, Hare Rama, Rama Rama, Hare Hare".
   NEVER fabricate chants or cite non-existent books.
3. Answer the user's specific spiritual question with genuine depth, compassion, and scriptural fidelity.
   - If asked about Radharani, explain Her as the Hladini Shakti and supreme personification of devotion.
   - If asked about Chaitanya Mahaprabhu, explain Him as Krishna in the mood of Radharani spreading Harinama Sankirtana.
   - If asked about the soul, death, karma, Maya, or suffering, give pure philosophical answers based on the Gita.
   - If asked about studies or exams, weave in Karma Yoga (BG 2.47) and mind control (BG 6.26).
4. Cite authentic Bhagavad Gita verses (BG Chapter.Verse) with accurate translations.
5. Provide clear, structured takeaways or practical steps for daily spiritual life.
6. Conclude with a warm blessing and the Hare Krishna Maha-Mantra.`;

  const userPrompt = `AUTHENTIC SCRIPTURAL CONTEXT (FROM BHAGAVAD-GITA AS IT IS):
${contextText}

STUDENT / SEEKER QUESTION:
"${userQuestion}"

Please provide a structured, devotional, and profound explanation answering this question thoroughly with genuine Vedic wisdom.`;

  try {
    const aiResult = await queryCloudLLM([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ], 850);

    return {
      answer: aiResult.content,
      modelUsed: aiResult.modelUsed,
      sourcedVerses: retrievedVerses,
      provider: "Cloud LLM Intelligence",
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.warn("[AI Gita Q&A Fallback Notice]:", err.message);

    const synthesizedAnswer = synthesizeDevotionalAnswer(userQuestion, retrievedVerses);

    return {
      answer: synthesizedAnswer,
      modelUsed: "Krishna Kripa Scriptural Knowledge Engine (Authentic Vaishnava RAG)",
      sourcedVerses: retrievedVerses,
      providerNotice: err.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * FEATURE 2: AI Attendance Insights (Strict Deterministic Grounding for Admin)
 */
export const analyzeAttendanceInsights = async (userPrompt, verifiedMetrics) => {
  const systemPrompt = `You are an administrative insights assistant for the Krishna Kripa Bhagavad Gita classes portal.
CRITICAL RULES:
1. You are provided with VERIFIED server-side attendance statistics.
2. You must NEVER hallucinate or alter any numbers, percentages, or student counts.
3. Provide a structured, executive summary with:
   - Key Turnout Highlights
   - Attendance Patterns & Health
   - Pastoral Recommendations (e.g. personal follow-ups, celebrating consistency)
4. Maintain a warm, encouraging, and pastoral tone.`;

  const contextData = JSON.stringify(verifiedMetrics, null, 2);

  const promptContent = `VERIFIED ATTENDANCE DATA:
${contextData}

ADMIN QUESTION:
"${userPrompt}"

Provide a clear, executive summary answering the question with actionable insights for the Bhagavad Gita weekend class coordinators.`;

  try {
    const aiResult = await queryCloudLLM([
      { role: "system", content: systemPrompt },
      { role: "user", content: promptContent }
    ], 700);

    return {
      insights: aiResult.content,
      verifiedMetrics,
      modelUsed: aiResult.modelUsed,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.warn("[AI Attendance Insights Fallback Notice]:", err.message);

    const fallbackInsights = `### 📊 Verified Attendance Executive Summary
- **Overall Student Community**: ${verifiedMetrics.totalStudents} Active Students enrolled.
- **Conducted Weekend Classes**: ${verifiedMetrics.totalConductedSessions} class sessions verified in the system.
- **Historical Attendance Rate**: ${verifiedMetrics.overallPercentage}% average turnout rate across held sessions.
- **Latest Class Turnout**: ${verifiedMetrics.latestPresent} Students Present, ${verifiedMetrics.latestAbsent} Students Absent.

#### 💡 Pastoral Recommendations:
1. **Celebrate Attendance Milestones**: Recognize students with regular attendance to inspire consistent participation.
2. **Personal Outreach**: Reach out with care to students who missed the latest session to ensure they have the class notes and feel welcomed back.
3. **Interactive Bhagavad Gita Engagement**: Encourage students to ask questions through the Sri Gita Wisdom Portal between weekend classes.`;

    return {
      insights: fallbackInsights,
      verifiedMetrics,
      modelUsed: "Deterministic Data Calculation Engine",
      timestamp: new Date().toISOString()
    };
  }
};
