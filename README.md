# Shadow Survivors

Apri `index.html` in un browser moderno. Il gioco salva i progressi permanenti nel browser.

## Revisione grafica e gameplay

- Interfaccia dark fantasy, carte e icone con cornici coerenti; armi evolute segnalate da un diamante dorato.
- Venti archetipi di ombre viventi: nucleo nero denso, sagome sfrangiate, filamenti e fumo animati, occhi pallidi. Sagome e animazioni restano disponibili a ogni qualità grafica; il lampo dei colpi segue il corpo.
- Tronchi e chiome separati; personaggio, nemici e chiome ordinati per profondità. Le chiome diventano trasparenti vicino al giocatore e alle minacce.
- Pavimentazione delle rovine con pietre, muschio e iscrizioni; fili d'erba con le palette originali.
- Proiettili ostili riconoscibili tramite diamanti rossi con bordi chiari, visibili anche davanti alle chiome.
- Scia d'erba schiacciata anche su mobile: campionamento ogni 80–120 ms durante il movimento, massimo tre impronte per campione, maschera limitata a 512 caselle e caricamenti GPU raggruppati. La qualità minima sospende l'effetto; una nuova partita azzera la scia.
- Obiettivo nel HUD: cuore da raggiungere, distanza in caselle, arma ottenibile e conto alla rovescia del guardiano.
- Santuari facoltativi lungo i percorsi: resta nel cerchio per sei secondi, anche non consecutivi, per ottenere 8 frammenti, 15% di cura ed esperienza. Ogni santuario paga una volta per partita.
- Difficoltà legata al livello: `min(max(livello - 1, 0), 30) * 0.12`; resta la crescita legata al tempo.
- Fortuna: probabilità normalizzate e limitate. Le carte leggendarie passano dal 7% senza fortuna a circa 15,9% con fortuna pari a 100% o superiore.

## Evoluzioni

Le coppie arma/passiva della guida conservano i bonus precedenti e aggiungono:

| Ricetta | Comportamento |
| --- | --- |
| Stormcaller | Due ramificazioni aggiuntive per bersaglio del fulmine |
| Inferno | Zone di fuoco persistenti dopo le esplosioni |
| Winter Guard | Tre schegge di ghiaccio orbitanti che danneggiano e rallentano |
| Soul Drinker | Una scia cremisi persistente davanti alla falce |
| Aegis | Gli scudi respingono i nemici comuni |
| Zephyr | Maggiore distanza dei boomerang |
| Bloom | Il veleno rallenta i nemici |
| Aberrance | Esplosione alla chiusura dei varchi |
| Spiked | I denti della sega respingono i nemici comuni |
| Bastion | Le torrette sparano tre colpi a ventaglio |
| Mystic Gaze | Le stelle attraversano più bersagli |
| Scourge | Tre rimbalzi extra e maggiore distanza dei frammenti |

`F2` apre il menu di sviluppo; `F4` mostra o nasconde FPS e pulsante di sviluppo.

## Verifica

`tools/verify-game.cjs` esegue una prova in Edge con Playwright: avvio, rarità, ricette, comportamenti delle armi, ricompense, tutti i biomi, quattro livelli grafici e viewport mobile. Salva le schermate in `artifacts/`.

Le verifiche usano Playwright disponibile nel progetto oppure il runtime locale di Codex. Le schermate generate restano escluse da Git.

Il bilanciamento va ulteriormente valutato con partite complete e build diverse; la verifica automatica controlla il funzionamento dei sistemi.
