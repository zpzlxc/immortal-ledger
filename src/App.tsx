import { useEffect, useRef, useState } from 'react';
import {
  ACTIONS,
  formatAge,
  formatRealm,
  formatRemaining,
  formatTimestamp,
  TALENTS,
} from './game/content';
import {
  CAVE_BUILDINGS,
  CAVE_MAX_LEVEL,
  getActionDurationMinutes,
  getCaveEffects,
  getUpgradeCost,
} from './game/cave';
import { EXPLORATION_LOCATIONS, getExplorationEvent } from './game/exploration';
import {
  getPersonEvent,
  getSectEffects,
  getSectMission,
  getSectMissions,
  getSectRank,
  RELATIONSHIPS,
  SECT_EXCHANGES,
  SECTS,
} from './game/people';
import {
  CULTIVATION_SCHOOLS,
  getActiveTechnique,
  getTechniqueProgress,
} from './game/techniques';
import type { TechniqueDefinition } from './game/techniques';
import type {
  ActionType,
  CaveBuildingId,
  CultivationSchoolId,
  ExplorationLocationId,
  GameState,
  LedgerEntry,
  SectId,
  SectExchangeId,
  SectMissionId,
  Talent,
} from './game/types';
import {
  clearGame,
  createNewGame,
  downloadSave,
  loadGame,
  parseSaveFile,
  saveGame,
} from './game/save';
import {
  collectCave,
  chooseCultivationSchool,
  exchangeSectReputation,
  joinSect,
  researchTechniqueBranch,
  resolveExplorationEvent,
  resolvePersonEvent,
  settleGame,
  startSectMission,
  startAction,
  tryBreakthrough,
  upgradeCaveBuilding,
} from './game/settlement';

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

const categoryLabel: Record<LedgerEntry['category'], string> = {
  system: '簿册',
  action: '修行',
  exploration: '探索',
  breakthrough: '境界',
  relationship: '人物',
  death: '终章',
};

