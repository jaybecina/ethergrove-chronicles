class_name Balance
extends RefCounted
## Tuning numbers, ported from packages/core/src/data/balance.ts (BALANCE keys in SCREAMING_SNAKE_CASE).

const START_GOLD := 500
const START_TURNIP_SEEDS := 6
## The farming bar, `player.energy` (named Stamina in TypeScript's MAX_STAMINA; Energy from save version 3).
const MAX_ENERGY := 100
## Max HP at level 1; spec 7.4 derives it as 100 + 8 x (level - 1). A new game starts with full HP.
const BASE_MAX_HP := 100
const STAMINA_LOW_AT := 20
const BAG_SLOTS := 12
const STACK_MAX := 99
const CAN_CHARGES := 20
const DAY_START_MINUTE := 360
const PASS_OUT_MINUTE := 1560
const SEASON_DAYS := 28
const PASS_OUT_GOLD_PCT := 0.1
const PASS_OUT_GOLD_CAP := 1000
const TILLED_REVERT_CHANCE := 0.1
## tiles per second
const WALK_SPEED := 2.6
## tiles per second while run is held (never when exhausted)
const RUN_SPEED := 4.6
const EXHAUSTED_SPEED_FACTOR := 0.6
const PLAYER_RADIUS := 0.3
const MISS_COSTS_STAMINA := true
const CART_OPEN := 540
const CART_CLOSE := 1020
const AXE_HITS := 3
const HAMMER_HITS := 2
const OBSTACLE_WEED := 0.3
const OBSTACLE_ROCK := 0.1
const OBSTACLE_STUMP := 0.05

const TOOL_ORDER: Array[String] = ["hoe", "can", "sickle", "axe", "hammer"]

const TOOL_COST: Dictionary = {"hoe": 2, "can": 2, "sickle": 1, "axe": 4, "hammer": 4}
