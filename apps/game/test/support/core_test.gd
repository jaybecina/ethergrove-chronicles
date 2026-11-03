class_name CoreTest
extends GutTest
## Base class for core rule tests. GUT's assert parameters are untyped, so the project's strict warnings reject a
## value read out of a Dictionary or Array (an implicit Variant). `eq` takes explicit Variants and forwards them,
## and `d`/`a` narrow a Variant to the Dictionary or Array it holds.


func eq(got: Variant, expected: Variant, text: String = "") -> void:
	call("assert_eq", got, expected, text)


static func d(v: Variant) -> Dictionary:
	var out: Dictionary = v
	return out


static func a(v: Variant) -> Array:
	var out: Array = v
	return out


## The "state" of a rule result.
static func st(result: Dictionary) -> Dictionary:
	return d(result["state"])


## The "events" of a rule result.
static func ev(result: Dictionary) -> Array:
	return a(result["events"])


## The "bag" of a state (or of an add_item result).
static func bag_of(state: Dictionary) -> Array:
	return a(state["bag"])


## The farm grid of a state.
static func farm_of(state: Dictionary) -> Dictionary:
	return d(d(state["maps"])["farm"])
