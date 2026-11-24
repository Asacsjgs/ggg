import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_BASE_HP,
  MAX_OUTPOST_HP,
  MIN_OUTPOST_HP,
  MIN_SHIELDED_HP,
  NATION_CONFIGS,
  NATION_ORDER,
  PLAYER_JET_CONFIGS,
  PLAYER_JET_ORDER,
  WEAPON_ORDER,
  advanceSeekerLock,
  applyBaseDamage,
  applyOutpostDamageAndRepair,
  buildWaveSpawnQueue,
  calculateAccuracyPercent,
  checkWaveOutcome,
  computeRadarDetection,
  createInitialUpgrades,
  getCombinedForcesStats,
  getWeaponStats,
  purchaseUpgrade,
} from './rules';

test('all 7 US, Russian, Chinese and Close-In defense systems scale with upgrades', () => {
  const upgrades = createInitialUpgrades();
  assert.equal(WEAPON_ORDER.length, 7);

  const patriot1 = getWeaponStats('patriot', upgrades);
  const thaad1 = getWeaponStats('thaad', upgrades);
  const s4001 = getWeaponStats('s400', upgrades);
  const pantsir1 = getWeaponStats('pantsir', upgrades);
  const hq91 = getWeaponStats('hq9', upgrades);
  const manpads1 = getWeaponStats('manpads', upgrades);
  const aa1 = getWeaponStats('heavy_aa', upgrades);

  assert.equal(s4001.coldLaunch, true);
  assert.equal(hq91.coldLaunch, true);
  assert.equal(manpads1.requiresLock, true);
  assert.equal(aa1.homing, false);
  assert.ok(thaad1.projectileSpeed > patriot1.projectileSpeed);
  assert.ok(pantsir1.magSize >= 6);

  const up = { ...upgrades, usLevel: 3, ruLevel: 3, cnLevel: 3 };
  assert.ok(getWeaponStats('patriot', up).damage > patriot1.damage);
  assert.ok(getWeaponStats('s400', up).damage > s4001.damage);
  assert.ok(getWeaponStats('hq9', up).damage > hq91.damage);
});

test('Nations, Flyable Fighter Jets (F-22, Su-57, J-20) and Combined Forces scale cleanly', () => {
  assert.equal(NATION_ORDER.length, 4);
  assert.equal(NATION_CONFIGS.us.defaultJet, 'f22');
  assert.equal(NATION_CONFIGS.ru.defaultJet, 'su57');
  assert.equal(NATION_CONFIGS.cn.defaultJet, 'j20');

  assert.equal(PLAYER_JET_ORDER.length, 3);
  assert.ok(PLAYER_JET_CONFIGS.f22.cruiseSpeed > 50);
  assert.ok(PLAYER_JET_CONFIGS.su57.turnRate >= 2.0);
  assert.ok(PLAYER_JET_CONFIGS.j20.missileSpeed >= 220);

  const lv1 = getCombinedForcesStats(1);
  const lv4 = getCombinedForcesStats(4);
  assert.ok(lv4.sniperDamage > lv1.sniperDamage);
  assert.ok(lv4.mlrsRocketsPerSalvo > lv1.mlrsRocketsPerSalvo);
  assert.ok(lv4.mlrsCooldown < lv1.mlrsCooldown);
});

test('SkyLock seeker progresses smoothly to solid lock when tracking target', () => {
  let lock = 0;
  for (let i = 0; i < 6; i++) {
    lock = advanceSeekerLock({
      currentLock: lock,
      hasTargetInCone: true,
      ndcDist: 0.05,
      isStealth: false,
      canHardLockStealth: true,
      radarLevel: 2,
      dt: 0.15,
    });
  }
  assert.equal(lock, 1);

  const lost = advanceSeekerLock({
    currentLock: 0.8,
    hasTargetInCone: false,
    ndcDist: 1,
    isStealth: false,
    canHardLockStealth: true,
    radarLevel: 1,
    dt: 0.2,
  });
  assert.ok(lost < 0.8);
});

test('no-defeat rule protects baseHp and forward outposts support two-way damage + engineer repair', () => {
  const hit1 = applyBaseDamage(MAX_BASE_HP, 45);
  assert.equal(hit1.nextHp, 55);
  assert.equal(hit1.isDefeated, false);

  const massiveHit = applyBaseDamage(25, 999);
  assert.equal(massiveHit.nextHp, MIN_SHIELDED_HP);
  assert.equal(massiveHit.isDefeated, false);

  const outpostHit = applyOutpostDamageAndRepair({
    currentHp: MAX_OUTPOST_HP,
    damage: 55,
    repairRate: 0,
    dt: 0,
  });
  assert.equal(outpostHit.nextHp, 45);
  assert.equal(outpostHit.isDamagedState, true);

  const outpostClamp = applyOutpostDamageAndRepair({
    currentHp: 20,
    damage: 200,
    repairRate: 3,
    dt: 1,
  });
  assert.equal(outpostClamp.nextHp, MIN_OUTPOST_HP + 3);
});

test('upgrade purchase deducts credits and respects max level including forcesLevel', () => {
  let upgrades = createInitialUpgrades();
  const res1 = purchaseUpgrade('usLevel', upgrades, 5000);
  assert.equal(res1.purchased, true);
  assert.equal(res1.upgrades.usLevel, 2);
  assert.ok(res1.credits < 5000);

  const resForces = purchaseUpgrade('forcesLevel', upgrades, 5000);
  assert.equal(resForces.purchased, true);
  assert.equal(resForces.upgrades.forcesLevel, 2);

  upgrades = { ...upgrades, radarLevel: 4 };
  const maxRes = purchaseUpgrade('radarLevel', upgrades, 9999);
  assert.equal(maxRes.purchased, false);
});

test('stealth radar detection improves with radar upgrades and wave queue interleaves threats', () => {
  const lv1OffBeam = computeRadarDetection({
    enemyType: 'stealth',
    distance: 160,
    bearingRad: 1.5,
    radarAngleRad: 0.0,
    radarLevel: 1,
    previousStrength: 0.2,
    dt: 0.5,
  });
  assert.equal(lv1OffBeam.canLockHoming, false);

  const lv3OffBeam = computeRadarDetection({
    enemyType: 'stealth',
    distance: 160,
    bearingRad: 1.5,
    radarAngleRad: 0.0,
    radarLevel: 3,
    previousStrength: 0.2,
    dt: 0.5,
  });
  assert.equal(lv3OffBeam.canLockHoming, true);

  const farFighter = computeRadarDetection({
    enemyType: 'fighter',
    distance: 380,
    bearingRad: 0.1,
    radarAngleRad: 0.1,
    radarLevel: 1,
    previousStrength: 0,
    dt: 0.1,
  });
  assert.equal(farFighter.canLockHoming, true);
  assert.ok(farFighter.strength > 0.8);

  const q2 = buildWaveSpawnQueue(2);
  assert.ok(q2.includes('drone'));
  assert.ok(q2.includes('helicopter'));
  assert.ok(q2.includes('fighter'));
  assert.ok(q2.includes('stealth'));
  assert.equal(checkWaveOutcome({ spawnQueueLength: 0, activeEnemiesCount: 0 }), 'wave_clear');
  assert.equal(calculateAccuracyPercent(50, 40), 80);
});
