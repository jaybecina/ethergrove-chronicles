class_name Rng
extends RefCounted
## mulberry32, ported from packages/core/src/rng.ts. The TypeScript uses 32-bit integer maths
## (`| 0`, `Math.imul`, `>>> 0`); this emulates it in GDScript's 64-bit ints.


## Wraps to a signed 32-bit int, like `x | 0`.
static func _i32(x: int) -> int:
	x &= 0xFFFFFFFF
	return x - 0x100000000 if x >= 0x80000000 else x


## `Math.imul`: the low 32 bits of a * b, signed.
static func _imul(a: int, b: int) -> int:
	var al := a & 0xFFFF
	var ah := (a >> 16) & 0xFFFF
	var bl := b & 0xFFFF
	var bh := (b >> 16) & 0xFFFF
	return _i32(al * bl + (((ah * bl + al * bh) << 16) & 0xFFFFFFFF))


## Returns `[value: float in [0, 1), next: int]`; `next` is a signed 32-bit state.
static func next_float(rng: int) -> Array:
	var next := _i32(rng + 0x6D2B79F5)
	var t := next
	t = _imul(t ^ ((t & 0xFFFFFFFF) >> 15), t | 1)
	t = _i32(t ^ (t + _imul(t ^ ((t & 0xFFFFFFFF) >> 7), t | 61)))
	return [float((t ^ ((t & 0xFFFFFFFF) >> 14)) & 0xFFFFFFFF) / 4294967296.0, next]
