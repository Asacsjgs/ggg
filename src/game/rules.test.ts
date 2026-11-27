import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALLIED_HUMVEE_STATIONS,
  ALLIED_MLRS_CONFIG,
  ALLIED_MLRS_STATIONS,
  ALLIED_TANK_STATIONS,
  CARRIER_OPERATIONS,
  CITY_AREA_SQM,
  CITY_BUILDING_SPECS,
  CONVOY_ESCORT_STAGING,
  COVER_BARRIER_SPECS,
  DEFAULT_TANK_ORDER,
  DESERT_TUNNEL_MAX_RANGE,
  DESERT_TUNNEL_SPECS,
  FORTIFIED_DESERT_REGION,
  FORTIFIED_TRAINING_BASE,
  FRONTLINE_SOLDIER_SLOTS,
  HUMVEE_CONFIG,
  ISIS_BLOCK_SPECS,
  MAX_ALLIED_SOLDIERS,
  MAX_ENEMY_SOLDIERS,
  MIN_SHIELDED_HP,
  MOSQUE_SPECS,
  NATION_WALL_SPECS,
  OUR_HQ_COMPLEX,
  PLAYER_JET_CONFIGS,
  PLAYER_TANK_CONFIG,
  RESIDENTIAL_HOUSE_SPECS,
  SECRET_SITE_SPECS,
  STRATEGIC_SAM_POSITIONS,
  SUPPORT_OP_COOLDOWNS,
  TRAINING_CENTER_SPECS,
  UNIFIED_FIGHTER_CODE,
  WEAPON_ORDER,
  WORLD_OBSTACLES,
  WORLD_PLAYABLE_BOUNDS,
  advanceSeekerLock,
  applyBaseDamage,
  applyEmbassyAttack,
  applyInfraDamage,
  buildNationPerimeterWallSpecs,
  checkElectricFenceCollision,
  computeCarrierApproachStep,
  computeNukeSplashDamage,
  computeObstacleAwareStep,
  computeRadarDetection,
  computeReinforcementCount,
  computeSamFlightStep,
  computeWarWaveConfig,
  createInitialEmbassies,
  createInitialInfrastructure,
  createInitialSecretSites,
  createInitialUpgrades,
  findNearestCoverBarrier,
  getEnvironmentTacticalModifiers,
  getForeignPalaceApproachPoint,
  getHostileForceCap,
  getNationMilitaryBasePos,
  getWalkableElevationAt,
  getWeaponStats,
  isAirDefenseSamWeapon,
  isCommanderPositionValid,
  isInsideCityEmbassy,
  isInsideForeignPalace,
  isInsideOurEmbassy,
  isNearForeignPalaceChair,
  isNearHqDesk,
  isNearIntelConsole,
  isWithinDesertTunnelRange,
  purchaseUpgrade,
  resolveCircleObstacleCollision,
  resolveNegotiationAction,
  shouldMobilizeReserves,
} from './rules';
import {
  NATION_SPECS,
  canLaunchDiplomaticConvoy,
  createInitialNations,
  getPeaceUpgradeCostMultiplier,
  setNationWarState,
} from './nations';

test('peace holds initially until an embassy or presidential palace is attacked', () => {
  const embassies = createInitialEmbassies();
  assert.equal(embassies.length, 3);
  assert.ok(embassies.every((e) => !e.atWar && e.palaceHp > 0 && e.maxHp >= 800));
  assert.deepEqual(getHostileForceCap(0), { maxAircraft: 0, maxSoldiers: 0, maxArmor: 0 });

  // Attacking a Presidential Palace triggers war cleanly
  const firstHit = applyEmbassyAttack(embassies, 'us_embassy', 120, 'palace');
  assert.equal(firstHit.newlyDeclaredWar, true);
  assert.equal(firstHit.anyWarDeclared, true);
  assert.equal(firstHit.nextEmbassies.find((e) => e.id === 'us_embassy')?.atWar, true);
  assert.equal(firstHit.nextEmbassies.find((e) => e.id === 'us_embassy')?.palaceHp, 980);

  const cap1 = getHostileForceCap(1);
  const cap3 = getHostileForceCap(3);
  assert.equal(cap1.maxAircraft, 4);
  assert.equal(cap1.maxArmor, 2);
  assert.equal(cap3.maxAircraft, 7);
  assert.equal(cap3.maxArmor, 4);
  assert.equal(cap3.maxSoldiers, MAX_ENEMY_SOLDIERS);
});

