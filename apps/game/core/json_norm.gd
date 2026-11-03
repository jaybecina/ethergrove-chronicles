class_name JsonNorm
extends RefCounted
## Number normalisation for JSON data. `JSON.parse_string` gives every number as a float, while GDScript
## code makes ints, and Godot's `==` treats a nested `1` and `1.0` as different. Compare through these.


## Every int becomes a float, recursively (dictionary keys are left alone).
static func floats(v: Variant) -> Variant:
	match typeof(v):
		TYPE_INT:
			var i: int = v
			return float(i)
		TYPE_DICTIONARY:
			var d: Dictionary = v
			var out := {}
			for k: Variant in d:
				out[k] = floats(d[k])
			return out
		TYPE_ARRAY:
			var a: Array = v
			var out := []
			for item: Variant in a:
				out.append(floats(item))
			return out
	return v


## Every float with no fraction becomes an int, recursively; fractions stay floats.
static func ints(v: Variant) -> Variant:
	match typeof(v):
		TYPE_FLOAT:
			var f: float = v
			if is_finite(f) and f == floorf(f) and absf(f) < 9.0e18:
				return int(f)
			return f
		TYPE_DICTIONARY:
			var d: Dictionary = v
			var out := {}
			for k: Variant in d:
				out[k] = ints(d[k])
			return out
		TYPE_ARRAY:
			var a: Array = v
			var out := []
			for item: Variant in a:
				out.append(ints(item))
			return out
	return v


## "" when `a` and `b` are equal after `floats()`, else the first differing key path and both values,
## e.g. `player.x: 10.5 != 11.5`. A key or element only one side has shows as `<missing>` on the other.
static func first_diff(a: Variant, b: Variant, path := "") -> String:
	return _diff(floats(a), floats(b), path)


static func _diff(a: Variant, b: Variant, path: String) -> String:
	var ta := typeof(a)
	var tb := typeof(b)
	if ta == TYPE_DICTIONARY and tb == TYPE_DICTIONARY:
		var da: Dictionary = a
		var db: Dictionary = b
		for k: Variant in da:
			var p := _key(path, str(k))
			if not db.has(k):
				return "%s: %s != <missing>" % [p, _show(da[k])]
			var d := _diff(da[k], db[k], p)
			if d != "":
				return d
		for k: Variant in db:
			if not da.has(k):
				return "%s: <missing> != %s" % [_key(path, str(k)), _show(db[k])]
		return ""
	if ta == TYPE_ARRAY and tb == TYPE_ARRAY:
		var aa: Array = a
		var ab: Array = b
		for i: int in maxi(aa.size(), ab.size()):
			var p := "%s[%d]" % [path, i]
			if i >= aa.size():
				return "%s: <missing> != %s" % [p, _show(ab[i])]
			if i >= ab.size():
				return "%s: %s != <missing>" % [p, _show(aa[i])]
			var d := _diff(aa[i], ab[i], p)
			if d != "":
				return d
		return ""
	if _is_text(ta) and _is_text(tb):
		if str(a) == str(b):
			return ""
	elif ta == tb and a == b:
		return ""
	return "%s: %s != %s" % [path if path != "" else "(root)", _show(a), _show(b)]


## String and StringName hold the same text in JSON, so they compare as text.
static func _is_text(t: int) -> bool:
	return t == TYPE_STRING or t == TYPE_STRING_NAME


static func _key(path: String, key: String) -> String:
	return key if path == "" else "%s.%s" % [path, key]


static func _show(v: Variant) -> String:
	return JSON.stringify(v, "", true, true)
