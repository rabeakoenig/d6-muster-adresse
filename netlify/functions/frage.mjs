// Frag das Tierheim: beantwortet eine kurze Frage zu den Hausregeln des Tierheims Birkenhof (erfundener Fall).
// Die Frage geht an die Gemini-API von Google (kostenloser Schlüssel aus Google AI Studio). Der Schlüssel kommt aus der Umgebung
// (GEMINI_API_KEY), nie aus dem Code: lokal aus der Datei .env, auf Netlify aus den Environment Variables.
// In D1 wird die Funktion nur angelegt, benutzt wird sie ab D3.

// Modellname (laut Google-Doku am 25.11.2026): am Gerät prüfen. Anderer Name: Variable GEMINI_MODELL setzen.
const MODELL = process.env.GEMINI_MODELL || "gemini-3.1-flash-lite";

const REGELN = `Hausregeln des Tierheims Birkenhof (erfunden):
1. Gassi-Runden dauern höchstens 45 Minuten.
2. Hunde werden nur mit der Leine des Tierheims geführt.
3. Die Stufe des Hundes darf die Erfahrung der Freiwilligen nicht übersteigen.
4. Ein Hund hat je Zeitfenster höchstens eine Runde.
5. Freiwillige machen am Tag höchstens zwei Runden.
6. Gefüttert wird nur nach Absprache mit der Leitung.
7. Nach jeder Runde wird die Leine desinfiziert und der Hund bekommt frisches Wasser.
8. Bei Verletzungen oder Beißvorfällen sofort die Leitung rufen.`;

const ANWEISUNG = `Du beantwortest Fragen von Freiwilligen des Tierheims Birkenhof zu den Hausregeln.
Antworte auf Deutsch, per du, in höchstens drei Sätzen und nur mit den Regeln unten.
Steht etwas nicht in den Regeln, sag das und verweise an die Leitung.

${REGELN}`;

export default async (req) => {
  const schluessel = process.env.GEMINI_API_KEY;

  // GET: Ist die Funktion eingerichtet? Verrät nie den Schlüssel selbst.
  if (req.method === "GET") {
    return Response.json({ eingerichtet: Boolean(schluessel) });
  }
  if (req.method !== "POST") {
    return Response.json({ fehler: "Nur GET und POST." }, { status: 405 });
  }
  if (!schluessel) {
    return Response.json({ fehler: "Noch nicht eingerichtet: GEMINI_API_KEY fehlt." }, { status: 503 });
  }

  let frage;
  try {
    ({ frage } = await req.json());
  } catch {
    return Response.json({ fehler: "Die Anfrage ist kein gültiges JSON." }, { status: 400 });
  }
  if (typeof frage !== "string" || !frage.trim() || frage.length > 300) {
    return Response.json({ fehler: "Bitte eine Frage mit 1 bis 300 Zeichen." }, { status: 400 });
  }

  let antwort;
  try {
    antwort = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "x-goog-api-key": schluessel, "Api-Revision": "2026-05-20", "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODELL, input: frage.trim(), system_instruction: ANWEISUNG, generation_config: { max_output_tokens: 400 } }),
    });
  } catch {
    return Response.json({ fehler: "Keine Verbindung zum KI-Dienst." }, { status: 502 });
  }

  if (antwort.status === 400 || antwort.status === 401 || antwort.status === 403) return Response.json({ fehler: "Der Schlüssel ist ungültig, gesperrt oder nicht freigeschaltet." }, { status: 502 });
  if (antwort.status === 429) return Response.json({ fehler: "Das kostenlose Limit ist gerade erreicht. Versuch es gleich noch einmal." }, { status: 429 });
  if (!antwort.ok) return Response.json({ fehler: `Der Dienst hat einen Fehler gemeldet (${antwort.status}).` }, { status: 502 });

  const daten = await antwort.json();
  const text = (daten.steps ?? [])
    .filter((schritt) => schritt.type === "model_output")
    .flatMap((schritt) => schritt.content ?? [])
    .filter((stueck) => stueck.type === "text")
    .map((stueck) => stueck.text)
    .join("\n")
    .trim();
  if (!text) return Response.json({ fehler: "Keine Antwort erhalten. Frag bitte die Leitung." }, { status: 502 });
  return Response.json({ antwort: text });
};

export const config = { path: "/api/frage" };
