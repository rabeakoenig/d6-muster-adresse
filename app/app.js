"use strict";

// Regeln:
// 1. Ein Hund hat je Fenster höchstens eine Runde.
// 2. Freiwillige machen am Tag höchstens zwei Runden.
// 3. Die Stufe des Hundes darf die Erfahrung der Freiwilligen nicht übersteigen
//    (Einsteiger führen nur Einsteiger-Hunde aus, Geübte Einsteiger und Geübte, Erfahrene alle).
var SPEICHER = "gassi-v1";
var runden = laden();

function laden() {
  try {
    var roh = localStorage.getItem(SPEICHER);
    if (roh) return JSON.parse(roh);
  } catch (e) { /* ohne Speicher weiter */ }
  return [];
}

function speichern() {
  try { localStorage.setItem(SPEICHER, JSON.stringify(runden)); } catch (e) { /* egal */ }
}

function fuelle(id, werte, beschriftung) {
  var sel = document.getElementById(id);
  werte.forEach(function (w, i) {
    var o = document.createElement("option");
    o.value = String(i);
    o.textContent = beschriftung(w);
    sel.appendChild(o);
  });
}

function zeigeHinweis(text) {
  var h = document.getElementById("hinweis");
  h.textContent = text;
  h.hidden = !text;
}

function stufenIndex(stufe) {
  return STUFEN.indexOf(stufe);
}

// Auswahl der Hunde: mit dem Schalter nur die, deren Stufe die Erfahrung nicht übersteigt.
function fuelleHunde() {
  var sel = document.getElementById("hund");
  var nur = document.getElementById("nur-passend").checked;
  var erfahrung = STUFEN[Number(document.getElementById("erfahrung").value)];
  var gewaehlt = sel.value;
  sel.innerHTML = "";
  HUNDE.forEach(function (h, i) {
    if (nur && stufenIndex(h.stufe) > stufenIndex(erfahrung)) return;
    var o = document.createElement("option");
    o.value = String(i);
    o.textContent = h.name + " (" + h.stufe + ")";
    sel.appendChild(o);
  });
  if (gewaehlt) sel.value = gewaehlt;
}

function pruefe(hund, tag, fenster, kuerzel, erfahrung) {
  var gleichesFenster = runden.filter(function (r) { return r.tag === tag && r.fenster === fenster && r.hundId === hund.id; });
  if (gleichesFenster.length > 0) return hund.name + " hat in diesem Fenster schon eine Runde (ein Hund, ein Fenster).";
  var amTag = runden.filter(function (r) { return r.tag === tag && r.kuerzel === kuerzel; });
  if (amTag.length >= 2) return kuerzel + " hat an diesem Tag schon zwei Runden.";
  if (stufenIndex(hund.stufe) > stufenIndex(erfahrung)) return hund.name + " ist für die Erfahrung " + erfahrung + " zu anspruchsvoll.";
  return "";
}

function eintragen(e) {
  e.preventDefault();
  var hund = HUNDE[Number(document.getElementById("hund").value)];
  var tag = TAGE[Number(document.getElementById("tag").value)];
  var fenster = FENSTER[Number(document.getElementById("fenster").value)];
  var kuerzel = KUERZEL[Number(document.getElementById("kuerzel").value)];
  var erfahrung = STUFEN[Number(document.getElementById("erfahrung").value)];
  var fehler = pruefe(hund, tag, fenster, kuerzel, erfahrung);
  if (fehler) { zeigeHinweis(fehler); return; }
  zeigeHinweis("");
  runden.push({ hundId: hund.id, tag: tag, fenster: fenster, kuerzel: kuerzel });
  speichern();
  zeichne();
}

function hundName(id) {
  return HUNDE.filter(function (h) { return h.id === id; })[0].name;
}

function zeichne() {
  var woche = document.getElementById("woche");
  woche.innerHTML = "";
  TAGE.forEach(function (tag) {
    var box = document.createElement("div");
    box.className = "tag";
    var h = document.createElement("h3");
    h.textContent = tag;
    box.appendChild(h);
    FENSTER.forEach(function (fenster) {
      var eintraege = runden.filter(function (r) { return r.tag === tag && r.fenster === fenster; })
        .map(function (r) { return hundName(r.hundId) + " (" + r.kuerzel + ")"; });
      var p = document.createElement("p");
      p.textContent = fenster + ": " + (eintraege.length ? eintraege.join(", ") : "noch frei");
      box.appendChild(p);
    });
    woche.appendChild(box);
  });
}

function zuruecksetzen() {
  runden = [];
  try { localStorage.removeItem(SPEICHER); } catch (e) { /* egal */ }
  zeigeHinweis("");
  zeichne();
}

// Der Kasten „Frag das Tierheim“ erscheint nur, wenn die Funktion /api/frage erreichbar ist (nicht per Doppelklick).
function pruefeFunktion() {
  if (location.protocol !== "http:" && location.protocol !== "https:") return;
  fetch("/api/frage").then(function (r) { return r.json(); }).then(function (d) {
    if (d && d.eingerichtet) document.getElementById("frage-kasten").hidden = false;
  }).catch(function () { /* bleibt unsichtbar */ });
}

function fragen() {
  var frage = document.getElementById("frage").value;
  var ziel = document.getElementById("antwort");
  ziel.textContent = "…";
  fetch("/api/frage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ frage: frage }) })
    .then(function (r) { return r.json(); })
    .then(function (d) { ziel.textContent = d.antwort || d.fehler || "Keine Antwort."; })
    .catch(function () { ziel.textContent = "Keine Verbindung."; });
}

fuelle("tag", TAGE, function (t) { return t; });
fuelle("fenster", FENSTER, function (f) { return f; });
fuelle("kuerzel", KUERZEL, function (k) { return k; });
fuelle("erfahrung", STUFEN, function (s) { return s; });
fuelleHunde();
document.getElementById("erfahrung").addEventListener("change", fuelleHunde);
document.getElementById("nur-passend").addEventListener("change", fuelleHunde);
document.getElementById("formular").addEventListener("submit", eintragen);
document.getElementById("zuruecksetzen").addEventListener("click", zuruecksetzen);
document.getElementById("frage-senden").addEventListener("click", fragen);
zeichne();
pruefeFunktion();
