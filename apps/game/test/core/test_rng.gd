extends GutTest
## Rng against the values and states recorded from the TypeScript mulberry32.

const SEEDS: Array[String] = ["1", "42", "2147483647"]


func _fixture() -> Dictionary:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://test/fixtures/rng.json"))
	var out: Dictionary = parsed
	return out


func test_chained_calls_match_recorded_values_and_states() -> void:
	var fixture := _fixture()
	var seeds: Dictionary = fixture["seeds"]
	var states: Dictionary = fixture["states"]
	for seed_key: String in SEEDS:
		var want_values: Array = seeds[seed_key]
		var want_states: Array = states[seed_key]
		var got_values: Array = []
		var got_states: Array = []
		var r := int(seed_key)
		for i: int in 1000:
			var res := Rng.next_float(r)
			got_values.append(res[0])
			got_states.append(res[1])
			r = res[1]
		# Godot's JSON float parser can be 1 ulp off the decimal text (it reads 0.002735721180215478 as
		# 0.00273572118021547), so compare the exact integer numerator: every value is k / 2^32.
		assert_eq(got_values.size(), want_values.size())
		for i: int in got_values.size():
			var got: float = got_values[i]
			var want: float = want_values[i]
			var k := roundi(want * 4294967296.0)
			if got * 4294967296.0 != float(k) or absf(got - want) > 1e-15:
				fail_test("value %d for seed %s: got %.17g, recorded %.17g" % [i, seed_key, got, want])
				break
		assert_eq(JsonNorm.first_diff(got_states, want_states), "", "states for seed %s" % seed_key)


func test_state_is_signed_32_bit_and_value_in_unit_range() -> void:
	var r := 4294967295
	for i: int in 200:
		var res := Rng.next_float(r)
		var v: float = res[0]
		var s: int = res[1]
		assert_true(v >= 0.0 and v < 1.0)
		assert_true(s >= -2147483648 and s <= 2147483647)
		r = s
