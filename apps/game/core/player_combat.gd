class_name PlayerCombat
extends RefCounted
## The player's combat state machine (M1 spec 7.1 and 7.2). Pure: `step` takes the inputs of one fixed step and returns
## a new state plus events. States: idle, attack_hold (button down, undecided between light and heavy), light, heavy,
## dodge, block, staggered, down. Stamina is not saved (it is full on load): the machine owns it while fighting.

const LIGHT_MS := 450
const HEAVY_MS := 600
const DODGE_MS := 450
## Stagger after an unblocked hit (draft) and after a guard break (draft).
const HURT_MS := 350
const GUARD_BREAK_MS := 800


static func make(max_stamina: float) -> Dictionary:
	return {
		"state": "idle", "timer_ms": 0, "chain": 0, "stamina": max_stamina, "idle_ms": 0,
		"hold_ms": 0, "block_held_ms": -1, "iframe_ms": 0, "queued": false,
	}


static func down(pc: Dictionary) -> Dictionary:
	var out := pc.duplicate()
	out["state"] = "down"
	out["timer_ms"] = 0
	out["iframe_ms"] = 0
	out["block_held_ms"] = -1
	return out


## `input`: {attack_down, attack_pressed, attack_released, block, dodge_pressed} (all bool, for this step).
## Returns {pc, events}.
static func step(pc: Dictionary, input: Dictionary, dt_ms: int, max_stamina: float, rate_mult: float = 1.0) -> Dictionary:
	var out := pc.duplicate()
	var events: Array = []
	var state: String = out["state"]
	if state == "down":
		return {"pc": out, "events": events}
	var iframe: int = out["iframe_ms"]
	out["iframe_ms"] = maxi(0, iframe - dt_ms)
	var spent := 0.0
	var attack_pressed: bool = input["attack_pressed"]
	var attack_released: bool = input["attack_released"]
	var attack_down: bool = input["attack_down"]
	var block: bool = input["block"]
	var dodge_pressed: bool = input["dodge_pressed"]
	var stamina: float = out["stamina"]
	match state:
		"idle", "block":
			if dodge_pressed and stamina >= Combat.DODGE_STAMINA:
				spent = Combat.DODGE_STAMINA
				out["state"] = "dodge"
				out["timer_ms"] = DODGE_MS
				out["iframe_ms"] = Combat.DODGE_IFRAME_MS - dt_ms
				out["block_held_ms"] = -1
				events.append({"type": "dodge"})
			elif attack_pressed:
				out["block_held_ms"] = -1
				if attack_released:
					spent = _begin_swing(out, events, "light", stamina)
				else:
					out["state"] = "attack_hold"
					out["hold_ms"] = dt_ms
			elif block:
				var held: int = out["block_held_ms"]
				out["state"] = "block"
				out["block_held_ms"] = dt_ms if held < 0 else held + dt_ms
			else:
				out["state"] = "idle"
				out["block_held_ms"] = -1
		"attack_hold":
			var hold: int = out["hold_ms"]
			if attack_released or not attack_down:
				var kind := Combat.attack_kind(hold)
				spent = _begin_swing(out, events, kind, stamina)
			else:
				out["hold_ms"] = hold + dt_ms
		"light":
			if attack_pressed:
				out["queued"] = true
			var timer: int = out["timer_ms"]
			timer -= dt_ms
			if timer > 0:
				out["timer_ms"] = timer
			else:
				var chain: int = out["chain"]
				var queued: bool = out["queued"]
				if queued and chain < Combat.LIGHT_CHAIN.size() - 1 and stamina >= Combat.LIGHT_STAMINA:
					out["chain"] = chain + 1
					spent = Combat.LIGHT_STAMINA
					_start_light(out, events)
				else:
					out["state"] = "idle"
					out["chain"] = 0
					out["queued"] = false
					out["timer_ms"] = 0
		"heavy", "dodge", "staggered":
			var timer2: int = out["timer_ms"]
			timer2 -= dt_ms
			if timer2 > 0:
				out["timer_ms"] = timer2
			else:
				out["state"] = "idle"
				out["timer_ms"] = 0
				out["chain"] = 0
	var idle_ms: int = out["idle_ms"]
	var res := Combat.stamina_step(stamina, max_stamina, spent, idle_ms, dt_ms, rate_mult)
	out["stamina"] = res["stamina"]
	out["idle_ms"] = res["idle_ms"]
	return {"pc": out, "events": events}


## Starts a swing of `kind` if stamina allows; returns the stamina spent. Mutates `out`/`events`.
static func _begin_swing(out: Dictionary, events: Array, kind: String, stamina: float) -> float:
	var cost := Combat.move_stamina(kind)
	if stamina < cost:
		out["state"] = "idle"
		out["hold_ms"] = 0
		return 0.0
	out["hold_ms"] = 0
	if kind == "heavy":
		out["state"] = "heavy"
		out["timer_ms"] = HEAVY_MS
		out["chain"] = 0
		events.append({"type": "swing", "kind": "heavy", "multiplier": Combat.move_multiplier("heavy", 0), "chain": 0})
	else:
		out["chain"] = 0
		out["queued"] = false
		_start_light(out, events)
	return cost


static func _start_light(out: Dictionary, events: Array) -> void:
	var chain: int = out["chain"]
	out["state"] = "light"
	out["timer_ms"] = LIGHT_MS
	out["queued"] = false
	events.append({"type": "swing", "kind": "light", "multiplier": Combat.move_multiplier("light", chain), "chain": chain})


## The defender view for `Combat.resolve_hit`.
static func defender(pc: Dictionary, defence: int, shield: bool, drain_mult: float) -> Dictionary:
	var state: String = pc["state"]
	return {
		"defence": defence, "blocking": state == "block", "block_held_ms": pc["block_held_ms"],
		"shield": shield, "iframe_ms": pc["iframe_ms"], "block_drain_mult": drain_mult,
	}


## Applies the outcome of `Combat.resolve_hit` to the machine: block stamina, guard break, hurt stagger.
static func receive(pc: Dictionary, result: Dictionary) -> Dictionary:
	var out := pc.duplicate()
	var state: String = out["state"]
	if state == "down":
		return out
	var dodged: bool = result["dodged"]
	if dodged:
		return out
	var blocked: bool = result["blocked"]
	var cost: float = result["stamina_cost"]
	var stamina: float = out["stamina"]
	if blocked:
		var left := stamina - cost
		out["idle_ms"] = 0
		if left <= 0.0:
			out["stamina"] = 0.0
			out["state"] = "staggered"
			out["timer_ms"] = GUARD_BREAK_MS
			out["block_held_ms"] = -1
		else:
			out["stamina"] = left
		return out
	var damage: int = result["damage"]
	if damage > 0:
		out["state"] = "staggered"
		out["timer_ms"] = HURT_MS
		out["block_held_ms"] = -1
		out["chain"] = 0
		out["queued"] = false
	return out