test('strategic infrastructure destruction & weather/night modulate battlefield tactics', () => {
  const infra = createInitialInfrastructure();
  assert.equal(infra.length, 4);

  const powerHit = applyInfraDamage(infra, 'power_plant', 400);
  assert.equal(powerHit.justDestroyed, true);
  const commsHit = applyInfraDamage(powerHit.nextInfra, 'comms_radar', 300);

  const nightMods = getEnvironmentTacticalModifiers({
    timeOfDay: 'night',
    weather: 'storm',
    infra: commsHit.nextInfra,
    ewJamActive: true,
  });

  // Power plant destroyed -> city blackout even at night
  assert.equal(nightMods.cityLightsOn, false);
  assert.ok(nightMods.visibilityFactor < 0.6);
  assert.ok(nightMods.radarRangeFactor < 1.0);
  assert.ok(nightMods.enemyAccuracyFactor < 0.2);
});

test('our large embassy and live intelligence console spatial triggers work accurately', () => {
  assert.equal(isInsideOurEmbassy(0, 4), false);
  assert.equal(isInsideOurEmbassy(0, 15), true);
  assert.equal(isNearIntelConsole(0, 21), true);
  assert.equal(isNearIntelConsole(11, 21), false);
});

test('flyable stealth and Russian jets plus all 9 weapons scale cleanly', () => {
  const upgrades = createInitialUpgrades();
  assert.equal(WEAPON_ORDER.length, 9);
  assert.equal(PLAYER_JET_CONFIGS.stealth_jet.labelShort, 'شبح');
  assert.equal(PLAYER_JET_CONFIGS.ru_jet.labelShort, 'روسية');

  const laser = getWeaponStats('laser', upgrades);
  const hyper = getWeaponStats('hypersonic', upgrades);
  assert.equal(laser.isLaser, true);
  assert.equal(hyper.isHypersonic, true);
  assert.ok(hyper.projectileSpeed > 320);
  assert.ok(hyper.damage > 350);
});

test('seeker lock, no-defeat shield, upgrades, and stealth radar detection behave properly', () => {
  let lock = 0;
  for (let i = 0; i < 10; i++) {
    lock = advanceSeekerLock({
      currentLock: lock,
      hasTargetInCone: true,
      ndcDist: 0.03,
      isStealth: false,
      canHardLockStealth: true,
      radarLevel: 2,
      dt: 0.1,
    });
  }
  assert.ok(lock >= 0.85);

  const stealthFar = computeRadarDetection({
    enemyType: 'stealth',
    distance: 260,
    bearingRad: 2.8,
    radarAngleRad: 0.1,
    radarLevel: 1,
    previousStrength: 0,
    dt: 0.1,
  });
  assert.equal(stealthFar.canLockHoming, false);

  const shieldRes = applyBaseDamage(18, 95);
  assert.equal(shieldRes.nextHp, MIN_SHIELDED_HP);
  assert.equal(shieldRes.isDefeated, false);

  const upg = purchaseUpgrade('radarLevel', createInitialUpgrades(), 2000);
  assert.equal(upg.purchased, true);
  assert.equal(upg.upgrades.radarLevel, 2);
});

