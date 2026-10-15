import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Coins, PlayCircle, ShoppingBag, Volume2, VolumeX } from 'lucide-react';

// --- SISTEMA DE AUDIO SINTETIZADO (Web Audio API) ---
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playCardSlide() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playGrito() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(400, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playCoin() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }
}

const sounds = new SoundEngine();

// --- BARAJA ESPAÑOLA Y VALORES DE TRUCO ---
const PALOS = ['Espadas', 'Bastos', 'Oro', 'Copa'];
const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
const PUNTOS_PARTIDO = 30;

const PALO_ICONOS = {
  Espadas: '⚔️',
  Bastos: '🪵',
  Oro: '🪙',
  Copa: '🍷'
};

const getHierarchyPower = (card) => {
  if (card.number === 1 && card.suit === 'Espadas') return 14; // Ancho de Espadas
  if (card.number === 1 && card.suit === 'Bastos') return 13;  // Ancho de Bastos
  if (card.number === 7 && card.suit === 'Espadas') return 12; // 7 de Espadas
  if (card.number === 7 && card.suit === 'Oro') return 11;     // 7 de Oro
  if (card.number === 3) return 10;
  if (card.number === 2) return 9;
  if (card.number === 1) return 8; // Anchos falsos
  if (card.number === 12) return 7;
  if (card.number === 11) return 6;
  if (card.number === 10) return 5;
  if (card.number === 7) return 4;
  if (card.number === 6) return 3;
  if (card.number === 5) return 2;
  if (card.number === 4) return 1;
  return 0;
};

function TallyMarks({ score }) {
  const groups = Math.ceil(score / 5);

  return (
    <div
      className="flex min-h-6 flex-wrap justify-center gap-1"
      role="img"
      aria-label={`${score} puntos contados con palitos`}
    >
      {Array.from({ length: groups }, (_, groupIndex) => {
        const marksInGroup = Math.min(5, score - groupIndex * 5);
        return (
          <svg key={groupIndex} viewBox="0 0 20 22" className="h-6 w-5 text-amber-200">
            {Array.from({ length: Math.min(marksInGroup, 4) }, (_, markIndex) => (
              <line
                key={markIndex}
                x1={3 + markIndex * 4}
                y1="3"
                x2={3 + markIndex * 4}
                y2="19"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            ))}
            {marksInGroup === 5 && (
              <line
                x1="1"
                y1="18"
                x2="17"
                y2="4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        );
      })}
      {score === 0 && <span className="text-xs text-amber-200/50">—</span>}
    </div>
  );
}

function PlayedCard({ card, compact = false }) {
  return (
    <div
      className={`flex shrink-0 flex-col items-center justify-between rounded-lg border border-amber-600 bg-amber-50 text-amber-950 shadow-lg ${
        compact ? 'h-12 w-8 p-0.5 text-[9px]' : 'h-24 w-16 p-1.5 md:h-28 md:w-20'
      }`}
      role="img"
      aria-label={`${card.number} de ${card.suit}`}
    >
      <div className="flex w-full justify-between font-black">
        <span>{card.number}</span>
        <span>{PALO_ICONOS[card.suit]}</span>
      </div>
      <div className={compact ? 'text-sm' : 'text-2xl'}>{PALO_ICONOS[card.suit]}</div>
      <div className="flex w-full rotate-180 justify-between font-black">
        <span>{card.number}</span>
        <span>{PALO_ICONOS[card.suit]}</span>
      </div>
    </div>
  );
}

function PlayedHistory({ cards, latestCard, label }) {
  const historyRef = useRef(null);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollLeft = historyRef.current.scrollWidth;
    }
  }, [cards.length]);

  return (
    <div className="w-1/2 min-w-0 flex-1 rounded-lg bg-black/25 px-2 py-1">
      <div className="mb-1 flex justify-between text-[9px] font-bold uppercase tracking-wider text-amber-200/70">
        <span>{label} · mano</span>
        <span>{cards.length}</span>
      </div>
      <div
        ref={historyRef}
        className="flex min-h-12 w-full min-w-0 max-w-full gap-1 overflow-x-auto overscroll-x-contain pb-1"
        aria-label={`${label}: ${cards.length} cartas jugadas`}
        role="group"
      >
        {cards.length === 0
          ? <span className="self-center text-[10px] text-amber-100/40">Todavía no hay cartas</span>
          : cards.map((card, index) => (
            <div
              key={`${card.id}-${index}`}
              className={index === cards.length - 1 && card.id === latestCard?.id
                ? 'rounded-md ring-2 ring-yellow-300'
                : ''}
            >
              <PlayedCard card={card} compact />
            </div>
          ))}
      </div>
    </div>
  );
}

const createDeck = () => {
  const newDeck = [];
  PALOS.forEach(suit => {
    NUMEROS.forEach(number => {
      newDeck.push({ suit, number, id: `${number}-${suit}` });
    });
  });
  return newDeck.sort(() => Math.random() - 0.5);
};

// --- AVATARES HISTÓRICOS Y RIVALES ---
const PROCERES = [
  {
    id: 'san_martin',
    nombre: 'José de San Martín',
    titulo: 'El Padre de la Patria',
    avatar: '⚔️',
    color: 'from-blue-900 to-indigo-950',
    frases: ['La libertad se gana con coraje.', 'No retruco por orgullo, sino por la Patria.', '¡A la carga!'],
    recompensa: 100
  },
  {
    id: 'belgrano',
    nombre: 'Manuel Belgrano',
    titulo: 'Creador de la Bandera',
    avatar: '📜',
    color: 'from-sky-700 to-blue-900',
    frases: ['Sirvo a la patria sin esperar nada a cambio.', 'Este envido tiene los colores del cielo.'],
    recompensa: 80
  },
  {
    id: 'guemes',
    nombre: 'Martín Miguel de Güemes',
    titulo: 'Héroe de la Frontera',
    avatar: '🐎',
    color: 'from-red-900 to-amber-950',
    frases: ['¡Mis gauchos no se rinden jamás!', 'Sienta el filo de este Truco.'],
    recompensa: 120
  },
  {
    id: 'fierro',
    nombre: 'Martín Fierro',
    titulo: 'El Gaucho Cantor',
    avatar: '🎸',
    color: 'from-amber-800 to-yellow-950',
    frases: ['El gaucho en su campo es rey.', 'Aquí me pongo a cantar al compás de la vigüela...'],
    recompensa: 90
  }
];

