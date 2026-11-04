class_name Combat
extends RefCounted
## Pure combat rules (M1 spec 7.1 and 7.2): damage, block, parry, dodge, stamina and lock-on. No nodes, no time source:
## callers pass milliseconds in. Numbers are the October spec 6.3 rules; the block ratios and chain multipliers are drafts.

const LIGHT_STAMINA := 12.0
const HEAVY_STAMINA := 25.0
const DODGE_STAMINA := 20.0
const RUN_STAMINA_PER_SECOND := 10.0
## Block pressed within this long before a hit lands is a parry.
const PARRY_WINDOW_MS := 150
## A dodge roll takes no damage for this long.
const DODGE_IFRAME_MS := 250
## Hold attack this long for a heavy attack.
const HEAVY_HOLD_MS := 350
const HEAVY_MULTIPLIER := 1.8
## Light chain multipliers, hit 1 to 3 (draft).
const LIGHT_CHAIN: Array[float] = [1.0, 1.0, 1.2]
const STAMINA_IDLE_MS := 800
const STAMINA_PER_SECOND := 30.0
const BLOCK_NO_SHIELD := 0.7
const BLOCK_SHIELD := 0.9
## Lock-on: the nearest enemy within this range and half-angle in front of the player.
const LOCK_RANGE := 10.0
const LOCK_HALF_ANGLE_DEG := 60.0


## `round(power x multiplier x 100 / (100 + defence))`, never below 0.
static func damage(power: int, multiplier: float, defence: int) -> int:
	return maxi(0, roundi(power * multiplier * 100.0 / (100.0 + maxi(0, defence))))


## "heavy" when the attack button was held at least HEAVY_HOLD_MS, else "light".
static func attack_kind(held_ms: int) -> String:
	return "heavy" if held_ms >= HEAVY_HOLD_MS else "light"


## Damage multiplier of a move. `chain_index` is the light-chain position (0..2); it clamps.
static func move_multiplier(kind: String, chain_index: int) -> float:
	if kind == "heavy":
		return HEAVY_MULTIPLIER
	return LIGHT_CHAIN[clampi(chain_index, 0, LIGHT_CHAIN.size() - 1)]


static func move_stamina(kind: String) -> float:
	match kind:
		"heavy":
			return HEAVY_STAMINA
		"dodge":
			return DODGE_STAMINA
		_:
			return LIGHT_STAMINA


## Resolves one hit on the player. `attacker`: {power:int, parry_stagger_ms:int}. `defender`: {defence:int, blocking:bool,
## block_held_ms:int (since the block was pressed), shield:bool, iframe_ms:int, block_drain_mult:float}.
## Returns {damage, stagger_ms (applied to the attacker), blocked, parried, dodged, stamina_cost}.
static func resolve_hit(attacker: Dictionary, defender: Dictionary, multiplier: float) -> Dictionary:
	var out := {"damage": 0, "stagger_ms": 0, "blocked": false, "parried": false, "dodged": false, "stamina_cost": 0.0}
	var iframe_ms: int = defender.get("iframe_ms", 0)
	if iframe_ms > 0:
		out["dodged"] = true
		return out
	var power: int = attacker.get("power", 0)
	var defence: int = defender.get("defence", 0)
	var base := damage(power, multiplier, defence)
	var blocking: bool = defender.get("blocking", false)
	if not blocking:
		out["damage"] = base
		return out
	out["blocked"] = true
	var held_ms: int = defender.get("block_held_ms", 9999)
	if held_ms <= PARRY_WINDOW_MS:
		var stagger_ms: int = attacker.get("parry_stagger_ms", 0)
		out["parried"] = true
		out["stagger_ms"] = stagger_ms
		return out
	var shield: bool = defender.get("shield", false)
	var drain_mult: float = defender.get("block_drain_mult", 1.0)
	var ratio := BLOCK_SHIELD if shield else BLOCK_NO_SHIELD
	var blocked_amount := roundi(base * ratio)
	out["damage"] = base - blocked_amount
	out["stamina_cost"] = blocked_amount / 2.0 * drain_mult
	return out


## One stamina step. `spent` is taken first and resets the idle timer; otherwise the idle timer grows by `dt_ms` and,
## once it reaches STAMINA_IDLE_MS, stamina refills at 30 per second (x `rate_mult`). Returns {stamina, idle_ms}.
static func stamina_step(stamina: float, max_stamina: float, spent: float, idle_ms: int, dt_ms: int, rate_mult: float = 1.0) -> Dictionary:
	if spent > 0.0:
		return {"stamina": maxf(0.0, stamina - spent), "idle_ms": 0}
	var idle := idle_ms + dt_ms
	var value := stamina
	if idle >= STAMINA_IDLE_MS:
		value = minf(max_stamina, stamina + STAMINA_PER_SECOND * rate_mult * dt_ms / 1000.0)
	return {"stamina": value, "idle_ms": idle}


## Lock-on target id. `enemies`: [{id, x, y}]. With no `current_id` it is the nearest enemy in the front cone; with one it
## is the next nearest after it in the cone (wrapping), so one input cycles targets. "" when none is in the cone.
static func pick_target(origin: Vector2, facing: Vector2, enemies: Array, current_id: String) -> String:
	var cone: Array[Dictionary] = []
	var fwd := facing.normalized()
	for e: Variant in enemies:
		var enemy: Dictionary = e
		var ex: float = enemy["x"]
		var ey: float = enemy["y"]
		var id: String = enemy["id"]
		var offset := Vector2(ex, ey) - origin
		var dist := offset.length()
		if dist > LOCK_RANGE:
			continue
		if dist > 0.0001 and absf(rad_to_deg(fwd.angle_to(offset))) > LOCK_HALF_ANGLE_DEG:
			continue
		cone.append({"id": id, "dist": dist})
	if cone.is_empty():
		return ""
	cone.sort_custom(func(p: Dictionary, q: Dictionary) -> bool:
		var pd: float = p["dist"]
		var qd: float = q["dist"]
		return pd < qd)
	var first_id: String = cone[0]["id"]
	if current_id == "":
		return first_id
	for i: int in cone.size():
		var cid: String = cone[i]["id"]
		if cid == current_id:
			var next_id: String = cone[(i + 1) % cone.size()]["id"]
			return next_id
	return first_id