test('200 allied / 60 enemy troop caps, Humvees, MLRS, and fortified training base specs are accurate', () => {
  assert.equal(MAX_ALLIED_SOLDIERS, 200);
  assert.equal(MAX_ENEMY_SOLDIERS, 60);
  assert.equal(TRAINING_CENTER_SPECS.length, 2);
  assert.equal(computeReinforcementCount(100), 50);
  assert.equal(computeReinforcementCount(170), 30);
  assert.equal(computeReinforcementCount(200), 0);

  assert.equal(ALLIED_TANK_STATIONS.length, 6);
  assert.equal(ALLIED_HUMVEE_STATIONS.length, 4);
  assert.equal(ALLIED_MLRS_STATIONS.length, 2);
  assert.ok(HUMVEE_CONFIG.maxHp >= 200 && ALLIED_MLRS_CONFIG.salvoCount >= 6);
  assert.equal(FORTIFIED_TRAINING_BASE.parkedJets.length, 2);

  // Open-gate embassy courtyard allows entry through front gate while side fence blocks clipping
  const embassyFrontGate = checkElectricFenceCollision(-56, -84.5);
  assert.equal(embassyFrontGate.blocked, false);
  assert.equal(isInsideCityEmbassy(-56, -96), 'us_embassy');
  const sideFence = checkElectricFenceCollision(-56 + 14.5, -96);
  assert.equal(sideFence.blocked, true);
  assert.equal(sideFence.embassyId, 'us_embassy');
  assert.equal(computeNukeSplashDamage(0, -148, 0, -148), 650);
  assert.equal(computeNukeSplashDamage(0, -148, 160, -148), 0);
});

test('walkable elevation ramps, watchtowers, embassy rooftop, tank mode, and artillery config work accurately', () => {
  assert.equal(getWalkableElevationAt(0, 4, 0), 0);
  assert.equal(getWalkableElevationAt(0, 20, 0.25), 0.25);
  const midStair = getWalkableElevationAt(16, 19.25, 2.0);
  assert.ok(midStair > 2.5 && midStair < 4.5);
  const topStair = getWalkableElevationAt(16, 27.5, 6.2);
  assert.equal(topStair, 6.55);
  assert.equal(getWalkableElevationAt(0, 20, 6.55), 6.55);

  assert.equal(getWalkableElevationAt(-22, -14.5, 0), 0);
  assert.ok(getWalkableElevationAt(-22, -10.0, 2.5) > 2.5);
  assert.equal(getWalkableElevationAt(-22, -2.0, 6.2), 6.2);
  assert.equal(getWalkableElevationAt(22, -2.0, 6.2), 6.2);

  assert.equal(SUPPORT_OP_COOLDOWNS.artillery_barrage, 18);
  assert.ok(PLAYER_TANK_CONFIG.maxHp >= 500 && PLAYER_TANK_CONFIG.cannonDamage >= 280);
});

test('carrier deck takeoff/landing approach and unified fighter code work accurately', () => {
  assert.equal(UNIFIED_FIGHTER_CODE, 'F-IQ22');
  assert.equal(SUPPORT_OP_COOLDOWNS.joint_strike, 14);
  assert.ok(CARRIER_OPERATIONS.catapultStart[0] > 180);

  let state = {
    x: CARRIER_OPERATIONS.approachEntry[0],
    y: CARRIER_OPERATIONS.approachEntry[1],
    z: CARRIER_OPERATIONS.approachEntry[2],
    speed: 62,
    touchedDown: false,
  };

  for (let i = 0; i < 90 && !state.touchedDown; i++) {
    const step = computeCarrierApproachStep({
      x: state.x,
      y: state.y,
      z: state.z,
      speed: state.speed,
      dt: 0.1,
    });
    state = { x: step.x, y: step.y, z: step.z, speed: step.speed, touchedDown: step.touchedDown };
  }
  assert.equal(state.touchedDown, true);
  assert.equal(state.y, CARRIER_OPERATIONS.deckY);
});

