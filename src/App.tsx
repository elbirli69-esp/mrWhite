import { ReloadPrompt } from './components/ReloadPrompt';
import { ScreenShell } from './components/ScreenShell';
import { useGame } from './hooks/useGame';
import { useReadableMode } from './hooks/useReadableMode';
import { ConfigPage } from './pages/ConfigPage';
import { HomePage } from './pages/HomePage';
import { NamesPage } from './pages/NamesPage';
import { PassPhonePage } from './pages/PassPhonePage';
import { PlayPage } from './pages/PlayPage';
import { ReadyPage } from './pages/ReadyPage';
import { RevealPage } from './pages/RevealPage';

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
  } = useGame();

  const starterName =
    state.players.find((p) => p.id === state.startingPlayerId)?.name ?? null;

  if (state.screen === 'pass') {
    return (
      <ScreenShell screenKey="pass" bleed>
        <PassPhonePage />
      </ScreenShell>
    );
  }

  return (
    <>
      <ScreenShell
        screenKey={state.screen}
        centered={state.screen !== 'play' && state.screen !== 'names'}
      >
        {state.screen === 'home' && (
          <HomePage
            onStart={goConfig}
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
      </ScreenShell>

      <ReloadPrompt />
    </>
  );
}