export default function App() {
  // --- ESTADOS DE JUEGO ---
  const [coins, setCoins] = useState(250);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentRivalIndex, setCurrentRivalIndex] = useState(0);
  const [showShop, setShowShop] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [powersUnlocked, setPowersUnlocked] = useState({ mateEspia: 2, faconEnvido: 1 });
  
  // Marcador y Puntos
  const [playerPoints, setPlayerPoints] = useState(0);
  const [cpuPoints, setCpuPoints] = useState(0);
  const [matchWinner, setMatchWinner] = useState(null);

  // Estado de Mano
  const [initialDeck] = useState(createDeck);
  const [playerHand, setPlayerHand] = useState(() => initialDeck.slice(0, 3));
  const [cpuHand, setCpuHand] = useState(() => initialDeck.slice(3, 6));
  const cpuHandRef = useRef(initialDeck.slice(3, 6));
  const [playedPlayerCards, setPlayedPlayerCards] = useState([]);
  const [playedCpuCards, setPlayedCpuCards] = useState([]);
  const [matchPlayedPlayerCards, setMatchPlayedPlayerCards] = useState([]);
  const [matchPlayedCpuCards, setMatchPlayedCpuCards] = useState([]);
  const handGeneration = useRef(0);
  const manoRef = useRef('player');
  
  // Flujo del Truco
  const [turn, setTurn] = useState('player'); // 'player' | 'cpu'
  const [roundWinners, setRoundWinners] = useState([]);
  const [dialogText, setDialogText] = useState('¡Empieza el partido, paisano!');
  
  // Cantos
  const [trucoState, setTrucoState] = useState(0); // 0: nada, 1: Truco (2pts), 2: Retruco (3pts), 3: Vale4 (4pts)
  const trucoStateRef = useRef(0);
  const trucoCallerRef = useRef(null);
  const [envidoPlayed, setEnvidoPlayed] = useState(false);
  const [pendingCall, setPendingCall] = useState(null);
  const queuedTrucoCallRef = useRef(null);
  const [mateUsed, setMateUsed] = useState(false);
  const [revealedCpuCard, setRevealedCpuCard] = useState(null);

  const rival = PROCERES[currentRivalIndex];

  const getFaltaPoints = () => {
    if (playerPoints > 15 && cpuPoints > 15) {
      return PUNTOS_PARTIDO - Math.max(playerPoints, cpuPoints);
    }
    return PUNTOS_PARTIDO;
  };

  const awardPoints = (winner, points) => {
    if (matchWinner) return true;

    const newScore = (winner === 'player' ? playerPoints : cpuPoints) + points;
    if (winner === 'player') setPlayerPoints(newScore);
    else setCpuPoints(newScore);

    if (newScore < PUNTOS_PARTIDO) return false;

    handGeneration.current += 1;
    setMatchWinner(winner);
    setPendingCall(null);
    queuedTrucoCallRef.current = null;
    setTurn('finished');
    if (winner === 'player') {
      setCoins(previous => previous + rival.recompensa);
      setDialogText(`¡Ganaste el partido! Recibís ${rival.recompensa} monedas.`);
    } else {
      setDialogText(`${rival.nombre} ganó el partido. ¡A jugar la revancha!`);
    }
    return true;
  };

  const scheduleForHand = (callback, delay) => {
    const generation = handGeneration.current;
    setTimeout(() => {
      if (generation === handGeneration.current) callback();
    }, delay);
  };

  // --- INICIALIZAR BARAJA ---
  const startNewHand = () => {
    handGeneration.current += 1;
    const nextMano = manoRef.current === 'player' ? 'cpu' : 'player';
    manoRef.current = nextMano;
    const d = createDeck();
    setPlayerHand([d[0], d[1], d[2]]);
    setCpuHand([d[3], d[4], d[5]]);
    cpuHandRef.current = [d[3], d[4], d[5]];
    setPlayedPlayerCards([]);
    setPlayedCpuCards([]);
    setMatchPlayedPlayerCards([]);
    setMatchPlayedCpuCards([]);
    setRoundWinners([]);
    setTrucoState(0);
    trucoStateRef.current = 0;
    trucoCallerRef.current = null;
    setEnvidoPlayed(false);
    setPendingCall(null);
    queuedTrucoCallRef.current = null;
    setMateUsed(false);
    setRevealedCpuCard(null);
    setTurn(nextMano);
    setDialogText(`Le toca jugar. ¡Muestre sus cartas!`);

    const cpuEnvido = calculateEnvido([d[3], d[4], d[5]]);
    if (cpuEnvido >= 28) {
      scheduleForHand(() => {
        setPendingCall({
          type: 'envido',
          from: 'cpu',
          resumeTurn: nextMano,
          stake: 2,
          refusedPoints: 1,
        });
        setDialogText(`${rival.nombre} canta Envido (${cpuEnvido}). ¿Quiere?`);
      }, 500);
    } else if (nextMano === 'cpu') {
      scheduleForHand(() => cpuTurn([], [], []), 500);
    }
  };

  // --- LÓGICA DE ENVIDO ---
  const calculateEnvido = (hand) => {
    const bySuit = {};
    hand.forEach(c => {
      if (!bySuit[c.suit]) bySuit[c.suit] = [];
      bySuit[c.suit].push(c.number >= 10 ? 0 : c.number);
    });

    let maxEnvido = 0;
    Object.keys(bySuit).forEach(suit => {
      const cards = bySuit[suit];
      if (cards.length >= 2) {
        cards.sort((a, b) => b - a);
        const env = 20 + cards[0] + cards[1];
        if (env > maxEnvido) maxEnvido = env;
      } else if (cards.length === 1) {
        if (cards[0] > maxEnvido) maxEnvido = cards[0];
      }
    });
    return maxEnvido;
  };

  // --- JUGAR CARTA ---
  const playCard = (cardIndex) => {
    if (turn !== 'player' || pendingCall || matchWinner) return;
    sounds.playCardSlide();

    const card = playerHand[cardIndex];
    if (!card) return;
    const newPlayerHand = playerHand.filter((_, i) => i !== cardIndex);
    const newPlayed = [...playedPlayerCards, card];

    setPlayerHand(newPlayerHand);
    setPlayedPlayerCards(newPlayed);
    setMatchPlayedPlayerCards(previous => [...previous, card]);

    if (playedCpuCards.length === 0) {
      setTurn('cpu');
      scheduleForHand(() => cpuTurn(newPlayed, []), 800);
    } else {
      resolveRound(newPlayed, playedCpuCards);
    }
  };

  // --- TURNO IA CPU ---
  const cpuTurn = (pCards = playedPlayerCards, cCards = playedCpuCards, handWinners = roundWinners) => {
    const hand = cpuHandRef.current;
    if (hand.length === 0) return;

    const bestPower = Math.max(...hand.map(getHierarchyPower));
    const shouldCallTruco = trucoStateRef.current < 3
      && (trucoStateRef.current === 0 || trucoCallerRef.current === 'player')
      && (bestPower >= 13 || (bestPower >= 11 && handWinners.length > 0));
    if (shouldCallTruco) {
      setPendingCall({
        type: 'truco',
        from: 'cpu',
        level: trucoStateRef.current + 1,
        resumeTurn: 'cpu',
      });
      trucoCallerRef.current = 'cpu';
      setTurn('player');
      setDialogText(`${rival.nombre} canta ${['Truco', 'Retruco', 'Vale cuatro'][trucoStateRef.current]}. ¿Quiere?`);
      return;
    }

    sounds.playCardSlide();

    const playerCard = pCards.at(-1);
    const playable = hand
      .map((card, index) => ({ card, index, power: getHierarchyPower(card) }))
      .sort((a, b) => a.power - b.power);
    const chosen = playerCard
      ? playable.find(({ power }) => power > getHierarchyPower(playerCard)) ?? playable[0]
      : playable[0];
    const card = chosen.card;
    const newCpuHand = hand.filter((_, index) => index !== chosen.index);
    const newPlayed = [...cCards, card];

    setCpuHand(newCpuHand);
    cpuHandRef.current = newCpuHand;
    setPlayedCpuCards(newPlayed);
    setMatchPlayedCpuCards(previous => [...previous, card]);

    if (pCards.length > cCards.length) {
      resolveRound(pCards, newPlayed);
    } else {
      setTurn('player');
    }
  };

  // --- RESOLVER RONDA ---
  const resolveRound = (pCards, cCards) => {
    const pCard = pCards[pCards.length - 1];
    const cCard = cCards[cCards.length - 1];

    const pPower = getHierarchyPower(pCard);
    const cPower = getHierarchyPower(cCard);

    let winner = 'tie';
    if (pPower > cPower) winner = 'player';
    else if (cPower > pPower) winner = 'cpu';

    const newWinners = [...roundWinners, winner];
    setRoundWinners(newWinners);

    const playerWins = newWinners.filter(roundWinner => roundWinner === 'player').length;
    const cpuWins = newWinners.filter(roundWinner => roundWinner === 'cpu').length;
    let handWinner = null;

    if (playerWins === 2) handWinner = 'player';
    else if (cpuWins === 2) handWinner = 'cpu';
    else if (newWinners.length === 2) {
      if (newWinners[0] === 'tie' && newWinners[1] !== 'tie') {
        handWinner = newWinners[1];
      } else if (newWinners[0] !== 'tie'
        && (newWinners[1] === 'tie' || newWinners[0] === newWinners[1])) {
        handWinner = newWinners[0];
      }
    } else if (newWinners.length === 3) {
      handWinner = newWinners.find(roundWinner => roundWinner !== 'tie') ?? manoRef.current;
    }

    if (handWinner) {
      const points = trucoStateRef.current === 0 ? 1 : trucoStateRef.current + 1;
      if (handWinner === 'player') {
        const matchFinished = awardPoints('player', points);
        setDialogText(`¡Ganaste la mano! +${points} puntos.`);
        if (matchFinished) {
          setDialogText(`¡Ganaste el partido! Recibís ${rival.recompensa} monedas.`);
          return;
        }
      } else {
        const matchFinished = awardPoints('cpu', points);
        setDialogText(`${rival.nombre} se lleva la mano. +${points} puntos.`);
        if (matchFinished) {
          setDialogText(`${rival.nombre} ganó el partido. ¡A jugar la revancha!`);
          return;
        }
      }
      scheduleForHand(startNewHand, 1800);
      return;
    }

    setTurn('resolving');
    scheduleForHand(() => {
      setPlayedPlayerCards([]);
      setPlayedCpuCards([]);
      const nextLeader = winner === 'tie' ? manoRef.current : winner;
      setTurn(nextLeader);
      if (nextLeader === 'cpu') scheduleForHand(() => cpuTurn([], [], newWinners), 500);
    }, 900);
  };

  // --- CANTAR TRUCO ---
  const answerTrucoCall = (call, accept) => {
    if (!accept) {
      const winner = call.from;
      const matchFinished = awardPoints(winner, call.level);
      setDialogText(matchFinished
        ? (winner === 'player'
          ? `¡Ganaste el partido! Recibís ${rival.recompensa} monedas.`
          : `${rival.nombre} ganó el partido. ¡A jugar la revancha!`)
        : `${winner === 'cpu' ? 'No quisiste' : `${rival.nombre} no quiso`} ${['Truco', 'Retruco', 'Vale cuatro'][call.level - 1]}. +${call.level} punto${call.level === 1 ? '' : 's'}.`);
      if (!matchFinished) scheduleForHand(startNewHand, 1500);
      return;
    }

    setTrucoState(call.level);
    trucoStateRef.current = call.level;
    trucoCallerRef.current = call.from;
    setDialogText(call.from === 'cpu' ? '¡Querés! Seguimos la mano.' : `${rival.nombre}: "¡Quiero!"`);
    setTurn(call.resumeTurn);
    if (call.resumeTurn === 'cpu') scheduleForHand(() => cpuTurn(), 600);
  };

  const answerEnvidoCall = (call, accept) => {
    const playerEnvido = calculateEnvido(playerHand);
    const opponentEnvido = calculateEnvido(cpuHand);
    const winner = accept
      ? (playerEnvido === opponentEnvido
        ? manoRef.current
        : playerEnvido > opponentEnvido ? 'player' : 'cpu')
      : call.from;
    const points = accept ? call.stake : call.refusedPoints;
    const matchFinished = awardPoints(winner, points);

    if (matchFinished) {
      setDialogText(winner === 'player'
        ? `¡Ganaste el partido! Recibís ${rival.recompensa} monedas.`
        : `${rival.nombre} ganó el partido. ¡A jugar la revancha!`);
      return true;
    }

    setDialogText(accept
      ? (winner === 'player'
        ? `¡Son buenas! Tu Envido: ${playerEnvido}. ${points} punto${points === 1 ? '' : 's'}.`
        : `${rival.nombre} gana el Envido: ${opponentEnvido} contra ${playerEnvido}. ${points} puntos.`)
      : `${call.from === 'cpu' ? 'No quisiste' : `${rival.nombre} no quiso`} el Envido. ${points} punto${points === 1 ? '' : 's'} para ${call.from === 'cpu' ? rival.nombre : 'vos'}.`);
    setEnvidoPlayed(true);
    const queuedCall = queuedTrucoCallRef.current;
    setPendingCall(queuedCall);
    queuedTrucoCallRef.current = null;
    setTurn(queuedCall ? 'player' : call.resumeTurn);
    if (!queuedCall && call.resumeTurn === 'cpu') {
      scheduleForHand(() => cpuTurn([], [], []), 500);
    }
    return false;
  };

  const scheduleCpuEnvidoAnswer = (call) => {
    const cpuEnvido = calculateEnvido(cpuHand);
    const accept = cpuEnvido >= (call.stake >= 5 ? 27 : 24);
    scheduleForHand(() => {
      setPendingCall(null);
      answerEnvidoCall(call, accept);
    }, 650);
  };

  const cantarTruco = () => {
    if (turn !== 'player' || pendingCall || trucoState >= 3 || matchWinner) return;
    sounds.playGrito();
    const level = trucoState + 1;
    const call = { type: 'truco', from: 'player', level, resumeTurn: 'cpu' };
    setPendingCall(call);
    setTurn('cpu');
    setDialogText(`¡${['Truco', 'Retruco', 'Vale cuatro'][trucoState]}!`);
    scheduleForHand(() => {
      const bestPower = Math.max(...cpuHand.map(getHierarchyPower));
      const accept = bestPower >= (level > 1 ? 10 : 5);
      setPendingCall(null);
      answerTrucoCall(call, accept);
    }, 700);
  };

  // --- CANTAR ENVIDO ---
  const cantarEnvido = (callType = 'envido') => {
    const answeringFirstTurnTruco = pendingCall?.type === 'truco' && roundWinners.length === 0
      && playedCpuCards.length === 0 && playedPlayerCards.length <= 1;
    if (turn !== 'player' || (pendingCall && !answeringFirstTurnTruco) || envidoPlayed
      || roundWinners.length > 0 || (playedPlayerCards.length > 0 && !answeringFirstTurnTruco)
      || playedCpuCards.length > 0 || matchWinner) return;

    if (answeringFirstTurnTruco) {
      queuedTrucoCallRef.current = pendingCall;
      setPendingCall(null);
    }

    sounds.playGrito();
    setEnvidoPlayed(true);
    const stake = callType === 'real'
      ? 3
      : callType === 'falta' ? getFaltaPoints() : 2;
    const call = {
      type: 'envido',
      from: 'player',
      resumeTurn: 'player',
      stake,
      refusedPoints: 1,
      callName: callType === 'real' ? 'Real Envido' : callType === 'falta' ? 'Falta Envido' : 'Envido',
    };
    setPendingCall(call);
    setTurn('cpu');
    setDialogText(`${call.callName}. ${rival.nombre} piensa si quiere...`);
    scheduleCpuEnvidoAnswer(call);
  };

  const raiseEnvido = (callType) => {
    if (pendingCall?.type !== 'envido' || pendingCall.from !== 'cpu') return;
    const previousStake = pendingCall.stake;
    const raisedStake = callType === 'falta'
      ? previousStake + getFaltaPoints()
      : previousStake + (callType === 'real' ? 3 : 2);
    const call = {
      ...pendingCall,
      from: 'player',
      stake: raisedStake,
      refusedPoints: previousStake,
      callName: callType === 'real' ? 'Real Envido' : callType === 'falta' ? 'Falta Envido' : 'Envido',
    };
    setPendingCall(call);
    setDialogText(`¡${call.callName}! ${rival.nombre} responde...`);
    scheduleCpuEnvidoAnswer(call);
  };

  const respondToCall = (accept) => {
    if (!pendingCall) return;
    const call = pendingCall;
    setPendingCall(null);

    if (call.type === 'envido') {
      answerEnvidoCall(call, accept);
      return;
    }

    answerTrucoCall(call, accept);
  };

  // --- PODER: MATE ESPÍA ---
  const useMatePower = () => {
    if (powersUnlocked.mateEspia > 0 && !mateUsed && cpuHand.length > 0) {
      setPowersUnlocked(prev => ({ ...prev, mateEspia: prev.mateEspia - 1 }));
      setMateUsed(true);
      setRevealedCpuCard(cpuHand[0]);
      sounds.playCoin();
      setDialogText('🧉 "Cebaste un mate": Ves una carta del rival.');
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#100905] flex flex-col justify-between items-center select-none overflow-hidden text-amber-100 font-sans">
      
      {/* HEADER / MARCADOR CRIOLLO */}
      <div className="w-full max-w-2xl px-4 pt-3 flex justify-between items-center gap-2 z-20">
        {/* Puntos Jugador */}
        <div className="min-w-0 flex-1 rounded-xl border-2 border-amber-700/60 bg-amber-950/80 px-2 py-2 text-center shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-center gap-1">
            <span className="text-xl">🤠</span>
            <span className="truncate text-xs font-bold uppercase tracking-wider text-amber-400">Usted</span>
          </div>
          <TallyMarks score={playerPoints} />
          <div className="text-xs font-black text-amber-200">{playerPoints}/{PUNTOS_PARTIDO}</div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-amber-400/70">
            {playerPoints > 15 ? 'Buenas' : 'Malas'}
          </div>
        </div>

        {/* Info Rival y Selector */}
        <div className="flex shrink-0 flex-col items-center">
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-amber-800/40">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-bold text-sm">{coins}</span>
            <button
              type="button"
              onClick={() => {
                sounds.muted = soundEnabled;
                setSoundEnabled(!soundEnabled);
              }}
              aria-label={soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
              className="text-amber-300 hover:text-amber-100"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        <button
          type="button"
          onClick={() => setShowRules(true)}
          className="mt-1 flex items-center gap-1 text-xs text-amber-300/90 underline hover:text-amber-100"
        >
          <BookOpen className="h-3 w-3" /> Reglamento
        </button>
        <button 
          onClick={() => {
            setCurrentRivalIndex((previous) => (previous + 1) % PROCERES.length);
            startNewHand();
          }}
            className="text-xs text-amber-300/80 underline mt-1 hover:text-amber-100"
          >
            Cambiar Prócer
          </button>
        </div>

        {/* Puntos Rival */}
        <div className="min-w-0 flex-1 rounded-xl border-2 border-amber-700/60 bg-amber-950/80 px-2 py-2 text-center shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-center gap-1">
            <span className="truncate text-xs font-bold uppercase tracking-wider text-amber-400">{rival.nombre}</span>
            <span className="text-xl">{rival.avatar}</span>
          </div>
          <TallyMarks score={cpuPoints} />
          <div className="text-xs font-black text-amber-200">{cpuPoints}/{PUNTOS_PARTIDO}</div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-amber-400/70">
            {cpuPoints > 15 ? 'Buenas' : 'Malas'}
          </div>
        </div>
      </div>

      {/* DIÁLOGO / ANUNCIOS */}
      <div className="z-20 my-2 px-6 py-2 bg-gradient-to-r from-amber-950/90 via-amber-900/90 to-amber-950/90 border border-amber-600/50 rounded-full shadow-2xl max-w-lg text-center">
        <p className="text-sm md:text-base font-semibold text-amber-200">{dialogText}</p>
      </div>

      {/* TAPETE DE JUEGO (MESA DE MADERA Y CUERO REPUJADO) */}
      <div className="relative w-full max-w-3xl h-[58vh] my-auto rounded-3xl p-6 flex flex-col justify-between items-center shadow-[inset_0_0_80px_rgba(0,0,0,0.9)] border-8 border-[#3a1d0d] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#4a2a18] via-[#2d180d] to-[#160a04] overflow-hidden">
        
        {/* Textura de Cuero Central */}
        <div className="absolute inset-4 border-2 border-dashed border-amber-800/30 rounded-2xl pointer-events-none" />

        {/* --- MANO RIVAL (CPU) --- */}
        <div className="flex gap-3 items-center z-10">
          {cpuHand.map((card, idx) => {
            const isRevealed = revealedCpuCard && revealedCpuCard.id === card.id;
            return (
              <motion.div
                key={card.id || idx}
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-16 h-24 md:w-20 md:h-28 rounded-lg bg-gradient-to-br from-amber-900 to-amber-950 border-2 border-amber-700 shadow-xl flex flex-col justify-center items-center relative overflow-hidden"
              >
                {isRevealed ? (
                  <div className="bg-amber-100 text-amber-950 w-full h-full p-1 flex flex-col justify-between items-center rounded">
                    <span className="font-bold text-xs">{card.number}</span>
                    <span className="text-xl">{PALO_ICONOS[card.suit]}</span>
                    <span className="font-bold text-xs">{card.number}</span>
                  </div>
                ) : (
                  <div className="text-amber-600/40 text-2xl font-serif font-bold">⚜️</div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* --- MESA CENTRAL (CARTAS JUGADAS) --- */}
        <div className="z-10 my-auto flex h-36 w-full max-w-xl items-stretch justify-center gap-2">
          <PlayedHistory
            cards={matchPlayedCpuCards}
            latestCard={playedCpuCards.at(-1)}
            label={`${rival.nombre} — jugadas`}
          />
          <PlayedHistory
            cards={matchPlayedPlayerCards}
            latestCard={playedPlayerCards.at(-1)}
            label="Tus jugadas"
          />
        </div>

        {/* --- MANO DEL JUGADOR --- */}
        <div className="flex gap-4 items-center z-10">
          {playerHand.map((card, idx) => {
            const isHigh = getHierarchyPower(card) >= 11;
            return (
              <motion.button
                key={card.id}
                whileHover={{ y: -12, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => playCard(idx)}
                disabled={turn !== 'player' || Boolean(pendingCall)}
                className={`w-20 h-28 md:w-24 md:h-36 bg-gradient-to-b from-amber-50 to-amber-100 text-amber-950 rounded-xl border-2 ${
                  isHigh ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'border-amber-700'
                } shadow-2xl p-2 flex flex-col justify-between items-center relative transition-all`}
              >
                {isHigh && (
                  <span className="absolute -top-2 -right-2 bg-yellow-500 text-amber-950 rounded-full p-1 text-[10px] font-black shadow">
                    ✨
                  </span>
                )}
                <div className="w-full flex justify-between text-sm font-black">
                  <span>{card.number}</span>
                  <span>{PALO_ICONOS[card.suit]}</span>
                </div>
                <div className="text-3xl">{PALO_ICONOS[card.suit]}</div>
                <div className="w-full flex justify-between text-sm font-black rotate-180">
                  <span>{card.number}</span>
                  <span>{PALO_ICONOS[card.suit]}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* --- BOTONES DE CANTOS Y ACCIONES --- */}
      <div className="w-full max-w-xl px-4 mb-4 z-20 flex flex-col gap-2">
        {pendingCall?.from === 'cpu' && (
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => respondToCall(true)}
              className="bg-emerald-800 hover:bg-emerald-700 text-amber-100 font-black px-5 py-2 rounded-xl border border-emerald-500/50 shadow-lg"
            >
              ¡Quiero!
            </button>
            <button
              type="button"
              onClick={() => respondToCall(false)}
              className="bg-red-900 hover:bg-red-800 text-amber-100 font-black px-5 py-2 rounded-xl border border-red-500/50 shadow-lg"
            >
              No quiero
            </button>
            {pendingCall.type === 'envido' && (
              <>
                <button
                  type="button"
                  onClick={() => raiseEnvido('envido')}
                  className="rounded-xl border border-amber-500/50 bg-amber-800 px-3 py-2 text-xs font-black text-amber-100 shadow-lg hover:bg-amber-700"
                >
                  Envido
                </button>
                <button
                  type="button"
                  onClick={() => raiseEnvido('real')}
                  className="rounded-xl border border-amber-500/50 bg-amber-800 px-3 py-2 text-xs font-black text-amber-100 shadow-lg hover:bg-amber-700"
                >
                  Real Envido
                </button>
                <button
                  type="button"
                  onClick={() => raiseEnvido('falta')}
                  className="rounded-xl border border-amber-500/50 bg-amber-800 px-3 py-2 text-xs font-black text-amber-100 shadow-lg hover:bg-amber-700"
                >
                  Falta Envido
                </button>
              </>
            )}
          </div>
        )}

        {/* Poderes / Gauchadas */}
        <div className="flex justify-center gap-3 mb-1">
          <button
            onClick={useMatePower}
            disabled={powersUnlocked.mateEspia <= 0 || mateUsed || Boolean(pendingCall) || Boolean(matchWinner)}
            className="flex items-center gap-1.5 bg-amber-900/80 hover:bg-amber-800 disabled:opacity-40 text-amber-200 border border-amber-600/50 px-3 py-1.5 rounded-full text-xs font-bold transition shadow-md"
          >
            <span>🧉 Mate Espía</span>
            <span className="bg-black/40 px-1.5 py-0.5 rounded-full text-[10px] text-yellow-400">
              {powersUnlocked.mateEspia}
            </span>
          </button>
        </div>

        {/* Cantos Principales */}
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          <button
            onClick={() => cantarEnvido('envido')}
            disabled={turn !== 'player' || (Boolean(pendingCall) && !(pendingCall.type === 'truco'
              && roundWinners.length === 0 && playedPlayerCards.length === 1)) || envidoPlayed
              || roundWinners.length > 0 || (playedPlayerCards.length > 0
                && !(pendingCall?.type === 'truco' && playedPlayerCards.length === 1))
              || playedCpuCards.length > 0 || Boolean(matchWinner)}
            className="bg-gradient-to-b from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 disabled:opacity-40 text-amber-100 font-black py-3 rounded-xl border border-amber-500/40 shadow-lg text-xs md:text-sm uppercase tracking-wide transition active:scale-95"
          >
            Envido
          </button>

          <button
            onClick={() => cantarEnvido('real')}
            disabled={turn !== 'player' || (Boolean(pendingCall) && !(pendingCall.type === 'truco'
              && roundWinners.length === 0 && playedPlayerCards.length === 1))
              || envidoPlayed || roundWinners.length > 0 || (playedPlayerCards.length > 0
                && !(pendingCall?.type === 'truco' && playedPlayerCards.length === 1))
              || playedCpuCards.length > 0 || Boolean(matchWinner)}
            className="bg-gradient-to-b from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 disabled:opacity-40 text-amber-100 font-black py-3 rounded-xl border border-amber-500/40 shadow-lg text-[10px] md:text-xs uppercase tracking-wide transition active:scale-95"
          >
            Real Envido
          </button>

          <button
            onClick={() => cantarEnvido('falta')}
            disabled={turn !== 'player' || (Boolean(pendingCall) && !(pendingCall.type === 'truco'
              && roundWinners.length === 0 && playedPlayerCards.length === 1))
              || envidoPlayed || roundWinners.length > 0 || (playedPlayerCards.length > 0
                && !(pendingCall?.type === 'truco' && playedPlayerCards.length === 1))
              || playedCpuCards.length > 0 || Boolean(matchWinner)}
            className="bg-gradient-to-b from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 disabled:opacity-40 text-amber-100 font-black py-3 rounded-xl border border-amber-500/40 shadow-lg text-[10px] md:text-xs uppercase tracking-wide transition active:scale-95"
          >
            Falta Envido
          </button>

          <button
            onClick={cantarTruco}
            disabled={turn !== 'player' || Boolean(pendingCall) || trucoState >= 3 || Boolean(matchWinner)}
            className="bg-gradient-to-b from-red-800 to-red-950 hover:from-red-700 hover:to-red-900 text-amber-100 font-black py-3 rounded-xl border border-red-500/40 shadow-lg text-xs md:text-sm uppercase tracking-wide transition active:scale-95"
          >
            {trucoState === 0 ? 'Truco' : trucoState === 1 ? 'Retruco' : 'Vale 4'}
          </button>

          <button
            onClick={startNewHand}
            disabled={Boolean(matchWinner)}
            className="bg-gradient-to-b from-stone-800 to-stone-950 hover:from-stone-700 text-stone-300 font-bold py-3 rounded-xl border border-stone-600/40 shadow-lg text-xs md:text-sm uppercase transition active:scale-95"
          >
            Mazo
          </button>

          <button
            onClick={() => setShowShop(true)}
            disabled={Boolean(matchWinner)}
            className="bg-gradient-to-b from-yellow-700 to-amber-900 hover:from-yellow-600 text-yellow-200 font-bold py-3 rounded-xl border border-yellow-500/40 shadow-lg text-xs md:text-sm flex items-center justify-center gap-1 transition active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" /> Tienda
          </button>
        </div>
      </div>

      {/* --- MODAL TIENDA Y ADMOB (MONETIZACIÓN) --- */}
      <AnimatePresence>
        {showShop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <div className="bg-gradient-to-b from-amber-950 to-[#1c0d06] border-2 border-amber-600/60 rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-amber-100">
              <h2 className="text-xl font-black text-amber-400 mb-4 flex items-center gap-2">
                <ShoppingBag /> Tienda Gauchesca
              </h2>

              <div className="space-y-4">
                {/* Comprar Mates */}
                <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-amber-800/40">
                  <div>
                    <div className="font-bold text-sm">🧉 Mate Espía (+1)</div>
                    <div className="text-xs text-amber-300/60">Revela una carta del oponente</div>
                  </div>
                  <button
                    onClick={() => {
                      if (coins >= 50) {
                        setCoins(c => c - 50);
                        setPowersUnlocked(p => ({ ...p, mateEspia: p.mateEspia + 1 }));
                        sounds.playCoin();
                      }
                    }}
                    className="bg-yellow-600 hover:bg-yellow-500 text-amber-950 font-black px-3 py-1.5 rounded-lg text-xs"
                  >
                    50 🪙
                  </button>
                </div>

                {/* Ver Anuncio Recompensado */}
                <div className="flex justify-between items-center bg-gradient-to-r from-yellow-950/60 to-amber-900/60 p-3 rounded-xl border border-yellow-500/40">
                  <div>
                    <div className="font-bold text-sm text-yellow-300 flex items-center gap-1">
                      <PlayCircle className="w-4 h-4" /> Ver Video Corto
                    </div>
                    <div className="text-xs text-amber-200/60">Gana +100 monedas patrias</div>
                  </div>
                  <button
                    onClick={() => {
                      setCoins(c => c + 100);
                      sounds.playCoin();
                      alert("¡Gracias por apoyar el juego! Has recibido +100 monedas.");
                    }}
                    className="bg-gradient-to-r from-yellow-500 to-amber-500 text-amber-950 font-black px-3 py-1.5 rounded-lg text-xs shadow-lg"
                  >
                    +100 🪙
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowShop(false)}
                className="w-full mt-6 bg-amber-900 hover:bg-amber-800 text-amber-200 font-bold py-2 rounded-xl border border-amber-700/50"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rules-title"
          >
            <motion.section
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-2 border-amber-600/60 bg-gradient-to-b from-amber-950 to-[#1c0d06] text-amber-100 shadow-2xl"
            >
              <header className="flex items-center justify-between border-b border-amber-700/40 p-5">
                <h2 id="rules-title" className="flex items-center gap-2 text-xl font-black text-amber-300">
                  <BookOpen className="h-5 w-5" /> Reglamento del Truco Argentino
                </h2>
                <button
                  type="button"
                  onClick={() => setShowRules(false)}
                  aria-label="Cerrar reglamento"
                  className="rounded-lg px-3 py-1 text-2xl leading-none text-amber-300 hover:bg-amber-900"
                >
                  ×
                </button>
              </header>
              <div className="space-y-5 overflow-y-auto p-5 text-sm leading-relaxed">
                <p className="rounded-xl border border-amber-700/40 bg-black/25 p-3 text-amber-200/90">
                  Esta partida es de uno contra uno, a 30 puntos. Se juega con 40 cartas españolas
                  (sin 8, 9 ni comodines);
                  se reparten tres a cada jugador y la mano alterna entre vos y el rival en cada reparto.
                </p>

                <section>
                  <h3 className="mb-2 font-black uppercase tracking-wide text-amber-400">Jerarquía, de mayor a menor</h3>
                  <p>
                    1 de Espadas, 1 de Bastos, 7 de Espadas, 7 de Oros, todos los 3, todos los 2,
                    1 de Oros y 1 de Copas, todos los 12, 11 y 10, 7 de Copas y 7 de Bastos,
                    todos los 6, todos los 5 y todos los 4. Los empates de fuerza son pardas.
                  </p>
                </section>

                <section>
                  <h3 className="mb-2 font-black uppercase tracking-wide text-amber-400">Vueltas y ganador de la mano</h3>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Cada jugador tira una carta por vuelta; gana la mano quien se lleva dos de las tres.</li>
                    <li>Si la primera vuelta parda, gana quien gana la segunda; si la segunda parda, vale el resultado de la primera.</li>
                    <li>                    Si las dos primeras son pardas, decide la tercera. Si las tres son pardas, gana quien es mano.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="mb-2 font-black uppercase tracking-wide text-amber-400">Envido, Real Envido y Falta Envido</h3>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Se cantan antes de jugar la primera carta. También podés cantar Envido antes de responder un Truco cantado en la primera vuelta.</li>
                    <li>Para el Envido, las figuras valen cero. Dos cartas del mismo palo suman sus valores más 20; con palos distintos cuenta la carta de mayor valor. El máximo es 33.</li>
                    <li>Envido querido: 2 puntos; Real Envido querido: 3. Si ambos están en buenas, la Falta vale lo que le falta al marcador más avanzado para llegar a 30; si alguno está en malas, vale 30. Si no se quiere, cobra quien hizo el último canto.</li>
                    <li>Se pueden reenganchar los cantos: Envido suma 2 y Real Envido suma 3 al valor en juego. Si se rechaza un reenganche, cobra el valor anterior.</li>
                    <li>En caso de empate en el Envido, gana quien es mano en esa mano.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="mb-2 font-black uppercase tracking-wide text-amber-400">Truco</h3>
                  <p>
                    Sin Truco, la mano vale 1. Truco querido vale 2, Retruco querido 3 y Vale Cuatro querido 4.
                    Si se rechaza, quien hizo el último canto suma 1, 2 o 3 puntos, respectivamente.
                  </p>
                </section>

                <section>
                  <h3 className="mb-2 font-black uppercase tracking-wide text-amber-400">Partido y tanteador</h3>
                  <p>
                    El partido termina al llegar a 30 puntos. De 0 a 15 son las malas y de 16 a 30 las buenas.
                    El tanteador muestra los puntos con palitos agrupados de a cinco: cuatro trazos y uno cruzado.
                  </p>
                </section>

                <section className="border-t border-amber-700/40 pt-4">
                  <h3 className="mb-2 font-black uppercase tracking-wide text-amber-400">Variantes de mesa</h3>
                  <p className="mb-2">
                    En partidas de cuatro o seis jugadores se juega por parejas/equipos y las señas ayudan a
                    comunicar las cartas al compañero. Esta versión es mano a mano, sin señas entre compañeros.
                  </p>
                  <p className="mb-2">
                    La Flor es opcional y acá está desactivada: se acuerda antes de jugar. Son tres cartas del mismo
                    palo; suma sus valores (las figuras valen cero) más 20 y vale 3 puntos. Si hay más de una Flor,
                    gana la mayor; puede cantarse Contraflor.
                  </p>
                  <p className="mb-1 font-bold text-amber-300">Señas tradicionales de referencia:</p>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Ancho de Espadas: levantar las cejas; Ancho de Bastos: guiñar un ojo.</li>
                    <li>7 de Espadas: mover la comisura hacia la derecha; 7 de Oros: hacia la izquierda.</li>
                    <li>Un 3: morderse el labio; un 2: hacer un beso; anchos falsos: abrir la boca o sacar la lengua.</li>
                    <li>Sin puntos: cerrar los ojos o negar; Envido alto: inclinar la cabeza o levantar un hombro.</li>
                  </ul>
                </section>
              </div>
              <footer className="border-t border-amber-700/40 p-4">
                <button
                  type="button"
                  onClick={() => setShowRules(false)}
                  className="w-full rounded-xl border border-amber-700/50 bg-amber-900 py-2 font-bold text-amber-100 hover:bg-amber-800"
                >
                  Volver al juego
                </button>
              </footer>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {matchWinner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="match-result-title"
          >
            <motion.div
              initial={{ scale: 0.9, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-2xl border-2 border-amber-500/60 bg-gradient-to-b from-amber-950 to-[#1c0d06] p-6 text-center shadow-2xl"
            >
              <div className="mb-2 text-5xl">{matchWinner === 'player' ? '🏆' : rival.avatar}</div>
              <h2 id="match-result-title" className="text-2xl font-black text-amber-300">
                {matchWinner === 'player' ? '¡Partido ganado!' : 'Partido terminado'}
              </h2>
              <p className="mt-2 text-amber-100/80">
                {matchWinner === 'player'
                  ? `Llegaste a ${PUNTOS_PARTIDO} puntos y ganaste ${rival.recompensa} monedas.`
                  : `${rival.nombre} llegó primero a ${PUNTOS_PARTIDO} puntos.`}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPlayerPoints(0);
                  setCpuPoints(0);
                  setMatchWinner(null);
                  setPendingCall(null);
                  queuedTrucoCallRef.current = null;
                  startNewHand();
                }}
                className="mt-6 w-full rounded-xl border border-amber-400/50 bg-amber-700 px-5 py-3 font-black text-amber-50 shadow-lg transition hover:bg-amber-600"
              >
                Jugar la revancha
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}