test('600,000 m2 city houses, mosques, skyscrapers, and fortified training walls block clipping while keeping gate passable', () => {
  assert.equal(CITY_AREA_SQM, 600_000);
  const playableArea =
    (WORLD_PLAYABLE_BOUNDS.maxX - WORLD_PLAYABLE_BOUNDS.minX) *
    (WORLD_PLAYABLE_BOUNDS.maxZ - WORLD_PLAYABLE_BOUNDS.minZ);
  assert.ok(playableArea >= 500_000);
  assert.ok(CITY_BUILDING_SPECS.length >= 45);
  assert.ok(RESIDENTIAL_HOUSE_SPECS.length >= 120);
  assert.equal(MOSQUE_SPECS.length, 8);
  assert.ok(WORLD_OBSTACLES.length >= 180);

  // Pushing a unit placed inside residential house #0 or skyscraper #0 pushes it outside
  const firstHouse = RESIDENTIAL_HOUSE_SPECS[0];
  const housePush = resolveCircleObstacleCollision(firstHouse.x, firstHouse.z, 1.0, WORLD_OBSTACLES);
  assert.equal(housePush.collided, true);
  assert.equal(
    resolveCircleObstacleCollision(housePush.x, housePush.z, 0.9, WORLD_OBSTACLES).collided,
    false,
  );

  // Desert Mega-Base perimeter wall blocks wall crossing, while northern gate (x=-220, z=470) stays passable
  const wallHit = resolveCircleObstacleCollision(-270, 470, 1.0, WORLD_OBSTACLES);
  assert.equal(wallHit.collided, true);
  const gatePass = resolveCircleObstacleCollision(-220, 470, 2.2, WORLD_OBSTACLES);
  assert.equal(gatePass.collided, false);

  // Simulate a tank (radius 3.3) navigating straight across skyscraper #0 toward (-24, -64)
  let tx = -24;
  let tz = -30;
  for (let i = 0; i < 65; i++) {
    const step = computeObstacleAwareStep({
      x: tx,
      z: tz,
      destX: -24,
      destZ: -68,
      speed: 7,
      dt: 0.1,
      radius: 3.3,
    });
    tx = step.x;
    tz = step.z;
    const insideBuilding = CITY_BUILDING_SPECS.some(
      (b) => Math.abs(tx - b.x) < b.w * 0.5 && Math.abs(tz - b.z) < b.d * 0.5,
    );
    assert.equal(insideBuilding, false, `Tank entered skyscraper at step ${i}`);
  }
  assert.ok(tz < -38);
});

test('vertical sky-arcing SAM interceptors climb above rooftops and never dive into houses or streets', () => {
  assert.equal(isAirDefenseSamWeapon('patriot'), true);
  assert.equal(isAirDefenseSamWeapon('thaad'), true);
  assert.equal(isAirDefenseSamWeapon('s400'), true);
  assert.equal(isAirDefenseSamWeapon('hq9'), true);
  assert.equal(isAirDefenseSamWeapon('rifle'), false);

  let sam = {
    pos: { x: -28, y: 3.5, z: -36 },
    vel: { x: 0, y: 35, z: 0 },
    climbTimer: 0.45,
    shouldAirburst: false,
  };

  // Phase 1: Vertical climb with no target yet clears rooftops cleanly
  for (let i = 0; i < 6; i++) {
    sam = computeSamFlightStep({
      pos: sam.pos,
      vel: sam.vel,
      targetSpeed: 210,
      turnRate: 9,
      climbTimer: sam.climbTimer,
      dt: 0.1,
      aerialTarget: { x: 20, y: 65, z: -150 },
    });
    assert.ok(sam.vel.y > 0, `SAM must climb upward during launch phase (step ${i})`);
  }
  assert.ok(sam.pos.y >= 22, 'SAM cleared rooftop altitude floor');

  // Phase 2: Target suddenly disappears -> airbursts harmlessly high in sky instead of hitting streets
  const lostTargetStep = computeSamFlightStep({
    pos: { x: 0, y: 38, z: -90 },
    vel: { x: 10, y: 20, z: -180 },
    targetSpeed: 210,
    turnRate: 9,
    climbTimer: 0,
    dt: 0.1,
    aerialTarget: null,
  });
  assert.equal(lostTargetStep.shouldAirburst, true);
  assert.ok(lostTargetStep.pos.y >= 38);
});

