import { useEffect, useState } from 'react';
import { ReloadPrompt } from './components/ReloadPrompt';
import { ScreenShell } from './components/ScreenShell';
import { useGame } from './hooks/useGame';
import { useOnlineRoom } from './hooks/useOnlineRoom';
import { useReadableMode } from './hooks/useReadableMode';
import { ConfigPage } from './pages/ConfigPage';
import { HomePage } from './pages/HomePage';
import { NamesPage } from './pages/NamesPage';
import { OnlineJoinPage } from './pages/OnlineJoinPage';
import { OnlineLobbyPage } from './pages/OnlineLobbyPage';
import { OnlinePlayPage } from './pages/OnlinePlayPage';
import { OnlineRevealPage } from './pages/OnlineRevealPage';
import { PassPhonePage } from './pages/PassPhonePage';
import { PlayPage } from './pages/PlayPage';
import { ReadyPage } from './pages/ReadyPage';
import { RevealPage } from './pages/RevealPage';

function connectionLabel(
  connection: ReturnType<typeof useOnlineRoom>['connection'],
): string {
  switch (connection) {
    case 'connecting':
      return 'Conectando al servidor…';
    case 'connected':
      return 'Conectado';
    case 'disconnected':
      return 'Reconectando…';
    default:
      return '';
  }
}

export default function App() {
  const { readableMode, setReadableMode } = useReadableMode();
  const {
    state,
    currentPlayer,
    configValidation,
    namesError,
    goHome,
    goConfig,
    goNames,
    updateConfig,
    updatePlayerName,
    startDeal,
    revealWord,
    passToNext,
    beginPlay,
    eliminatePlayer,
    clearLastElimination,
    setScreen,
  } = useGame();

  const onlineEnabled =
    state.screen === 'onlineJoin' ||
    state.screen === 'onlineLobby' ||
    state.screen === 'onlineReveal' ||
    state.screen === 'onlinePlay';

  const online = useOnlineRoom({ enabled: onlineEnabled });
  const [onlineRevealed, setOnlineRevealed] = useState(false);

  useEffect(() => {
    if (!online.roomState) return;
    const phase = online.roomState.phase;
    if (phase === 'lobby' && state.screen !== 'onlineLobby') {
      setScreen('onlineLobby');
      setOnlineRevealed(false);
    } else if (phase === 'reveal' && state.screen !== 'onlineReveal') {
      setScreen('onlineReveal');
      setOnlineRevealed(false);
    } else if (
      (phase === 'play' || phase === 'ended') &&
      state.screen !== 'onlinePlay'
    ) {
      setScreen('onlinePlay');
    }
  }, [online.roomState, setScreen, state.screen]);

  useEffect(() => {
    const me = online.roomState?.seats.find((s) => s.playerId === online.playerId);
    if (me?.revealAcked && online.privateRole) {
      setOnlineRevealed(true);
    }
  }, [online.roomState, online.playerId, online.privateRole]);

  const starterName =
    state.players.find((p) => p.id === state.startingPlayerId)?.name ?? null;

  const leaveOnline = () => {
    online.reset();
    setOnlineRevealed(false);
    goHome();
  };

  if (state.screen === 'pass') {
    return (
      <ScreenShell screenKey="pass" bleed>
        <PassPhonePage />
      </ScreenShell>
    );
  }

  const centered =
    state.screen !== 'play' &&
    state.screen !== 'names' &&
    state.screen !== 'onlineLobby' &&
    state.screen !== 'onlinePlay';

  return (
    <>
      <ScreenShell screenKey={state.screen} centered={centered}>
        {state.screen === 'home' && (
          <HomePage
            onStartLocal={goConfig}
            onStartOnline={() => setScreen('onlineJoin')}
            readableMode={readableMode}
            onReadableModeChange={setReadableMode}
          />
        )}

        {state.screen === 'config' && (
          <ConfigPage
            config={state.config}
            validation={configValidation}
            onChange={updateConfig}
            onStart={goNames}
            onBack={goHome}
          />
        )}

        {state.screen === 'names' && (
          <NamesPage
            names={state.playerNames}
            error={namesError}
            onChangeName={updatePlayerName}
            onContinue={startDeal}
            onBack={goConfig}
          />
        )}

        {state.screen === 'reveal' && currentPlayer && (
          <RevealPage
            player={currentPlayer}
            playerIndex={state.currentPlayerIndex}
            totalPlayers={state.players.length}
            revealed={state.revealed}
            onReveal={revealWord}
            onNext={passToNext}
          />
        )}

        {state.screen === 'ready' && (
          <ReadyPage
            starterName={starterName}
            onBeginPlay={beginPlay}
            onNewGame={startDeal}
            onChangeConfig={goConfig}
          />
        )}

        {state.screen === 'play' && (
          <PlayPage
            players={state.players}
            currentRound={state.currentRound}
            lastElimination={state.lastElimination}
            starterName={starterName}
            word={state.words?.normal ?? null}
            onEliminate={eliminatePlayer}
            onDismissResult={clearLastElimination}
            onNewGame={startDeal}
            onChangeConfig={goConfig}
          />
        )}

        {state.screen === 'onlineJoin' && (
          <OnlineJoinPage
            connectionLabel={connectionLabel(online.connection)}
            error={online.error}
            onCreate={(name) => online.createRoom(name)}
            onJoin={(code, name) => online.joinRoom(code, name)}
            onBack={leaveOnline}
          />
        )}

        {state.screen === 'onlineLobby' && online.roomState && (
          <OnlineLobbyPage
            state={online.roomState}
            playerId={online.playerId}
            isHost={online.isHost}
            error={online.error}
            onSetReady={online.setReady}
            onUpdateConfig={online.updateConfig}
            onStartGame={online.startGame}
            onLeave={leaveOnline}
          />
        )}

        {state.screen === 'onlineReveal' && online.roomState && (
          <OnlineRevealPage
            state={online.roomState}
            privateRole={online.privateRole}
            playerId={online.playerId}
            isHost={online.isHost}
            revealed={onlineRevealed}
            onReveal={() => setOnlineRevealed(true)}
            onAck={online.ackReveal}
            onBeginPlay={online.beginPlay}
          />
        )}

        {state.screen === 'onlinePlay' && online.roomState && (
          <OnlinePlayPage
            state={online.roomState}
            isHost={online.isHost}
            onEliminate={online.eliminate}
            onDismissResult={online.dismissElimination}
            onNewGame={online.newGame}
            onLeave={leaveOnline}
          />
        )}
      </ScreenShell>

      <ReloadPrompt />
    </>
  );
}
