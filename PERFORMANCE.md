# Controllo prestazioni — 1 ottobre 2026

Aggiornamento successivo: ripristinato l'effetto originale del personaggio
semitrasparente sotto le chiome, mantenendo gli alberi opachi. I controlli
alberi/nemici descritti nel benchmark sono stati eliminati; i numeri sotto
documentano la versione misurata prima di questo ripristino. Il test prestazioni
verifica ora anche chiome opache e opacità del personaggio pari a 0,36 sotto
gli alberi e 1 fuori dalla chioma.

Verifica con Edge headless, scena nel bioma ovest, mappa e casualità controllate,
sei armi di livello 3 e gruppi iniziali di 60, 250 e 800 nemici. Desktop:
1280×800, DPR 1. Mobile emulato: 390×844, DPR 2, touch, CPU rallentata 4×.
Tre qualità grafiche (0, 2, 3), 60 fotogrammi di riscaldamento e 60 campioni
per ciascuna combinazione. Il giocatore è invulnerabile; i nemici hanno molti
punti vita per mantenere il carico. La simulazione avanza di 1/60 s per campione.

I numeri misurano il tempo CPU di aggiornamento, invio dei comandi di disegno e
aggiornamento dell'interfaccia. Non sono FPS reali, tempi GPU completi o misure
su telefoni fisici. Ogni gruppo viene simulato consecutivamente nelle tre qualità:
il confronto tra qualità è indicativo, perché posizioni ed effetti evolvono.

## Risultati dopo le correzioni

Qualità massima, millisecondi per campione; P95 è il valore entro cui cade il 95%
dei campioni. Per 60 FPS il budget complessivo è circa 16,7 ms, per 30 FPS 33,3 ms.

| Ambiente | Nemici iniziali | Mediana | P95 |
|---|---:|---:|---:|
| Desktop | 60 | 3,6 ms | 5,5 ms |
| Desktop | 250 | 7,5 ms | 10,7 ms |
| Desktop | 800 | 16,6 ms | 25,0 ms |
| Mobile emulato, CPU 4× | 60 | 13,0 ms | 25,5 ms |
| Mobile emulato, CPU 4× | 250 | 25,9 ms | 35,2 ms |
| Mobile emulato, CPU 4× | 800 | 72,0 ms | 85,3 ms |

Desktop: buon margine nelle scene ordinarie; 800 nemici con sei armi superano il
budget nei campioni più lenti. Mobile: 60 FPS non sono garantiti neppure nel caso
leggero; con 250 nemici il carico si avvicina al budget di 30 FPS. Il caso 800 è
troppo pesante per la CPU emulata. La riduzione della qualità aiuta gli effetti,
ma non risolve da sola il carico della simulazione.

## Correzioni applicate

- Alberi: calcolo una sola volta i nemici entro 320 pixel dal giocatore e il loro
  rettangolo complessivo. Le chiome lontane saltano il controllo dell'intera orda.
  La regola di trasparenza resta identica. Nel confronto desktop con 250 nemici,
  il solo passaggio alberi scende da 7,3 a 1,3 ms mediani. Il confronto riutilizza
  il vecchio passaggio alberi sulla stessa configurazione del test.
- Terreno: cache con limite basato sui pixel, riferimento di 256 MiB su mobile
  e 384 MiB su desktop, più la riserva minima per l'anello di caricamento.
  La riserva può prevalere sui budget con viewport molto grandi. Su mobile DPR 2
  il limite verificato è 64 immagini (256 MiB), rispetto alle precedenti 300
  immagini potenziali (1200 MiB). Le immagini usate di recente vengono conservate.
  Questi valori stimano solo i pixel RGBA: non includono copie GPU o altre cache.
- Qualità automatica: nessuna risalita durante pausa o fine partita; dopo ogni
  cambio riparte il periodo di osservazione, evitando cambi consecutivi prematuri.
- Nuova partita: elimino anche i dati dell'erba derivati dal vecchio seme della
  mappa, comprese le posizioni registrate come prive di erba.

## Punti ancora da ottimizzare

1. Orde molto dense: sul mobile emulato con 800 nemici, il passaggio nemici costa
   circa 30 ms mediani. Priorità a collisioni, separazione e risoluzione degli
   incastri. Un eventuale limite mobile al numero di nemici va valutato anche per
   il suo effetto sul bilanciamento.
2. Caricamento e cambio verso qualità minima: ricostruire immagini del terreno
   introduce picchi. Nel test mobile il massimo di transizione raggiunge circa
   160 ms nel caso estremo; il primo ingresso nella scena forestale arriva a
   circa 420 ms. Servono un caricamento più graduale o un maggiore preriscaldamento.
3. Interfaccia: la prima creazione delle sei icone può causare un picco isolato
   (circa 91 ms nella CPU mobile emulata). Dopo la creazione il costo mediano
   resta circa 0,4 ms. È candidata al preriscaldamento durante il caricamento.
4. Erba: 2,4–7,2 ms mediani per il passaggio di disegno nel mobile emulato, secondo
   la scena. Questi valori non rappresentano il tempo GPU effettivo. Le impronte
   restano limitate a 512 celle, gli upload sono distanziati e la texture riusata.
5. Validazione finale su un telefono reale, includendo una partita lunga,
   rotazione dello schermo, consumo energetico e riscaldamento.

## Verifiche

`node tools/check-performance.cjs` produce `artifacts/performance.json`.
`node tools/verify-performance.cjs` verifica equivalenza della trasparenza su
114 chiome nel run eseguito, limite cache mobile, riuso delle immagini, recupero
della qualità, pausa e pulizia delle cache dell'erba.

Passano anche `tools/verify-game.cjs` (12 ricette, 9 controlli di comportamento
delle armi, rarità, esplorazione e rendering) e `tools/verify-mobile-grass.cjs`
(47 impronte in due secondi, deformazione effettiva WebGL, upload limitati,
texture riusata, limite memoria e fallback Canvas). Nessun errore JavaScript
nei test e nei benchmark completati.

Playwright viene caricato dalla dipendenza locale se disponibile o dal runtime
Codex; i test richiedono Edge installato. Le misure sono diagnostiche e non
costituiscono una garanzia di prestazioni su tutti i dispositivi.