test('war wave config escalates hostile pressure to 60 enemy soldiers and allied armor defaults strictly to hold', () => {
  assert.equal(DEFAULT_TANK_ORDER, 'hold');
  assert.equal(computeWarWaveConfig(0, 120).waveLevel, 0);

  const earlyWave = computeWarWaveConfig(1, 5);
  const lateWave = computeWarWaveConfig(3, 70);
  assert.equal(earlyWave.waveLevel, 1);
  assert.equal(lateWave.waveLevel, 5);
  assert.equal(earlyWave.maxSoldiers, 60);
  assert.equal(lateWave.maxSoldiers, 60);
  assert.ok(lateWave.missileSalvoCount > earlyWave.missileSalvoCount);
  assert.ok(lateWave.enemyMlrsCooldown < earlyWave.enemyMlrsCooldown);
  assert.ok(lateWave.maxAircraft >= earlyWave.maxAircraft);
});

test('HQ private office, doorway-gapped walls, secret sites, reserve discipline, and frontline/SAM placements are valid', () => {
  // 1. Frontline soldiers must not collide with any building, house, mosque, or wall
  for (const slot of FRONTLINE_SOLDIER_SLOTS) {
    const col = resolveCircleObstacleCollision(slot.pos[0], slot.pos[2], 0.85, WORLD_OBSTACLES);
    assert.equal(col.collided, false, `Soldier at (${slot.pos[0]}, ${slot.pos[2]}) overlaps an obstacle`);
  }

  // 2. Strategic SAM pads and HQ Air Defense pads must not overlap skyscrapers, houses, mosques, or embassies
  const samPads = [
    STRATEGIC_SAM_POSITIONS.patriot,
    STRATEGIC_SAM_POSITIONS.thaad,
    STRATEGIC_SAM_POSITIONS.s400,
    STRATEGIC_SAM_POSITIONS.hq9,
    ...STRATEGIC_SAM_POSITIONS.hqAirDefense,
  ];
  for (const pad of samPads) {
    const insideBuilding =
      CITY_BUILDING_SPECS.some(
        (b) => Math.abs(pad[0] - b.x) < b.w * 0.5 + 3 && Math.abs(pad[2] - b.z) < b.d * 0.5 + 3,
      ) ||
      MOSQUE_SPECS.some(
        (m) => Math.abs(pad[0] - m.x) < m.w * 0.5 + 3 && Math.abs(pad[2] - m.z) < m.d * 0.5 + 3,
      );
    assert.equal(insideBuilding, false, `SAM battery (${pad[0]}, ${pad[2]}) overlaps a building/mosque`);
  }

  // 3. Reserve soldiers stay strictly stationary unless directly ordered via احتياط button (Advance/Attack NEVER deploy reserves)
  assert.equal(shouldMobilizeReserves('follow', false), false);
  assert.equal(shouldMobilizeReserves('advance', false), false);
  assert.equal(shouldMobilizeReserves('attack', false), false);
  assert.equal(shouldMobilizeReserves('follow', true), true);

  // 4. HQ complex entrance (z=11.5) & inner HQ doorway (z=26) are passable, while walls block clipping
  assert.equal(resolveCircleObstacleCollision(0, 11.5, 0.85, WORLD_OBSTACLES).collided, false);
  assert.equal(resolveCircleObstacleCollision(0, 26.0, 0.85, WORLD_OBSTACLES).collided, false);
  assert.equal(resolveCircleObstacleCollision(-8, 11.5, 0.85, WORLD_OBSTACLES).collided, true);
  assert.equal(resolveCircleObstacleCollision(-8, 26.0, 0.85, WORLD_OBSTACLES).collided, true);
  assert.equal(isInsideOurEmbassy(0, OUR_HQ_COMPLEX.chairPos[2]), true);
  assert.equal(isNearHqDesk(0, OUR_HQ_COMPLEX.chairPos[2]), true);

  // 5. Secret Sites & Diplomatic Negotiations
  const sites = createInitialSecretSites();
  assert.equal(sites.length, SECRET_SITE_SPECS.length);
  assert.ok(sites.every((s) => !s.revealed && !s.destroyed));
  const truce = resolveNegotiationAction({
    stance: 'truce',
    warDeclared: true,
    credits: 1200,
    truceCooldown: 0,
  });
  assert.equal(truce.accepted, true);
  assert.ok(truce.truceDuration >= 12);
});

