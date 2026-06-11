// RAYK GROUP — Assistant IA (fonction serverless)
// Compatible Vercel / Netlify (Node). Appelle un LLM via une API compatible OpenAI.
// La clé API reste SECRÈTE côté serveur (variable d'environnement). Ne jamais la mettre dans index.html.
//
// Variables d'environnement à définir sur Vercel :
//   LLM_API_KEY   = votre clé (ex. clé Groq gratuite : gsk_...)
//   LLM_BASE_URL  = https://api.groq.com/openai/v1      (Groq, gratuit — par défaut)
//   LLM_MODEL     = llama-3.3-70b-versatile             (par défaut)
//
// Pour utiliser OpenAI : LLM_BASE_URL=https://api.openai.com/v1 , LLM_MODEL=gpt-4o-mini
// Pour utiliser Gemini (compat OpenAI) : LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai , LLM_MODEL=gemini-1.5-flash

const SYSTEM_PROMPT = `Tu es l'assistant commercial de RAYK GROUP, un studio digital basé au Sénégal.
Tu réponds aux clients de façon chaleureuse, professionnelle, claire et BRÈVE (2 à 4 phrases maximum).
Tu écris en français. Si le client écrit en wolof ou en anglais, réponds dans sa langue.
Tu ne dois jamais inventer de service ou de prix qui ne sont pas dans la liste ci-dessous.

RAYK GROUP propose 4 métiers :
1) Sites web — site vitrine simple : 50 000 FCFA ; site vitrine pro (SEO) : 120 000 à 175 000 FCFA ; boutique e-commerce (Orange Money, Wave, carte) : 250 000 à 450 000 FCFA ; maintenance + hébergement : 25 000 à 40 000 FCFA/an.
2) Identité QR — carte de visite digitale à QR code : 3 000 à 7 000 FCFA ; menu QR pour restaurant/café : 10 000 à 25 000 FCFA.
3) Contenu vidéo & réseaux (abonnement mensuel) — Découverte (4 vidéos + 8 posts) : 25 000 à 40 000 FCFA/mois ; Croissance (8 vidéos + reporting) : 60 000 à 100 000 FCFA/mois ; Premium (stratégie + pub Meta) : 150 000 à 250 000 FCFA/mois ; vidéo à l'unité : 7 000 à 15 000 FCFA.
4) Assistant IA WhatsApp (répond automatiquement aux clients 24h/24) : 15 000 FCFA/mois + 25 000 FCFA d'installation, réponses illimitées.

OFFRE PHARE — Pack Lancement : site vitrine + carte de visite QR + 4 vidéos pour 89 000 FCFA (au lieu de 130 000 FCFA), paiement unique.

Atouts à mettre en avant : prix les plus bas du marché, proximité (on se déplace et on filme le commerce), rapidité (devis sous 48h), tout-en-un.
Paiement accepté : Orange Money, Wave, espèces, virement.

Ton objectif : comprendre le besoin du client, recommander la bonne prestation avec le prix, puis l'inviter à demander un devis gratuit sur WhatsApp au +221 77 335 25 76. Termine souvent par une question ou une proposition d'étape suivante.`;

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    // lecture du corps (compatible Vercel & Netlify)
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    if (!body) {
      let raw = ''; await new Promise(r => { req.on('data', c => raw += c); req.on('end', r); });
      try { body = JSON.parse(raw || '{}'); } catch (e) { body = {}; }
    }
    const history = Array.isArray(body.messages) ? body.messages.slice(-10) : [];

    const KEY = process.env.LLM_API_KEY;
    const BASE = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
    const MODEL = process.env.LLM_MODEL || 'llama-3.3-70b-versatile';
    if (!KEY) { res.status(500).json({ error: 'Clé API non configurée (LLM_API_KEY).' }); return; }

    const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history];

    const r = await fetch(BASE + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY },
      body: JSON.stringify({ model: MODEL, messages: messages, temperature: 0.4, max_tokens: 400 })
    });
    if (!r.ok) {
      const t = await r.text();
      res.status(502).json({ error: 'Erreur fournisseur IA', detail: t.slice(0, 300) });
      return;
    }
    const data = await r.json();
    const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "Désolé, je n'ai pas pu répondre. Écrivez-nous sur WhatsApp au +221 77 335 25 76.";
    res.status(200).json({ reply: reply });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur', detail: String(e).slice(0, 200) });
  }
};