const App = () => {
  const [game, setGame] = useState<GameState | null>(() => {
    const saved = loadGame();
    if (!saved) return null;
    const settled = settleGame(saved);
    saveGame(settled.state);
    return settled.state;
  });
  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState<LedgerEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'ledger' | 'cultivation' | 'technique' | 'exploration' | 'people' | 'cave' | 'codex'>('ledger');
  const [selectedExplorationLocationId, setSelectedExplorationLocationId] = useState<ExplorationLocationId>('qingstone-mountain');
  const [errorMessage, setErrorMessage] = useState('');
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      setGame((previous) => {
        if (!previous) return previous;
        const settled = settleGame(previous, current);
        if (settled.newEntries.length > 0) {
          setNotice(settled.newEntries);
        }
        saveGame(settled.state);
        return settled.state;
      });
    }, 1_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (notice.length === 0) return;
    const timer = window.setTimeout(() => setNotice([]), 8_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleCreate = (name: string, talent: Talent) => {
    const next = createNewGame(name, [talent.id]);
    saveGame(next);
    setGame(next);
  };

  const handleStartAction = (type: ActionType, locationId?: ExplorationLocationId) => {
    if (!game || game.character.currentAction) return;
    if (game.pendingExplorationEvent || game.social.pendingPersonEvent) {
      setErrorMessage('请先处理眼前的事件，再安排下一项行动。');
      return;
    }
    setErrorMessage('');
    const settled = settleGame(game, Date.now());
    const next = startAction(
      settled.state,
      type,
      Date.now(),
      locationId ?? selectedExplorationLocationId,
    );
    saveGame(next);
    setGame(next);
    if (settled.newEntries.length > 0) setNotice(settled.newEntries);
  };

  const handleBreakthrough = () => {
    if (!game) return;
    setErrorMessage('');
    const settled = settleGame(game, Date.now());
    const result = tryBreakthrough(settled.state);
    saveGame(result.state);
    setGame(result.state);
    setNotice([...settled.newEntries, ...result.newEntries]);
  };

  const handleChooseSchool = (schoolId: CultivationSchoolId) => {
    if (!game) return;
    const result = chooseCultivationSchool(game, schoolId, Date.now());
    saveGame(result.state);
    setGame(result.state);
    setErrorMessage(result.error ?? '');
    if (result.newEntries.length > 0) setNotice(result.newEntries);
  };

  const handleResearchBranch = (branchId: string) => {
    if (!game) return;
    const result = researchTechniqueBranch(game, branchId, Date.now());
    saveGame(result.state);
    setGame(result.state);
    setErrorMessage(result.error ?? '');
    if (result.newEntries.length > 0) setNotice(result.newEntries);
  };

  const handleResolvePersonEvent = (choiceId: string) => {
    if (!game) return;
    const settled = settleGame(game, Date.now());
    const result = resolvePersonEvent(settled.state, choiceId, Date.now());
    saveGame(result.state);
    setGame(result.state);
    setErrorMessage(result.error ?? '');
    setNotice([...settled.newEntries, ...result.newEntries]);
  };

  const handleResolveExplorationEvent = (choiceId: string) => {
    if (!game) return;
    const settled = settleGame(game, Date.now());
    const result = resolveExplorationEvent(settled.state, choiceId, Date.now());
    saveGame(result.state);
    setGame(result.state);
    setErrorMessage(result.error ?? '');
    setNotice([...settled.newEntries, ...result.newEntries]);
  };

  const handleJoinSect = (sectId: SectId) => {
    if (!game) return;
    const result = joinSect(game, sectId, Date.now());
    saveGame(result.state);
    setGame(result.state);
    setErrorMessage(result.error ?? '');
    if (result.newEntries.length > 0) setNotice(result.newEntries);
  };

  const handleStartSectMission = (missionId: SectMissionId) => {
    if (!game) return;
    const settled = settleGame(game, Date.now());
    const result = startSectMission(settled.state, missionId, Date.now());
    saveGame(result.state);
    setGame(result.state);
    setErrorMessage(result.error ?? '');
    if (settled.newEntries.length > 0) setNotice(settled.newEntries);
  };

  const handleExchangeReputation = (exchangeId: SectExchangeId) => {
    if (!game) return;
    const result = exchangeSectReputation(game, exchangeId, Date.now());
    saveGame(result.state);
    setGame(result.state);
    setErrorMessage(result.error ?? '');
    if (result.newEntries.length > 0) setNotice(result.newEntries);
  };

  const handleCollectCave = () => {
    if (!game) return;
    const result = collectCave(game, Date.now());
    saveGame(result.state);
    setGame(result.state);
    setErrorMessage(result.error ?? '');
    if (result.newEntries.length > 0) setNotice(result.newEntries);
  };

  const handleUpgradeCaveBuilding = (buildingId: CaveBuildingId) => {
    if (!game) return;
    const result = upgradeCaveBuilding(game, buildingId, Date.now());
    saveGame(result.state);
    setGame(result.state);
    setErrorMessage(result.error ?? '');
    if (result.newEntries.length > 0) setNotice(result.newEntries);
  };

  const markRead = (entryId: string) => {
    setGame((previous) => {
      if (!previous) return previous;
      const next = {
        ...previous,
        ledger: previous.ledger.map((entry) =>
          entry.id === entryId ? { ...entry, read: true } : entry,
        ),
      };
      saveGame(next);
      return next;
    });
  };

  const markAllRead = () => {
    setGame((previous) => {
      if (!previous) return previous;
      const next = {
        ...previous,
        ledger: previous.ledger.map((entry) => ({ ...entry, read: true })),
      };
      saveGame(next);
      return next;
    });
  };

  const handleReset = () => {
    if (!window.confirm('确定要结束这一世并删除当前本地存档吗？此操作不可撤销。')) return;
    clearGame();
    setGame(null);
    setNotice([]);
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const imported = await parseSaveFile(file);
      saveGame(imported);
      setGame(imported);
      setErrorMessage('');
      setNotice([]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '导入失败');
    }
  };

  if (!game) {
    return <CreateCharacter onCreate={handleCreate} />;
  }

  const unreadCount = game.ledger.filter((entry) => !entry.read).length;
  const cultivationRatio = Math.min(
    100,
    (game.character.realm.cultivation / game.character.realm.cultivationRequired) * 100,
  );
  const canBreakthrough = game.character.realm.cultivation >= game.character.realm.cultivationRequired;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <BrandLogo />
          <div>
            <div className="brand-title">长生簿</div>
            <div className="brand-subtitle">一页凡尘，百年问道</div>
          </div>
        </div>
        <div className="top-actions">
          <span className="save-status"><span className="status-dot" />本地存档</span>
          <button className="ghost-button" onClick={() => downloadSave(game)}>导出</button>
          <button className="ghost-button" onClick={() => importInput.current?.click()}>导入</button>
          <input
            ref={importInput}
            className="visually-hidden"
            type="file"
            accept="application/json"
            onChange={(event) => {
              void handleImport(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>
      </header>

      <main className="main-layout">
        <aside className="sidebar">
          <section className="character-card paper-card">
            <div className="eyebrow">CURRENT LIFE · 本世</div>
            <div className="character-name">{game.character.name}</div>
            <div className="realm-name">{formatRealm(game.character.realm.major, game.character.realm.stage)}</div>
            <div className="age-line">{formatAge(game.character.ageDays)} · 寿元 {Math.floor(game.character.lifespanDays / 365)} 年</div>

            <div className="cultivation-progress">
              <div className="progress-label">
                <span>修为</span>
                <span>{game.character.realm.cultivation} / {game.character.realm.cultivationRequired}</span>
              </div>
              <div className="progress-track"><div style={{ width: `${cultivationRatio}%` }} /></div>
            </div>

            <div className="attribute-grid">
              <Stat label="根骨" value={game.character.attributes.physique} />
              <Stat label="悟性" value={game.character.attributes.comprehension} />
              <Stat label="神识" value={game.character.attributes.spiritSense} />
              <Stat label="心境" value={game.character.attributes.mentalState} />
              <Stat label="气运" value={game.character.attributes.fortune} />
              <Stat label="因果" value={game.character.attributes.karma} />
            </div>
          </section>

          <section className="side-section">
            <div className="section-heading"><span>天赋</span><span className="muted">{game.character.talents.length}</span></div>
            {game.character.talents.map((talent) => (
              <div className="talent-chip" key={talent.id}>
                <span className="talent-mark">✦</span>
                <div><strong>{talent.name}</strong><small>{talent.effect}</small></div>
              </div>
            ))}
          </section>

          <section className="side-section inventory-section">
            <div className="section-heading"><span>随身物</span><span className="muted">本地</span></div>
            <div className="inventory-row"><span>灵石</span><strong>{game.inventory.spiritStones}</strong></div>
            <div className="inventory-row"><span>灵草</span><strong>{game.inventory.herbs}</strong></div>
            <div className="inventory-row"><span>功法残页</span><strong>{game.inventory.techniqueFragments}</strong></div>
          </section>

          <button className="danger-link" onClick={handleReset}>结束本世并重来</button>
        </aside>

        <section className="content-column">
          <div className="tab-bar">
            <TabButton active={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')} label="长生簿" badge={unreadCount} />
            <TabButton active={activeTab === 'cultivation'} onClick={() => setActiveTab('cultivation')} label="修炼" />
            <TabButton active={activeTab === 'technique'} onClick={() => setActiveTab('technique')} label="功法" />
            <TabButton active={activeTab === 'exploration'} onClick={() => setActiveTab('exploration')} label="探索" badge={game.pendingExplorationEvent ? 1 : undefined} />
            <TabButton active={activeTab === 'people'} onClick={() => setActiveTab('people')} label="人物" badge={game.social.pendingPersonEvent ? 1 : undefined} />
            <TabButton active={activeTab === 'cave'} onClick={() => setActiveTab('cave')} label="洞府" />
            <TabButton active={activeTab === 'codex'} onClick={() => setActiveTab('codex')} label="图鉴" />
          </div>

          {notice.length > 0 && (
            <div className="settlement-banner">
              <div className="banner-symbol">✧</div>
              <div>
                <strong>长生簿已替你记下这段时间</strong>
                <span>{notice.map((entry) => entry.title).join(' · ')}</span>
              </div>
              <button className="banner-close" onClick={() => setNotice([])}>×</button>
            </div>
          )}

          {activeTab === 'ledger' && (
            <LedgerView
              entries={game.ledger}
              onRead={markRead}
              onReadAll={markAllRead}
              action={game.character.currentAction}
              now={now}
            />
          )}
      {activeTab === 'cultivation' && (
            <CultivationView
              currentAction={game.character.currentAction}
              now={now}
              cave={game.cave}
              sectId={game.social.sect.sectId}
              attributes={game.character.attributes}
              cultivationPath={game.cultivationPath}
              canBreakthrough={canBreakthrough}
              onStart={handleStartAction}
              onBreakthrough={handleBreakthrough}
            />
          )}
          {activeTab === 'technique' && (
            <TechniqueView
              currentAction={game.character.currentAction}
              now={now}
              cave={game.cave}
              sectId={game.social.sect.sectId}
              inventory={game.inventory}
              cultivationPath={game.cultivationPath}
              onChooseSchool={handleChooseSchool}
              onResearchBranch={handleResearchBranch}
              onStart={handleStartAction}
            />
          )}
          {activeTab === 'exploration' && (
            <ExplorationView
              currentAction={game.character.currentAction}
              now={now}
              cave={game.cave}
              sectId={game.social.sect.sectId}
              discoveredLocations={game.discoveredLocations}
              pendingEvent={game.pendingExplorationEvent ? getExplorationEvent(game.pendingExplorationEvent.eventId) : null}
              selectedLocationId={selectedExplorationLocationId}
              onLocationChange={setSelectedExplorationLocationId}
              onStart={handleStartAction}
              onResolveEvent={handleResolveExplorationEvent}
            />
          )}
          {activeTab === 'cave' && (
            <CaveView
              cave={game.cave}
              inventory={game.inventory}
              sectId={game.social.sect.sectId}
              onCollect={handleCollectCave}
              onUpgrade={handleUpgradeCaveBuilding}
            />
          )}
          {activeTab === 'people' && (
            <PeopleView
              social={game.social}
              currentAction={game.character.currentAction}
              onResolveEvent={handleResolvePersonEvent}
              onJoinSect={handleJoinSect}
              onStartMission={handleStartSectMission}
              onExchangeReputation={handleExchangeReputation}
            />
          )}
          {activeTab === 'codex' && <CodexView game={game} />}

          {errorMessage && <div className="error-note">{errorMessage}</div>}
        </section>
      </main>
    </div>
  );
};

const CreateCharacter = ({ onCreate }: { onCreate: (name: string, talent: Talent) => void }) => {
  const [name, setName] = useState('沈砚');
  const [talentOptions] = useState(() => shuffle(TALENTS).slice(0, 3));
  const [selectedTalentId, setSelectedTalentId] = useState(talentOptions[0].id);
  const selectedTalent = talentOptions.find((talent) => talent.id === selectedTalentId) ?? talentOptions[0];

  return (
    <div className="onboarding-shell">
      <div className="onboarding-decor top-left">道可道</div>
      <div className="onboarding-decor bottom-right">长生</div>
      <section className="onboarding-card paper-card">
        <div className="large-seal">长生簿</div>
        <div className="eyebrow">长生簿 · 初页</div>
        <h1>你的故事，从一页空白开始。</h1>
        <p className="intro-copy">这是一个不需要一直盯着屏幕的修仙世界。安排一次修行，合上长生簿；等你下次回来时，看看这段时间替你发生了什么。</p>

        <label className="field-label" htmlFor="character-name">为这一世留下名字</label>
        <input
          id="character-name"
          className="name-input"
          value={name}
          maxLength={12}
          onChange={(event) => setName(event.target.value)}
          placeholder="请输入角色名"
        />

        <div className="field-label talent-label">选择一项先天天赋</div>
        <div className="talent-options">
          {talentOptions.map((talent) => (
            <button
              key={talent.id}
              className={`talent-option ${selectedTalentId === talent.id ? 'selected' : ''}`}
              onClick={() => setSelectedTalentId(talent.id)}
            >
              <span className="option-radio">{selectedTalentId === talent.id ? '●' : '○'}</span>
              <span><strong>{talent.name}</strong><small>{talent.summary}</small></span>
            </button>
          ))}
        </div>
        <div className="selected-effect">天赋：{selectedTalent.effect}</div>
        <button className="primary-button begin-button" onClick={() => onCreate(name, selectedTalent)}>
          落笔，开始这一世 <span>→</span>
        </button>
        <div className="onboarding-footnote">本版本使用浏览器本地存档 · 默认静音 · 随时可以导出备份</div>
      </section>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="stat-item"><span>{label}</span><strong>{value}</strong></div>
);

const BrandLogo = () => (
  <div className="brand-logo" role="img" aria-label="长生簿 Logo">
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <title>长生簿</title>
      <rect x="1" y="1" width="46" height="46" rx="9" fill="var(--red)" />
      <rect x="6" y="6" width="36" height="36" rx="6" fill="none" stroke="var(--paper)" strokeOpacity=".42" />
      <path d="M11 28.5c4-2 8-1.7 13 1.1v8.1c-5-2.8-9-3.1-13-1.1z" fill="var(--paper)" />
      <path d="M37 28.5c-4-2-8-1.7-13 1.1v8.1c5-2.8 9-3.1 13-1.1z" fill="var(--paper)" />
      <path d="M24 29.7v8" stroke="var(--red)" strokeWidth="1.3" />
      <path d="M10.5 21c4-7.7 16.4-10.6 24.7-4.6 2.3 1.7 3.8 3.8 4.4 6.1" fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="35.8" cy="14.5" r="2" fill="var(--gold)" />
      <path d="M13.5 24.5h7M27.5 24.5h7" stroke="var(--red)" strokeOpacity=".42" strokeWidth="1" />
    </svg>
  </div>
);

const TabButton = ({ active, label, badge, onClick }: { active: boolean; label: string; badge?: number; onClick: () => void }) => (
  <button className={`tab-button ${active ? 'active' : ''}`} onClick={onClick}>
    {label}{badge ? <span className="tab-badge">{badge}</span> : null}
  </button>
);

const LedgerView = ({ entries, onRead, onReadAll, action, now }: {
  entries: LedgerEntry[];
  onRead: (entryId: string) => void;
  onReadAll: () => void;
  action: GameState['character']['currentAction'];
  now: number;
}) => (
  <div className="view-stack">
    <section className="hero-panel">
      <div>
        <div className="eyebrow">YOUR JOURNEY · 你的修行</div>
        <h2>长生簿</h2>
        <p>每一次选择，都会在这里留下墨迹。</p>
      </div>
      <div className="hero-ornament">☽</div>
    </section>
    <CurrentActionCard action={action} now={now} />
    <div className="section-heading ledger-heading">
      <div><span>最近记录</span><small>按时间倒序排列</small></div>
      <button className="text-button" onClick={onReadAll}>全部标为已读</button>
    </div>
    <div className="ledger-list">
      {entries.map((entry) => (
        <article className={`ledger-entry ${entry.read ? '' : 'unread'}`} key={entry.id} onClick={() => onRead(entry.id)}>
          <div className="entry-spine"><span>{entry.read ? '·' : '✦'}</span></div>
          <div className="entry-content">
            <div className="entry-meta"><span className="entry-category">{categoryLabel[entry.category]}</span><time>{formatTimestamp(entry.createdAt)}</time></div>
            <h3>{entry.title}</h3>
            <p>{entry.body}</p>
            <div className="entry-tags">{entry.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </div>
        </article>
      ))}
    </div>
  </div>
);

const CurrentActionCard = ({ action, now }: { action: GameState['character']['currentAction']; now: number }) => {
  if (!action) {
    return <div className="empty-action"><span className="empty-action-icon">◌</span><div><strong>暂无安排中的修行</strong><span>去“修炼”页选择下一步行动，或让长生簿安静地等你回来。</span></div></div>;
  }
  const definition = ACTIONS[action.type];
  const explorationLocation = action.type === 'explore'
    ? EXPLORATION_LOCATIONS[action.locationId ?? 'qingstone-mountain']
    : null;
  const sectMission = action.type === 'sect_mission' && action.missionId
    ? getSectMission(action.missionId)
    : null;
  const total = action.endsAt - action.startedAt;
  const progress = Math.min(100, Math.max(0, ((now - action.startedAt) / total) * 100));
  return (
    <div className="current-action-card">
      <div className="action-icon large">{definition.icon}</div>
      <div className="action-card-main">
        <div className="action-card-top"><span className="eyebrow">CURRENT ACTION · 当前行动</span><strong>{formatRemaining(action.endsAt, now)}</strong></div>
        <h3>{explorationLocation ? `${definition.label} · ${explorationLocation.label}` : sectMission ? `${definition.label} · ${sectMission.title}` : definition.label}</h3>
        <p>{explorationLocation ? explorationLocation.summary : sectMission ? sectMission.summary : definition.description}</p>
        <div className="progress-track action-progress"><div style={{ width: `${progress}%` }} /></div>
      </div>
    </div>
  );
};

type ActionOptionProps = {
  type: ActionType;
  currentAction: GameState['character']['currentAction'];
  cave: GameState['cave'];
  sectId: SectId | null;
  selectedLocationId?: ExplorationLocationId;
  onStart: (type: ActionType, locationId?: ExplorationLocationId) => void;
};

const ActionOption = ({ type, currentAction, cave, sectId, selectedLocationId, onStart }: ActionOptionProps) => {
  const disabled = Boolean(currentAction);
  const action = ACTIONS[type];
  const locationId = selectedLocationId ?? 'qingstone-mountain';
  const explorationLocation = type === 'explore' ? EXPLORATION_LOCATIONS[locationId] : null;
  const durationMinutes = getActionDurationMinutes(type, cave, locationId, sectId);
  const detail = explorationLocation
    ? explorationLocation.risk
    : type === 'study' && durationMinutes < action.durationMinutes
      ? `${action.risk} · 藏经阁已缩短时间`
      : action.risk;

  return (
    <article className={`action-option ${disabled ? 'disabled' : ''}`}>
      <div className="action-icon">{action.icon}</div>
      <div className="action-option-copy">
        <div className="action-option-title">
          <h3>{explorationLocation ? `${action.label} · ${explorationLocation.label}` : action.label}</h3>
          <span>{durationMinutes} 分钟</span>
        </div>
        <p>{explorationLocation ? explorationLocation.summary : action.description}</p>
        <small>{detail}</small>
      </div>
      <button
        className="secondary-button"
        disabled={disabled}
        onClick={() => onStart(type, type === 'explore' ? locationId : undefined)}
      >
        {disabled ? '行动中' : '安排'}
      </button>
    </article>
  );
};

const CULTIVATION_NOTES = [
  '修为是一条河，根骨是河床，心境则决定你能不能听见水流真正的方向。',
  '今天不必追求异象。把每一口气送到该去的地方，也是一种难得的进境。',
  '真正可靠的修士，知道什么时候向前，什么时候把散乱的念头收回自己身上。',
  '功法不是替你做决定的答案，而是一盏灯：最后要走哪条路，仍然要由你落脚。',
];

const CultivationPulse = ({ attributes, cultivationPath, currentAction, canBreakthrough }: {
  attributes: GameState['character']['attributes'];
  cultivationPath: GameState['cultivationPath'];
  currentAction: GameState['character']['currentAction'];
  canBreakthrough: boolean;
}) => {
  const mentalState = attributes.mentalState;
  const mentalStatus = mentalState < 40
    ? { label: '心神微乱', detail: '先收拢念头，再追赶修为。' }
    : mentalState < 70
      ? { label: '心境可用', detail: '可以稳步修炼，也可以小试险招。' }
      : { label: '心境清明', detail: '灵气与念头都在较好的位置。' };
  const technique = getActiveTechnique(cultivationPath);
  const advice = currentAction
    ? { title: `专心完成「${ACTIONS[currentAction.type].label}」`, body: '一次只做一件事。等这段功课结束，长生簿会把真正的变化记下来。' }
    : canBreakthrough
      ? { title: '关隘已在眼前', body: '修为已经触及瓶颈，可以先用淬体或参悟稳住状态，再决定是否叩关。' }
      : mentalState < 40
        ? { title: '先静观参悟', body: '心境偏低时，极限运功的代价会更明显。先让神识恢复清明，下一轮吐纳会更稳。' }
        : attributes.physique < attributes.spiritSense
          ? { title: '今天适合淬体炼骨', body: '神识已经走在根骨前面，花一段时间把身体补上来，会让后续修炼更扎实。' }
          : { title: '以平稳吐纳积累', body: '当前状态适合把时间交给周天。等修为接近关隘，再用险招换取突破窗口。' };
  const note = CULTIVATION_NOTES[new Date().getDate() % CULTIVATION_NOTES.length];

  return (
    <section className="cultivation-pulse paper-card">
      <div className="cultivation-pulse-heading">
        <div>
          <div className="eyebrow">READ THE INNER CURRENT · 观内在气象</div>
          <h3>今日修炼脉象</h3>
          <p>{note}</p>
        </div>
        <span className={`pulse-status ${mentalState < 40 ? 'uneasy' : mentalState >= 70 ? 'clear' : ''}`}>{mentalStatus.label}</span>
      </div>
      <div className="cultivation-pulse-grid">
        <div className="pulse-metric pulse-metric-wide">
          <div className="pulse-metric-top"><span>心境</span><strong>{mentalState} / 100</strong></div>
          <div className="progress-track pulse-progress"><div style={{ width: `${mentalState}%` }} /></div>
          <small>{mentalStatus.detail}</small>
        </div>
        <div className="pulse-metric"><div className="pulse-metric-top"><span>根骨</span><strong>{attributes.physique}</strong></div><small>身体承载灵气的底子</small></div>
        <div className="pulse-metric"><div className="pulse-metric-top"><span>神识</span><strong>{attributes.spiritSense}</strong></div><small>感知危险与细微灵机</small></div>
        <div className="pulse-metric"><div className="pulse-metric-top"><span>当前功法</span><strong>{technique ? technique.name : '未择'}</strong></div><small>{technique ? '参悟与研读会继续积累熟练度' : '去功法页选择一条修行道路'}</small></div>
      </div>
      <div className="cultivation-advice"><span>修炼建议</span><div><strong>{advice.title}</strong><p>{advice.body}</p></div></div>
    </section>
  );
};

const CultivationView = ({ currentAction, now, cave, sectId, attributes, cultivationPath, canBreakthrough, onStart, onBreakthrough }: {
  currentAction: GameState['character']['currentAction'];
  now: number;
  cave: GameState['cave'];
  sectId: SectId | null;
  attributes: GameState['character']['attributes'];
  cultivationPath: GameState['cultivationPath'];
  canBreakthrough: boolean;
  onStart: (type: ActionType, locationId?: ExplorationLocationId) => void;
  onBreakthrough: () => void;
}) => (
  <div className="view-stack">
    <section className="page-heading">
      <div><div className="eyebrow">THE DAILY PRACTICE · 日常功课</div><h2>修炼</h2><p>从吐纳、淬体、参悟到险行，按身体和心境选择今天的功课。</p></div>
      <div className="heading-stamp">静心</div>
    </section>
    <CultivationPulse attributes={attributes} cultivationPath={cultivationPath} currentAction={currentAction} canBreakthrough={canBreakthrough} />
    {currentAction && <CurrentActionCard action={currentAction} now={now} />}
    {canBreakthrough && (
      <section className="breakthrough-card">
        <div><span className="eyebrow">A GATE AWAITS · 关隘已至</span><h3>你的修为已经触及当前瓶颈。</h3><p>继续修炼可以夯实根基，也可以现在尝试突破。</p></div>
        <button className="primary-button" onClick={onBreakthrough}>尝试突破</button>
      </section>
    )}
    <section className="action-section">
      <div className="section-intro">
        <div><span className="eyebrow">CHOOSE YOUR PRACTICE · 选择今日功课</span><h3>今天怎么修炼</h3></div>
        <span>一次只能安排一项行动 · 不同功课会改变不同底子</span>
      </div>
      <div className="action-grid practice-action-grid">
        <ActionOption type="meditate" currentAction={currentAction} cave={cave} sectId={sectId} onStart={onStart} />
        <ActionOption type="temper" currentAction={currentAction} cave={cave} sectId={sectId} onStart={onStart} />
        <ActionOption type="insight" currentAction={currentAction} cave={cave} sectId={sectId} onStart={onStart} />
        <ActionOption type="overdrive" currentAction={currentAction} cave={cave} sectId={sectId} onStart={onStart} />
      </div>
    </section>
    {currentAction && <div className="hint-note">当前行动还剩 {formatRemaining(currentAction.endsAt, now)}。你可以关闭网页，回来时查看长生簿。</div>}
  </div>
);

const TechniqueView = ({ currentAction, now, cave, sectId, inventory, cultivationPath, onChooseSchool, onResearchBranch, onStart }: {
  currentAction: GameState['character']['currentAction'];
  now: number;
  cave: GameState['cave'];
  sectId: SectId | null;
  inventory: GameState['inventory'];
  cultivationPath: GameState['cultivationPath'];
  onChooseSchool: (schoolId: CultivationSchoolId) => void;
  onResearchBranch: (branchId: string) => void;
  onStart: (type: ActionType, locationId?: ExplorationLocationId) => void;
}) => (
  <div className="view-stack">
    <section className="page-heading">
      <div><div className="eyebrow">THE WAY WITHIN · 内在功法</div><h2>功法</h2><p>选择一条道路，研读残卷，把一门功法走深。</p></div>
      <div className="heading-resource"><span>功法残页</span><strong>{inventory.techniqueFragments}</strong></div>
    </section>
    {currentAction && <CurrentActionCard action={currentAction} now={now} />}
    <TechniquePathPanel
      cultivationPath={cultivationPath}
      inventory={inventory}
      onChooseSchool={onChooseSchool}
      onResearchBranch={onResearchBranch}
    />
    <section className="technique-study-card paper-card">
      <div className="section-intro">
        <div><span className="eyebrow">STUDY THE FRAGMENTS · 研读残卷</span><h3>让功法继续生长</h3></div>
        <span>研读会提升功法熟练度</span>
      </div>
      <ActionOption type="study" currentAction={currentAction} cave={cave} sectId={sectId} onStart={onStart} />
    </section>
    {currentAction && <div className="hint-note">当前行动还剩 {formatRemaining(currentAction.endsAt, now)}。你可以关闭网页，回来时查看长生簿。</div>}
  </div>
);

const ExplorationView = ({ currentAction, now, cave, sectId, discoveredLocations, pendingEvent, selectedLocationId, onLocationChange, onStart, onResolveEvent }: {
  currentAction: GameState['character']['currentAction'];
  now: number;
  cave: GameState['cave'];
  sectId: SectId | null;
  discoveredLocations: string[];
  pendingEvent: ReturnType<typeof getExplorationEvent> | null;
  selectedLocationId: ExplorationLocationId;
  onLocationChange: (locationId: ExplorationLocationId) => void;
  onStart: (type: ActionType, locationId?: ExplorationLocationId) => void;
  onResolveEvent: (choiceId: string) => void;
}) => (
  <div className="view-stack">
    <section className="page-heading">
      <div><div className="eyebrow">BEYOND THE GATE · 山门之外</div><h2>探索</h2><p>选择一个已经发现的地方，看看山河里藏着什么。</p></div>
      <div className="heading-resource"><span>已发现</span><strong>{discoveredLocations.length}/{Object.keys(EXPLORATION_LOCATIONS).length}</strong></div>
    </section>
    {pendingEvent && (
      <section className="exploration-event-card paper-card">
        <div className="event-card-heading"><div><div className="eyebrow">{pendingEvent.eyebrow}</div><h3>{pendingEvent.title}</h3></div><span className="event-mark">✦</span></div>
        <p className="event-summary">{pendingEvent.summary}</p>
        <div className="event-choice-grid">
          {pendingEvent.choices.map((choice) => (
            <button className="event-choice" key={choice.id} onClick={() => onResolveEvent(choice.id)}>
              <strong>{choice.label}</strong>
              <span>{choice.summary}</span>
            </button>
          ))}
        </div>
      </section>
    )}
    {currentAction && <CurrentActionCard action={currentAction} now={now} />}
    <section className="exploration-workbench">
      <ExplorationPicker
        discoveredLocations={discoveredLocations}
        selectedLocationId={selectedLocationId}
        disabled={Boolean(currentAction)}
        onChange={onLocationChange}
      />
      <section className="exploration-action-card paper-card">
        <div className="section-intro">
          <div><span className="eyebrow">SET OUT · 动身</span><h3>准备好就出发</h3></div>
          <span>地点会影响耗时、风险和收获</span>
        </div>
        <ActionOption type="explore" currentAction={currentAction} cave={cave} sectId={sectId} selectedLocationId={selectedLocationId} onStart={onStart} />
      </section>
    </section>
    {currentAction && <div className="hint-note">当前行动还剩 {formatRemaining(currentAction.endsAt, now)}。你可以关闭网页，回来时查看长生簿。</div>}
  </div>
);

const formatTechniqueEffects = (effects: TechniqueDefinition['branches'][number]['effects']) => {
  const labels: string[] = [];
  if (effects.cultivationMultiplier) labels.push(`修炼收益 +${Math.round(effects.cultivationMultiplier * 100)}%`);
  if (effects.explorationStoneBonus) labels.push(`探索灵石 +${effects.explorationStoneBonus}`);
  if (effects.studyFragmentBonus) labels.push(`研读残页 +${effects.studyFragmentBonus}`);
  if (effects.studyProficiencyBonus) labels.push(`研读熟练度 +${effects.studyProficiencyBonus}`);
  return labels.length > 0 ? labels.join(' · ') : '效果：稳住根基';
};

const TechniquePathPanel = ({ cultivationPath, inventory, onChooseSchool, onResearchBranch }: {
  cultivationPath: GameState['cultivationPath'];
  inventory: GameState['inventory'];
  onChooseSchool: (schoolId: CultivationSchoolId) => void;
  onResearchBranch: (branchId: string) => void;
}) => {
  const school = cultivationPath.schoolId ? CULTIVATION_SCHOOLS[cultivationPath.schoolId] : null;
  const technique = getActiveTechnique(cultivationPath);
  const progress = getTechniqueProgress(cultivationPath);

  if (!school || !technique || !progress) {
    return (
      <section className="technique-path-panel paper-card">
        <div className="technique-panel-heading">
          <div>
            <div className="eyebrow">THE FIRST LINE · 功法流派</div>
            <h3>先选一条，走深一点</h3>
            <p>流派一经选定，这一世便不再改修。不同道路会改变日常修炼、探索和研读的回报。</p>
          </div>
          <span className="technique-fragment-count">残页 {inventory.techniqueFragments}</span>
        </div>
        <div className="school-grid">
          {Object.values(CULTIVATION_SCHOOLS).map((candidate) => (
            <article className="school-card" key={candidate.id}>
              <div className="school-card-top"><span className="school-icon">{candidate.icon}</span><strong>{candidate.label}</strong></div>
              <p>{candidate.summary}</p>
              <small>{candidate.style}</small>
              <button className="secondary-button" onClick={() => onChooseSchool(candidate.id)}>选择此道</button>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="technique-path-panel paper-card">
      <div className="technique-panel-heading">
        <div>
          <div className="eyebrow">THE PATH YOU CHOSE · 功法流派</div>
          <h3>{school.label} · {technique.name}</h3>
          <p>{technique.grade} · {technique.summary}</p>
        </div>
        <div className="technique-resource"><span>功法残页</span><strong>{inventory.techniqueFragments}</strong></div>
      </div>
      <div className="technique-proficiency">
        <div className="progress-label"><span>功法熟练度</span><strong>{progress.proficiency} / 100</strong></div>
        <div className="progress-track technique-progress-track"><div style={{ width: `${progress.proficiency}%` }} /></div>
        <small>研读残卷会提升熟练度；熟练度达到门槛后，可消耗功法残页研究新的分支。</small>
      </div>
      <div className="technique-branch-grid">
        {technique.branches.map((branch) => {
          const unlocked = progress.unlockedBranchIds.includes(branch.id);
          const active = progress.activeBranchId === branch.id;
          const meetsProficiency = progress.proficiency >= branch.requiredProficiency;
          const canAfford = inventory.techniqueFragments >= branch.costTechniqueFragments;
          const disabled = active || (!unlocked && (!meetsProficiency || !canAfford));
          const buttonLabel = active
            ? '当前修习'
            : unlocked
              ? '转修此支'
              : meetsProficiency && canAfford
                ? '研究分支'
                : branch.requiredProficiency > progress.proficiency
                  ? `熟练度 ${branch.requiredProficiency} 解锁`
                  : `需要残页 ${branch.costTechniqueFragments}`;
          return (
            <article className={`technique-branch-card ${active ? 'active' : ''} ${unlocked ? '' : 'locked'}`} key={branch.id}>
              <div className="branch-card-top"><strong>{branch.label}</strong><span>{branch.requiredProficiency === 0 ? '入门' : `熟练度 ${branch.requiredProficiency}`}</span></div>
              <p>{branch.summary}</p>
              <small className="branch-effect">{formatTechniqueEffects(branch.effects)}</small>
              <div className="branch-card-footer">
                <small>{branch.costTechniqueFragments > 0 ? `消耗残页 ${branch.costTechniqueFragments}` : '无需消耗'}</small>
                <button className="secondary-button" disabled={disabled} onClick={() => onResearchBranch(branch.id)}>{buttonLabel}</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

const ExplorationPicker = ({ discoveredLocations, selectedLocationId, disabled, onChange }: {
  discoveredLocations: string[];
  selectedLocationId: ExplorationLocationId;
  disabled: boolean;
  onChange: (locationId: ExplorationLocationId) => void;
}) => (
  <section className="exploration-panel paper-card">
    <div className="exploration-panel-heading">
      <div><div className="eyebrow">WHERE THE WIND LEADS · 探索地点</div><h3>选择要去的地方</h3><p>不同地点会改变耗时、风险和可能带回的东西。</p></div>
      <span className="exploration-count">{discoveredLocations.length} / {Object.keys(EXPLORATION_LOCATIONS).length} 已发现</span>
    </div>
    <div className="location-grid">
      {(Object.values(EXPLORATION_LOCATIONS)).map((location) => {
        const unlocked = discoveredLocations.includes(location.id);
        const selected = selectedLocationId === location.id;
        return (
          <button
            className={`location-card ${selected ? 'selected' : ''} ${unlocked ? '' : 'locked'}`}
            disabled={disabled || !unlocked}
            key={location.id}
            onClick={() => onChange(location.id)}
          >
            <div className="location-card-top"><span className="location-icon">{location.icon}</span><span><strong>{location.label}</strong><small>{location.durationMinutes} 分钟 · {unlocked ? '已发现' : '未发现'}</small></span></div>
            <p>{unlocked ? location.summary : '？？？'}</p>
            <small className="location-risk">{unlocked ? location.risk : location.unlockHint}</small>
          </button>
        );
      })}
    </div>
  </section>
);

const formatSectEffects = (effects: ReturnType<typeof getSectEffects>) => {
  const labels: string[] = [];
  if (effects.cultivationMultiplier) labels.push(`修炼收益 +${Math.round(effects.cultivationMultiplier * 100)}%`);
  if (effects.explorationStoneBonus) labels.push(`探索灵石 +${effects.explorationStoneBonus}`);
  if (effects.studyFragmentBonus) labels.push(`研读残页 +${effects.studyFragmentBonus}`);
  if (effects.studyProficiencyBonus) labels.push(`研读熟练度 +${effects.studyProficiencyBonus}`);
  if (effects.studyDurationReduction) labels.push(`研读耗时 -${effects.studyDurationReduction} 分钟`);
  return labels.join(' · ');
};

const PeopleView = ({ social, currentAction, onResolveEvent, onJoinSect, onStartMission, onExchangeReputation }: {
  social: GameState['social'];
  currentAction: GameState['character']['currentAction'];
  onResolveEvent: (choiceId: string) => void;
  onJoinSect: (sectId: SectId) => void;
  onStartMission: (missionId: SectMissionId) => void;
  onExchangeReputation: (exchangeId: SectExchangeId) => void;
}) => {
  const pendingEvent = social.pendingPersonEvent ? getPersonEvent(social.pendingPersonEvent.eventId) : null;
  const joinedSect = social.sect.sectId ? SECTS[social.sect.sectId] : null;

  return (
    <div className="view-stack">
      <section className="page-heading">
        <div><div className="eyebrow">PEOPLE YOU MEET · 人物与宗门</div><h2>人间有约</h2><p>修仙不是把自己关进石室。你如何回应别人，也会决定别人如何记住你。</p></div>
        <div className="heading-stamp">有缘</div>
      </section>

      {pendingEvent ? (
        <section className="person-event-card paper-card">
          <div className="event-card-heading"><div><div className="eyebrow">{pendingEvent.eyebrow}</div><h3>{pendingEvent.title}</h3></div><span className="event-mark">✦</span></div>
          <p className="event-summary">{pendingEvent.summary}</p>
          <div className="event-choice-grid">
            {pendingEvent.choices.map((choice) => (
              <button className="event-choice" key={choice.id} onClick={() => onResolveEvent(choice.id)}>
                <strong>{choice.label}</strong>
                <span>{choice.summary}</span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <div className="hint-note">暂时没有需要回应的人物事件。继续探索、研读，或去无名古井走一趟，新的关系会在合适的时候找上门。</div>
      )}

      <section className="relationship-panel paper-card">
        <div className="social-panel-heading"><div><div className="eyebrow">THREADS OF FATE · 人物关系</div><h3>你遇见的人</h3></div><span>{Object.values(social.relationships).filter((relationship) => relationship.discovered).length} / {Object.keys(RELATIONSHIPS).length} 已相识</span></div>
        <div className="relationship-grid">
          {Object.values(RELATIONSHIPS).map((person) => {
            const relationship = social.relationships[person.id];
            const discovered = relationship.discovered;
            return (
              <article className={`relationship-card ${discovered ? '' : 'undiscovered'}`} key={person.id}>
                <div className="relationship-card-top"><span className="relationship-icon">{discovered ? person.icon : '?'}</span><div><strong>{discovered ? person.name : '未识之人'}</strong><small>{discovered ? person.title : '等待相逢'}</small></div></div>
                <p>{discovered ? person.introduction : '长生簿只记下了一个模糊的背影。也许下一次探索归来，名字就会落在纸上。'}</p>
                <div className="relationship-meta">{discovered ? <><span>{relationship.status}</span><span>好感 {relationship.affinity}</span></> : <span>尚未相识</span>}</div>
                {discovered && <small className="relationship-flavor">{person.flavor}</small>}
              </article>
            );
          })}
        </div>
      </section>

      <section className="sect-panel paper-card">
        <div className="social-panel-heading"><div><div className="eyebrow">A PLACE TO BELONG · 宗门</div><h3>{joinedSect ? `${joinedSect.name} · ${joinedSect.motto}` : '选择你的门墙'}</h3></div><span>{joinedSect ? `贡献 ${social.sect.contribution}` : social.sect.invited ? '已有引荐' : '尚未引荐'}</span></div>
        {joinedSect ? (
          <>
            <div className="joined-sect">
              <div className="joined-sect-icon">{joinedSect.icon}</div>
              <div><strong>你已是{joinedSect.name}弟子 · {getSectRank(social.sect.reputation)}</strong><p>{joinedSect.summary}</p><small className="sect-effects">声望 {social.sect.reputation} · {formatSectEffects(getSectEffects(joinedSect.id))}</small></div>
            </div>
            <div className="sect-mission-list">
              <div className="sect-mission-heading"><div><div className="eyebrow">THE SECT HAS WORK · 宗门任务</div><h4>今日差事</h4></div><span>{currentAction ? '行动中' : '可安排一项'}</span></div>
              <div className="mission-grid">
                {getSectMissions(joinedSect.id).map((mission) => (
                  <article className="mission-card" key={mission.id}>
                    <div className="mission-card-top"><strong>{mission.title}</strong><span>{mission.durationMinutes} 分钟</span></div>
                    <p>{mission.summary}</p>
                    <small className="mission-risk">{mission.risk}</small>
                    <small className="mission-reward">声望 +{mission.rewards.reputation} · 贡献 +{mission.rewards.contribution}{mission.rewards.spiritStones ? ` · 灵石 +${mission.rewards.spiritStones}` : ''}{mission.rewards.herbs ? ` · 灵草 +${mission.rewards.herbs}` : ''}{mission.rewards.techniqueFragments ? ` · 残页 +${mission.rewards.techniqueFragments}` : ''}</small>
                    <button className="secondary-button" disabled={Boolean(currentAction)} onClick={() => onStartMission(mission.id)}>{currentAction ? '行动中' : '安排任务'}</button>
                  </article>
                ))}
              </div>
            </div>
            <div className="sect-exchange-list">
              <div className="sect-mission-heading"><div><div className="eyebrow">MERIT EXCHANGE · 声望兑换</div><h4>名册能换来什么</h4></div><span>当前声望 {social.sect.reputation}</span></div>
              <div className="exchange-grid">
                {Object.values(SECT_EXCHANGES).map((exchange) => {
                  const canAfford = social.sect.reputation >= exchange.costReputation;
                  const reward = exchange.rewards.spiritStones
                    ? `灵石 +${exchange.rewards.spiritStones}`
                    : exchange.rewards.herbs
                      ? `灵草 +${exchange.rewards.herbs}`
                      : `功法残页 +${exchange.rewards.techniqueFragments}`;
                  return (
                    <article className="exchange-card" key={exchange.id}>
                      <strong>{exchange.label}</strong>
                      <p>{exchange.summary}</p>
                      <small>{reward} · 消耗声望 {exchange.costReputation}</small>
                      <button className="secondary-button" disabled={!canAfford} onClick={() => onExchangeReputation(exchange.id)}>{canAfford ? '兑换' : `还差 ${exchange.costReputation - social.sect.reputation}`}</button>
                    </article>
                  );
                })}
              </div>
            </div>
          </>
        ) : social.sect.invited ? (
          <>
            <p className="sect-intro">玄松道人替你写下了引荐。宗门会改变你的日常回报，但这一世只能选择一处门墙。</p>
            <div className="sect-grid">
              {Object.values(SECTS).map((sect) => (
                <article className="sect-card" key={sect.id}>
                  <div className="sect-card-top"><span className="sect-icon">{sect.icon}</span><div><strong>{sect.name}</strong><small>{sect.motto}</small></div></div>
                  <p>{sect.summary}</p>
                  <small className="sect-effects">{formatSectEffects(getSectEffects(sect.id))}</small>
                  <button className="secondary-button" onClick={() => onJoinSect(sect.id)}>拜入此门</button>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="sect-locked"><span className="locked-icon">门</span><div><strong>还没有宗门愿意替你担保</strong><p>完成玄松道人的人物事件，并在事件中询问宗门去处，才能看到可加入的门墙。</p></div></div>
        )}
      </section>
    </div>
  );
};

const CaveView = ({ cave, inventory, sectId, onCollect, onUpgrade }: {
  cave: GameState['cave'];
  inventory: GameState['inventory'];
  sectId: SectId | null;
  onCollect: () => void;
  onUpgrade: (buildingId: CaveBuildingId) => void;
}) => {
  if (!cave.unlocked) {
    return (
      <div className="view-stack">
        <section className="page-heading"><div><div className="eyebrow">A PLACE TO RETURN · 归处</div><h2>洞府</h2><p>这里还很简陋，但每一件物品都会见证你的岁月。</p></div><div className="heading-stamp">未筑</div></section>
        <div className="locked-feature paper-card"><div className="locked-icon">⌂</div><div><h3>洞府正在等待你</h3><p>完成第一次探索后，你会在山脚找到一处可以安身的石窟。届时聚灵阵、灵田与藏经阁将逐步开放。</p></div><span className="coming-soon">FIRST EXPLORATION</span></div>
      </div>
    );
  }

  const effects = getCaveEffects(cave);
  const studyDuration = getActionDurationMinutes('study', cave, undefined, sectId);
  const storedTotal = cave.stored.cultivation + cave.stored.herbs;
  return (
    <div className="view-stack">
      <section className="page-heading"><div><div className="eyebrow">A PLACE TO RETURN · 归处</div><h2>洞府</h2><p>石窟初成，灵气尚浅，但已经足够成为你在尘世中的一处归处。</p></div><div className="heading-stamp built">已筑</div></section>
      <section className="cave-overview paper-card">
        <div>
          <div className="eyebrow">OFFLINE PRODUCTION · 离线产出</div>
          <h3>洞府储藏</h3>
          <p>你离开后，已建成的设施会继续运转；最多结算 8 小时的离线产出。</p>
        </div>
        <div className="cave-stored-grid">
          <div><span>待收修为</span><strong>{cave.stored.cultivation}</strong></div>
          <div><span>待收灵草</span><strong>{cave.stored.herbs}</strong></div>
        </div>
        <button className="primary-button" disabled={storedTotal === 0} onClick={onCollect}>{storedTotal > 0 ? '收取产出' : '暂无产出'}</button>
      </section>
      <div className="cave-effect-note hint-note">
        当前效果：聚灵阵每小时积攒 {effects.cultivationPerHour} 点修为，灵田每小时产出 {effects.herbsPerHour} 株灵草；研读残卷需 {studyDuration} 分钟。
      </div>
      <div className="building-grid">
        {(Object.keys(CAVE_BUILDINGS) as CaveBuildingId[]).map((buildingId) => {
          const building = cave.buildings[buildingId];
          const info = CAVE_BUILDINGS[buildingId];
          const nextLevel = building.level + 1;
          const cost = getUpgradeCost(buildingId, nextLevel);
          const canAfford = Boolean(cost && inventory.spiritStones >= cost.spiritStones && inventory.herbs >= cost.herbs);
          const maxed = building.level >= CAVE_MAX_LEVEL;
          return (
            <article className="building-card paper-card" key={buildingId}>
              <div className="building-card-top"><div className="action-icon">{info.icon}</div><div><h3>{info.label}</h3><span>等级 {building.level} / {CAVE_MAX_LEVEL}</span></div></div>
              <p>{info.description}</p>
              <div className="building-levels">{Array.from({ length: CAVE_MAX_LEVEL }, (_, index) => <i className={index < building.level ? 'filled' : ''} key={index} />)}</div>
              <small className="building-effect">{info.effect}</small>
              <button className="secondary-button building-button" disabled={maxed || !canAfford} onClick={() => onUpgrade(buildingId)}>
                {maxed ? '已达最高级' : `${building.level === 0 ? '建造' : '升级'} · 灵石 ${cost?.spiritStones} / 灵草 ${cost?.herbs}`}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
};

const CodexView = ({ game }: { game: GameState }) => (
  <div className="view-stack">
    <section className="page-heading"><div><div className="eyebrow">WHAT YOU HAVE SEEN · 记录与发现</div><h2>图鉴</h2><p>你走过的地方、读过的残卷，都会在此留下索引。</p></div><div className="heading-stamp">初录</div></section>
    <div className="codex-grid">
      {Object.values(EXPLORATION_LOCATIONS).map((location, index) => {
        const discovered = game.discoveredLocations.includes(location.id);
        return <div className={`codex-card ${discovered ? '' : 'locked'}`} key={location.id}><span className="codex-number">{String(index + 1).padStart(2, '0')}</span><div><strong>{location.label}</strong><p>{discovered ? location.atmosphere : location.unlockHint}</p></div><span className="discovered-mark">{discovered ? '已发现' : '未解锁'}</span></div>;
      })}
      <div className="codex-card"><span className="codex-number">天赋</span><div><strong>已选天赋</strong><p>{game.character.talents.map((talent) => talent.name).join('、')}</p></div><span className="discovered-mark">本世</span></div>
    </div>
  </div>
);

export default App;