test('13 luxury/historic nations, convoy escort (3 Humvees + 5 Tahoes), desert tunnels (2000m), cover barriers, and zero city commanders', () => {
  // 1. Training Base is far out in the Southern Desert, outside the central city
  assert.ok(FORTIFIED_TRAINING_BASE.minZ >= 460);
  assert.equal(isCommanderPositionValid(FORTIFIED_TRAINING_BASE.trainingCommanderPos[0], FORTIFIED_TRAINING_BASE.trainingCommanderPos[2]), true);
  assert.equal(isCommanderPositionValid(0, 32), true); // HQ Commander
  assert.equal(isCommanderPositionValid(-24, -44), false); // Zero commanders in city streets!

  // 2. Desert underground ballistic missile tunnels cover all 2000m including all foreign capitals
  assert.equal(DESERT_TUNNEL_MAX_RANGE, 2000);
  assert.equal(DESERT_TUNNEL_SPECS.length, 3);
  for (const nation of NATION_SPECS) {
    assert.equal(
      isWithinDesertTunnelRange(nation.palacePos[0], nation.palacePos[2]),
      true,
      `Nation ${nation.id} should be reachable within 2000m tunnel range`,
    );
  }

  // 3. 13 Nations with luxury_modern vs historic_imperial differentiation & convoy rules
  assert.equal(NATION_SPECS.length, 13);
  const nations = createInitialNations();
  assert.ok(nations.every((n) => !n.atWar && n.militaryPower > 1.25));
  assert.equal(canLaunchDiplomaticConvoy(nations, 'ae'), true);
  const warUae = setNationWarState(nations, 'ae', true);
  assert.equal(canLaunchDiplomaticConvoy(warUae, 'ae'), false);
  assert.equal(getPeaceUpgradeCostMultiplier(false), 0.8);
  assert.equal(getPeaceUpgradeCostMultiplier(true), 1.0);

  // 4. Convoy escort consists of 3 Humvees + 5 Tahoes; ISIS blocks & sandbag cover barriers exist
  assert.equal(CONVOY_ESCORT_STAGING.leadHumvees.length, 3);
  assert.equal(CONVOY_ESCORT_STAGING.tahoes.length, 5);
  assert.equal(ISIS_BLOCK_SPECS.length, 4);
  assert.ok(COVER_BARRIER_SPECS.length >= 24);
  assert.ok(findNearestCoverBarrier(-8, -14) !== null);

  // 5. Desert region & Base are completely separated from all 13 nation palaces/borders & city residences
  for (const n of NATION_SPECS) {
    const [px, , pz] = n.palacePos;
    const [bx, , bz] = n.borderPos;
    const palaceInDesert =
      px >= FORTIFIED_DESERT_REGION.minX &&
      px <= FORTIFIED_DESERT_REGION.maxX &&
      pz >= FORTIFIED_DESERT_REGION.minZ &&
      pz <= FORTIFIED_DESERT_REGION.maxZ;
    const borderInDesert =
      bx >= FORTIFIED_DESERT_REGION.minX &&
      bx <= FORTIFIED_DESERT_REGION.maxX &&
      bz >= FORTIFIED_DESERT_REGION.minZ &&
      bz <= FORTIFIED_DESERT_REGION.maxZ;
    assert.equal(palaceInDesert, false, `Nation ${n.id} palace overlapped Desert Region`);
    assert.equal(borderInDesert, false, `Nation ${n.id} border overlapped Desert Region`);
    assert.ok(
      px >= WORLD_PLAYABLE_BOUNDS.minX &&
        px <= WORLD_PLAYABLE_BOUNDS.maxX &&
        pz >= WORLD_PLAYABLE_BOUNDS.minZ &&
        pz <= WORLD_PLAYABLE_BOUNDS.maxZ,
      `Nation ${n.id} palace out of WORLD_PLAYABLE_BOUNDS`,
    );
  }

  // Pairwise nation capital separation (>= 220m) so no provinces overlap
  for (let i = 0; i < NATION_SPECS.length; i++) {
    for (let j = i + 1; j < NATION_SPECS.length; j++) {
      const a = NATION_SPECS[i];
      const b = NATION_SPECS[j];
      const d = Math.hypot(a.palacePos[0] - b.palacePos[0], a.palacePos[2] - b.palacePos[2]);
      assert.ok(d >= 220, `Nations ${a.id} and ${b.id} too close (${d.toFixed(1)}m)`);
    }
  }

  // Frontline tanks & humvees must stay clear of buildings, watchtowers, and SAM obstacles
  for (const t of ALLIED_TANK_STATIONS.slice(0, 2)) {
    const col = resolveCircleObstacleCollision(t[0], t[2], 3.3, WORLD_OBSTACLES);
    assert.equal(col.collided, false, `Frontline tank (${t[0]}, ${t[2]}) overlaps an obstacle`);
  }
  for (const h of ALLIED_HUMVEE_STATIONS.slice(0, 2)) {
    const col = resolveCircleObstacleCollision(h[0], h[2], HUMVEE_CONFIG.collisionRadius, WORLD_OBSTACLES);
    assert.equal(col.collided, false, `Frontline Humvee (${h[0]}, ${h[2]}) overlaps an obstacle`);
  }
});

test('13 nation destructible perimeter walls, military bases, and enterable presidential palaces with chairs', () => {
  const walls = buildNationPerimeterWallSpecs();
  assert.equal(walls.length, 208);
  assert.equal(NATION_WALL_SPECS.length, 208);

  for (const spec of NATION_SPECS) {
    const nationWalls = walls.filter((w) => w.nationId === spec.id);
    assert.equal(nationWalls.length, 16, `Nation ${spec.id} should have 16 perimeter wall segments`);

    // Gateway opening stays passable even with all walls intact
    const [ax, , az] = getForeignPalaceApproachPoint(spec);
    const gateMidX = (ax + spec.welcomeGatePos[0]) * 0.5;
    const gateMidZ = (az + spec.welcomeGatePos[2]) * 0.5;
    const activeBoxes = nationWalls.map((w) => ({ ...w.box }));
    const gateCol = resolveCircleObstacleCollision(gateMidX, gateMidZ, 2.5, activeBoxes);
    assert.equal(gateCol.collided, false, `Nation ${spec.id} gateway should allow convoy entry`);

    // Closed wall segment blocks when intact, and opens cleanly once breached/destroyed
    const firstWall = nationWalls[0];
    const wallCx = (firstWall.box.minX + firstWall.box.maxX) * 0.5;
    const wallCz = (firstWall.box.minZ + firstWall.box.maxZ) * 0.5;
    assert.equal(resolveCircleObstacleCollision(wallCx, wallCz, 1.5, activeBoxes).collided, true);
    const breachedBoxes = nationWalls.slice(1).map((w) => ({ ...w.box }));
    assert.equal(resolveCircleObstacleCollision(wallCx, wallCz, 1.5, breachedBoxes).collided, false);

    // Palace front doorway allows walking into the interior & approaching Guest Chair
    const [px, , pz] = spec.palacePos;
    assert.equal(resolveCircleObstacleCollision(px, pz - 1.5, 0.72, WORLD_OBSTACLES).collided, false);
    assert.equal(resolveCircleObstacleCollision(px - 7.5, pz - 1.5, 0.72, WORLD_OBSTACLES).collided, true);
    assert.equal(isInsideForeignPalace(px, pz - 10.8), spec.id);
    assert.equal(isNearForeignPalaceChair(px, pz - 10.8), spec.id);
    assert.ok(getWalkableElevationAt(px, pz - 10.8, 0) >= 0.2);

    // Nation military base lies inside the perimeter and away from palace center
    const [mbx, , mbz] = getNationMilitaryBasePos(spec);
    assert.ok(Math.abs(mbx - px) < 90 && Math.abs(mbz - pz) < 80);
    assert.ok(Math.hypot(mbx - px, mbz - pz) >= 30);
  }
});


